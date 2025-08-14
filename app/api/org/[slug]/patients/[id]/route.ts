import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Patient from '@/lib/models/Patient';
import { requireOrgContext } from '@/lib/auth/tenant-guard';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const { slug: orgSlug } = await requireOrgContext(request);
    
    // Validate patient ID parameter
    if (!params.id || params.id === 'undefined' || params.id.length !== 24) {
      return NextResponse.json(
        { error: 'Invalid patient ID' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    const patient = await Patient.findOne({
      _id: params.id,
      slug: orgSlug
    }).lean();
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(patient);
    
  } catch (error: any) {
    console.error('Patient API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}