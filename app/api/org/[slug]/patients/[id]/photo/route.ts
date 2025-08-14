import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { requireOrgContext } from '@/lib/auth/tenant-guard';
import connectDB from '@/lib/mongodb';
import Patient from '@/lib/models/Patient';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest, { params }: { params: { slug: string; id: string } }) {
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

    // Get the patient
    const patient = await Patient.findOne({ 
      _id: params.id, 
      slug: params.slug 
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const photo = formData.get('photo') as File;

    if (!photo) {
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
    }

    // Validate file type
    if (!photo.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (photo.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'patients', params.slug);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = photo.name.split('.').pop() || 'jpg';
    const filename = `${params.id}-${timestamp}.${extension}`;
    const filepath = join(uploadDir, filename);

    // Save file
    const bytes = await photo.arrayBuffer();
    const buffer = new Uint8Array(bytes);
    await writeFile(filepath, buffer);

    // Update patient with photo info
    const photoUrl = `/uploads/patients/${params.slug}/${filename}`;
    await Patient.findByIdAndUpdate(params.id, {
      photo: {
        url: photoUrl,
        filename: filename,
        uploadedAt: new Date(),
        verified: false
      }
    });

    return NextResponse.json({
      message: 'Photo uploaded successfully',
      photo: {
        url: photoUrl,
        filename: filename,
        uploadedAt: new Date(),
        verified: false
      }
    });

  } catch (error) {
    console.error('Error uploading patient photo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { slug: string; id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const context = await requireOrgContext(request, params.slug);
    if (!context || !['OWNER', 'ADMIN'].includes(context.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    // Remove photo from patient
    await Patient.findByIdAndUpdate(params.id, {
      $unset: { photo: 1 }
    });

    return NextResponse.json({ message: 'Photo removed successfully' });

  } catch (error) {
    console.error('Error removing patient photo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}