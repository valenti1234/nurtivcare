import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SuggestedAction from '@/lib/models/SuggestedAction';
import Patient from '@/lib/models/Patient';
import AuditLog from '@/lib/models/AuditLog';
import { requireOrgContext, createOrgFilter } from '@/lib/auth/tenant-guard';

export async function GET(request: NextRequest) {
  try {
    const { slug } = await requireOrgContext(request);
    
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    let filter = createOrgFilter(slug);
    
    if (patientId) {
      filter.patientId = patientId;
    }
    
    if (status && ['pending', 'done'].includes(status)) {
      filter.status = status;
    }
    
    const [actions, total] = await Promise.all([
      SuggestedAction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SuggestedAction.countDocuments(filter)
    ]);
    
    return NextResponse.json({
      actions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error: any) {
    console.error('Actions API error:', error);
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
    const { patientId, noteId, text } = body;
    
    if (!patientId || !text) {
      return NextResponse.json(
        { error: 'Patient ID and text are required' },
        { status: 400 }
      );
    }
    
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
    
    // Create action
    const actionData: any = {
      slug: slug,
      patientId,
      text,
      status: 'pending'
    };
    
    if (noteId) {
      actionData.noteId = noteId;
    }
    
    const action = await SuggestedAction.create(actionData);
    
    // Audit log
    await AuditLog.create({
      slug,
      actorId: userId,
      action: 'CREATE',
      entity: 'action',
      entityId: action._id.toString(),
      meta: { patientId }
    });
    
    return NextResponse.json(action, { status: 201 });
    
  } catch (error: any) {
    console.error('Create action error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}