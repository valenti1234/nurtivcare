import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SuggestedAction from '@/lib/models/SuggestedAction';
import AuditLog from '@/lib/models/AuditLog';
import { createOrgFilter } from '@/lib/auth/tenant-guard';

export async function PATCH(request: NextRequest, { params }: { params: { slug: string; id: string } }) {
  try {
    const { slug, id } = params;
    const body = await request.json();
    const { status } = body;
    
    if (!status || !['pending', 'done'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    const action = await SuggestedAction.findOneAndUpdate(
      {
        _id: id,
        ...createOrgFilter(slug)
      },
      { status },
      { new: true }
    );
    
    if (!action) {
      return NextResponse.json(
        { error: 'Action not found' },
        { status: 404 }
      );
    }
    
    // Create audit log
    await AuditLog.create({
      slug,
      actorId: 'system', // TODO: Get from session
      action: 'UPDATE',
      entity: 'action',
      entityId: action._id.toString(),
      meta: {
        statusChanged: status,
        patientId: action.patientId
      }
    });
    
    return NextResponse.json(action);
    
  } catch (error: any) {
    console.error('Error updating action:', error);
    return NextResponse.json(
      { error: 'Failed to update action' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { slug: string; id: string } }) {
  try {
    const { slug, id } = params;
    
    await connectDB();
    
    const action = await SuggestedAction.findOneAndDelete({
      _id: id,
      ...createOrgFilter(slug)
    });
    
    if (!action) {
      return NextResponse.json(
        { error: 'Action not found' },
        { status: 404 }
      );
    }
    
    // Create audit log
    await AuditLog.create({
      slug,
      actorId: 'system', // TODO: Get from session
      action: 'DELETE',
      entity: 'action',
      entityId: action._id.toString(),
      meta: {
        deletedText: action.text.substring(0, 100) + (action.text.length > 100 ? '...' : ''),
        patientId: action.patientId
      }
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Error deleting action:', error);
    return NextResponse.json(
      { error: 'Failed to delete action' },
      { status: 500 }
    );
  }
}