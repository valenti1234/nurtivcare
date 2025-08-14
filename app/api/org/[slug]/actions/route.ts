import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SuggestedAction from '@/lib/models/SuggestedAction';
import Patient from '@/lib/models/Patient';
import AuditLog from '@/lib/models/AuditLog';
import { requireOrgContext, createOrgFilter } from '@/lib/auth/tenant-guard';

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;
    
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    let filter: any = { slug: slug };
    
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
    console.error('Error fetching actions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch actions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;
    const body = await request.json();
    const { patientId, text, noteId } = body;
    
    if (!patientId || !text) {
      return NextResponse.json(
        { error: 'Patient ID and text are required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Verify patient exists and belongs to the organization
    const patient = await Patient.findOne({
      _id: patientId,
      ...createOrgFilter(slug)
    });
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }
    
    const actionData: any = {
      slug: slug,
      patientId,
      text,
      status: 'pending'
    };
    
    if (noteId) {
      actionData.noteId = noteId;
    }
    
    const action = new SuggestedAction(actionData);
    
    await action.save();
    
    // Create audit log
    await AuditLog.create({
      slug,
      actorId: 'system', // TODO: Get from session
      action: 'CREATE',
      entity: 'action',
      entityId: action._id.toString(),
      meta: {
        patientId,
        text: text.substring(0, 100) + (text.length > 100 ? '...' : '')
      }
    });
    
    return NextResponse.json(action, { status: 201 });
    
  } catch (error: any) {
    console.error('Error creating action:', error);
    return NextResponse.json(
      { error: 'Failed to create action' },
      { status: 500 }
    );
  }
}