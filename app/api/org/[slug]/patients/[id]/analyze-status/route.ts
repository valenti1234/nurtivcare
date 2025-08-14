import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { analyzePatientStatus } from '@/lib/ai/openai';
import Patient from '@/lib/models/Patient';
import Note from '@/lib/models/Note';
import SuggestedAction from '@/lib/models/SuggestedAction';
import { requireOrgContext } from '@/lib/auth/tenant-guard';

export async function POST(request: NextRequest, { params }: { params: { slug: string; id: string } }) {
  try {
    const { slug, canWrite, userId } = await requireOrgContext(request, params.slug);
    
    if (!canWrite) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing patient ID' }, { status: 400 });
    }

    await connectDB();
    
    // Fetch patient data
    const patient = await Patient.findOne({ 
      _id: id,
      slug 
    });
    
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Fetch recent notes (last 10)
    const recentNotes = await Note.find({ patientId: id, slug })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Fetch current actions
    const currentActions = await SuggestedAction.find({ patientId: id, slug })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Prepare data for AI analysis
    const patientData = {
      firstName: patient.firstName,
      lastName: patient.lastName,
      dob: patient.dob,
      conditions: patient.conditions || patient.keyInfo?.conditions || [],
      allergies: patient.allergies || patient.keyInfo?.allergies,
      carePlan: patient.carePlan,
      recentNotes: recentNotes.map((note: any) => note.rawText || note.content || note.text || ''),
      currentActions: currentActions.map((action: any) => ({
        text: action.text || action.description || '',
        status: action.status || 'pending'
      })),
      keyInfo: {
        emergencyContact: patient.emergencyContact || patient.keyInfo?.emergencyContact,
        gp: patient.gp || patient.keyInfo?.gp
      }
    };

    console.log('Analyzing patient status for:', patient.firstName, patient.lastName);
    
    // Analyze patient status using AI
    const analysis = await analyzePatientStatus(patientData);
    
    console.log('AI Analysis result:', analysis);

    // Update patient record with new status and risk level
    await Patient.findByIdAndUpdate(id, {
      status: analysis.status,
      riskLevel: analysis.riskLevel,
      lastAnalyzed: new Date(),
      analysisReasoning: analysis.reasoning,
      analysisRecommendations: analysis.recommendations,
      // Also store key info as direct fields for better consistency
      conditions: patient.conditions || patient.keyInfo?.conditions,
      allergies: patient.allergies || patient.keyInfo?.allergies,
      emergencyContact: patient.emergencyContact || patient.keyInfo?.emergencyContact,
      gp: patient.gp || patient.keyInfo?.gp
    });

    return NextResponse.json({
      success: true,
      analysis: {
        status: analysis.status,
        riskLevel: analysis.riskLevel,
        reasoning: analysis.reasoning,
        recommendations: analysis.recommendations
      }
    });
    
  } catch (error) {
    console.error('Patient status analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze patient status' },
      { status: 500 }
    );
  }
}