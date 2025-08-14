import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Note from '@/lib/models/Note';
import Patient from '@/lib/models/Patient';
import AuditLog from '@/lib/models/AuditLog';
import { requireOrgContext, createOrgFilter } from '@/lib/auth/tenant-guard';
import { generateSummary } from '@/lib/ai/openai';

export async function GET(request: NextRequest) {
  try {
    const { slug } = await requireOrgContext(request);
    
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get('patientId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    let filter = createOrgFilter(slug);
    
    if (patientId) {
      filter.patientId = patientId;
    }
    
    const [notes, total] = await Promise.all([
      Note.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Note.countDocuments(filter)
    ]);
    
    return NextResponse.json({
      notes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error: any) {
    console.error('Notes API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { slug, canWrite, userId } = await requireOrgContext(request);
    
    if (!canWrite) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    await connectDB();
    
    const body = await request.json();
    const { patientId, visitId, rawText, sttLang = 'en', mood = 'neutral' } = body;
    
    // Verify patient belongs to org
    const patient = await Patient.findOne({
      _id: patientId,
      slug
    });
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }
    
    // Create note
    const note = await Note.create({
      slug,
      patientId,
      visitId,
      authorId: userId,
      rawText,
      sttLang,
      aiSummary: {},
      mood
    });
    
    // Generate AI summary asynchronously
    try {
      const summary = await generateSummary(rawText, patient.carePlan);
      await Note.findByIdAndUpdate(note._id, {
        aiSummary: {
          observations: summary.observations,
          risks: summary.risks,
          actions: summary.actions
        }
      });
    } catch (aiError) {
      console.error('AI summary generation failed:', aiError);
    }
    
    // Audit log
    await AuditLog.create({
      slug,
      actorId: userId,
      action: 'CREATE',
      entity: 'note',
      entityId: note._id.toString(),
      meta: { patientId }
    });
    
    return NextResponse.json(note, { status: 201 });
    
  } catch (error: any) {
    console.error('Create note error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}