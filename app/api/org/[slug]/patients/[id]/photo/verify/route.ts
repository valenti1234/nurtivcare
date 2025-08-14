import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import connectDB from '@/lib/mongodb';
import Patient from '@/lib/models/Patient';
import { requireOrgContext } from '@/lib/auth/tenant-guard';

export async function POST(request: NextRequest, { params }: { params: { slug: string; id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const context = await requireOrgContext(request, params.slug);
    if (!context || !context.canWrite) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    // Find the patient
    const patient = await Patient.findOne({
      _id: params.id,
      slug: context.slug
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Update photo verification status
    if (patient.photo) {
      patient.photo.verified = true;
      patient.photo.verifiedAt = new Date();
      await patient.save();
    } else {
      return NextResponse.json({ error: 'No photo to verify' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Photo verified successfully'
    });

  } catch (error) {
    console.error('Error verifying photo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}