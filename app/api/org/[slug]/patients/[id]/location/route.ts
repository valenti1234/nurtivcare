import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { requireOrgContext } from '@/lib/auth/tenant-guard';
import connectDB from '@/lib/mongodb';
import Patient from '@/lib/models/Patient';
import mongoose from 'mongoose';

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const context = await requireOrgContext(request, params.slug);
    if (!context || !['OWNER', 'ADMIN', 'CARER'].includes(context.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { latitude, longitude, address, radius } = requestBody;

    // Validate required fields
    if (latitude === undefined || longitude === undefined || !address) {
      return NextResponse.json(
        { error: 'Latitude, longitude, and address are required' },
        { status: 400 }
      );
    }

    // Convert to numbers and validate coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // Update patient location
    const patient = await Patient.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(params.id),
        slug: params.slug
      },
      {
        $set: {
          location: {
            latitude: lat,
            longitude: lng,
            address: address.trim(),
            radius: radius ? parseInt(radius) : 100
          },
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      location: patient.location
    });

  } catch (error) {
    console.error('Error updating patient location:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const context = await requireOrgContext(request, params.slug);
    if (!context.canRead) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const patient = await Patient.findOne({
      _id: new mongoose.Types.ObjectId(params.id),
      slug: params.slug
    }).select('location');

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    return NextResponse.json({
      location: patient.location || null
    });

  } catch (error) {
    console.error('Error fetching patient location:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}