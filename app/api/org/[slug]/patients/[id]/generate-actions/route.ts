import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Patient from '@/lib/models/Patient';
import Note from '@/lib/models/Note';
import SuggestedAction from '@/lib/models/SuggestedAction';
import AuditLog from '@/lib/models/AuditLog';
import { requireOrgContext } from '@/lib/auth/tenant-guard';
import { generateCareActions } from '@/lib/ai/openai';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const { slug, canWrite, userId } = await requireOrgContext(request, params.slug);
    
    if (!canWrite) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    await connectDB();
    
    // Get patient data
    const patient = await Patient.findOne({
      _id: params.id,
      slug
    });
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }
    
    // Get recent notes (last 5)
    const recentNotes = await Note.find({
      patientId: params.id,
      slug
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('rawText aiSummary');
    
    // Get current active actions
    const currentActions = await SuggestedAction.find({
      patientId: params.id,
      slug,
      status: 'pending'
    }).select('text');
    
    // Prepare data for AI generation
    const patientData = {
      firstName: patient.firstName,
      lastName: patient.lastName,
      dob: patient.dob,
      carePlan: patient.carePlan,
      conditions: patient.keyInfo?.conditions || [],
      allergies: patient.keyInfo?.allergies,
      recentNotes: recentNotes.map(note => 
        note.rawText || 
        `Observations: ${note.aiSummary?.observations || 'N/A'}, Risks: ${note.aiSummary?.risks || 'N/A'}`
      ),
      currentActions: currentActions.map(action => action.text)
    };
    
    // Generate AI-powered care actions
    const suggestedActions = await generateCareActions(patientData);
    
    if (suggestedActions.length === 0) {
      return NextResponse.json(
        { error: 'No care actions could be generated' },
        { status: 400 }
      );
    }
    
    // Create the suggested actions in the database
    const createdActions = [];
    for (const actionText of suggestedActions) {
      const action = await SuggestedAction.create({
        slug,
        patientId: params.id,
        text: actionText,
        status: 'pending'
      });
      createdActions.push(action);
    }
    
    // Create audit log
    await AuditLog.create({
      slug,
      actorId: userId,
      action: 'CREATE',
      entity: 'ai_care_actions',
      entityId: params.id,
      meta: { 
        patientId: params.id,
        actionsCount: createdActions.length,
        actionTexts: suggestedActions
      }
    });
    
    return NextResponse.json({
      success: true,
      actionsGenerated: createdActions.length,
      actions: createdActions
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Generate care actions error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}