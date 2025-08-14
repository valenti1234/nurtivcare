import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Patient from '@/lib/models/Patient';
import AuditLog from '@/lib/models/AuditLog';
import { FilterQuery } from 'mongoose';
import { requireOrgContext, createOrgFilter } from '@/lib/auth/tenant-guard';

export async function GET(request: NextRequest) {
  try {
    console.log('Patients API - GET request received');
    const { slug } = await requireOrgContext(request);
    console.log('Patients API - Org slug:', slug);
    
    await connectDB();
    console.log('Patients API - Connected to DB');
    
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Location-based search parameters
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const maxDistance = parseInt(searchParams.get('maxDistance') || '5000'); // 5km default
    
    let filter = createOrgFilter(slug);
    
    if (search) {
      filter = {
        ...filter,
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    // Add location filter if coordinates provided
    if (lat && lng) {
      filter = {
        ...filter,
        'location.latitude': { $exists: true },
        'location.longitude': { $exists: true },
        $expr: {
          $lte: [
            {
              $multiply: [
                6371000, // Earth's radius in meters
                {
                  $acos: {
                    $add: [
                      {
                        $multiply: [
                          { $sin: { $multiply: [{ $degreesToRadians: '$location.latitude' }, 1] } },
                          { $sin: { $multiply: [{ $degreesToRadians: parseFloat(lat) }, 1] } }
                        ]
                      },
                      {
                        $multiply: [
                          { $cos: { $multiply: [{ $degreesToRadians: '$location.latitude' }, 1] } },
                          { $cos: { $multiply: [{ $degreesToRadians: parseFloat(lat) }, 1] } },
                          { $cos: { $multiply: [{ $degreesToRadians: { $subtract: ['$location.longitude', parseFloat(lng)] } }, 1] } }
                        ]
                      }
                    ]
                  }
                }
              ]
            },
            maxDistance
          ]
        }
      };
    }
    
    console.log('Patients API - Filter:', JSON.stringify(filter));
    
    const [patients, total] = await Promise.all([
      Patient.find(filter)
        .sort({ lastName: 1, firstName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Patient.countDocuments(filter)
    ]);

    console.log('Patients API - Found patients:', patients.length);
    console.log('Patients API - Total count:', total);
    console.log('Patients API - Sample patient:', patients[0] ? JSON.stringify(patients[0]) : 'None');

    return NextResponse.json({
      patients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error: any) {
    console.error('Patients API error:', error);
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
    const { firstName, lastName, dob, carePlan, keyInfo } = body;
    
    const patient = await Patient.create({
      slug,
      firstName,
      lastName,
      dob: new Date(dob),
      carePlan: carePlan || '',
      keyInfo: keyInfo || {}
    });
    
    // Audit log
    await AuditLog.create({
      slug,
      actorId: userId,
      action: 'CREATE',
      entity: 'patient',
      entityId: patient._id.toString(),
      meta: {}
    });
    
    return NextResponse.json(patient, { status: 201 });
    
  } catch (error: any) {
    console.error('Create patient error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}