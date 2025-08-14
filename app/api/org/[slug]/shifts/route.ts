import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import connectDB from '@/lib/mongodb';
import Shift from '@/lib/models/Shift';
import Membership from '@/lib/models/Membership';
import User from '@/lib/models/User';

// GET /api/org/[slug]/shifts - Get shifts for the organization
export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    // Verify user has access to this organization
    const membership = await Membership.findOne({
      userId: session.user.id,
      slug: params.slug
    });
    
    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    // Build query
    const query: any = { orgId: params.slug };
    
    // If user is CARER or VIEWER, only show their own shifts
    if (membership.role === 'CARER' || membership.role === 'VIEWER') {
      query.userId = session.user.id;
    } else if (userId) {
      // ADMIN or OWNER can filter by specific user
      query.userId = userId;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.checkInTime = {};
      if (startDate) query.checkInTime.$gte = new Date(startDate);
      if (endDate) query.checkInTime.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    
    const [shifts, total] = await Promise.all([
      Shift.find(query)
        .populate('userId', 'name email')
        .sort({ checkInTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Shift.countDocuments(query)
    ]);

    return NextResponse.json({
      shifts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/org/[slug]/shifts - Create a new shift (check-in)
export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    // Verify user has access to this organization and is a CARER
    const membership = await Membership.findOne({
      userId: session.user.id,
      slug: params.slug
    });
    
    if (!membership || !['CARER', 'ADMIN', 'OWNER'].includes(membership.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if user already has an active shift
    const activeShift = await Shift.findOne({
      userId: session.user.id,
      orgId: params.slug,
      status: 'active'
    });
    
    if (activeShift) {
      return NextResponse.json({ error: 'You already have an active shift' }, { status: 400 });
    }

    const body = await request.json();
    const { location, notes, patientId } = body;

    const shift = new Shift({
      userId: session.user.id,
      orgId: params.slug,
      patientId: patientId || undefined,
      checkInTime: new Date(),
      location,
      notes,
      status: 'active'
    });

    await shift.save();
    await shift.populate('userId', 'name email');

    return NextResponse.json({ shift }, { status: 201 });
  } catch (error) {
    console.error('Error creating shift:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}