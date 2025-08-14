import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Note from '@/lib/models/Note';
import AuditLog from '@/lib/models/AuditLog';
import { requireOrgContext } from '@/lib/auth/tenant-guard';

export async function DELETE(
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
    
    // Find note and verify it belongs to org
    const note = await Note.findOne({
      _id: params.id,
      slug: slug
    });
    
    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }
    
    // Delete the note
    await Note.findByIdAndDelete(params.id);
    
    // Create audit log
    await AuditLog.create({
      slug,
      actorId: userId,
      action: 'DELETE',
      entity: 'note',
      entityId: params.id,
      meta: {
        deletedText: note.rawText.substring(0, 100) + (note.rawText.length > 100 ? '...' : ''),
        patientId: note.patientId,
        mood: note.mood
      }
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Delete note error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}