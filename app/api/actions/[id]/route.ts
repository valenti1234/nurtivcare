import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SuggestedAction from '@/lib/models/SuggestedAction';
import AuditLog from '@/lib/models/AuditLog';
import { requireOrgContext } from '@/lib/auth/tenant-guard';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { status, text } = body;
    
    // Find action and verify it belongs to org
    const action = await SuggestedAction.findOne({
      _id: params.id,
      slug: slug
    });
    
    if (!action) {
      return NextResponse.json(
        { error: 'Action not found' },
        { status: 404 }
      );
    }
    
    // Update fields
    const updateData: any = {};
    if (status && ['pending', 'done'].includes(status)) {
      updateData.status = status;
    }
    if (text !== undefined) {
      updateData.text = text;
    }
    
    const updatedAction = await SuggestedAction.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    );
    
    // Audit log
    await AuditLog.create({
      slug,
      actorId: userId,
      action: 'UPDATE',
      entity: 'action',
      entityId: params.id,
      meta: { 
        patientId: action.patientId,
        changes: updateData
      }
    });
    
    return NextResponse.json(updatedAction);
    
  } catch (error: any) {
    console.error('Update action error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { slug, canWrite, userId } = await requireOrgContext(request);
    
    if (!canWrite) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    await connectDB();
    
    // Find action and verify it belongs to org
    const action = await SuggestedAction.findOne({
      _id: params.id,
      slug: slug
    });
    
    if (!action) {
      return NextResponse.json(
        { error: 'Action not found' },
        { status: 404 }
      );
    }
    
    await SuggestedAction.findByIdAndDelete(params.id);
    
    // Audit log
    await AuditLog.create({
      slug,
      actorId: userId,
      action: 'DELETE',
      entity: 'action',
      entityId: params.id,
      meta: { patientId: action.patientId }
    });
    
    return NextResponse.json({ message: 'Action deleted successfully' });
    
  } catch (error: any) {
    console.error('Delete action error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}