import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Note from '@/lib/models/Note';
import { requireOrgContext } from '@/lib/auth/tenant-guard';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { slug } = await requireOrgContext(request);
    
    await connectDB();
    
    const notes = await Note.find({
      patientId: params.id,
      slug
    })
    .sort({ createdAt: -1 })
    .lean();
    
    return NextResponse.json(notes);
    
  } catch (error: any) {
    console.error('Patient notes API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}