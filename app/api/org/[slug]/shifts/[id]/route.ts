import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import connectDB from '@/lib/mongodb';
import Shift from '@/lib/models/Shift';
import Membership from '@/lib/models/Membership';
import mongoose from 'mongoose';

// GET /api/org/[slug]/shifts/[id] - Get specific shift
export async function GET(request: NextRequest, { params }: { params: { slug: string; id: string } }) {
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

    const shift = await Shift.findById(params.id).populate('userId', 'name email');
    
    if (!shift || shift.orgId !== params.slug) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Users can only view their own shifts unless they're ADMIN or OWNER
    if (membership.role === 'CARER' || membership.role === 'VIEWER') {
      if (shift.userId._id.toString() !== session.user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    return NextResponse.json({ shift });
  } catch (error) {
    console.error('Error fetching shift:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/org/[slug]/shifts/[id] - Update shift (check-out)
export async function PATCH(request: NextRequest, { params }: { params: { slug: string; id: string } }) {
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
    
    if (!membership || !['CARER', 'ADMIN', 'OWNER'].includes(membership.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const shift = await Shift.findById(params.id);
    
    if (!shift || shift.orgId !== params.slug) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Users can only update their own shifts unless they're ADMIN or OWNER
    if (membership.role === 'CARER') {
      if (shift.userId.toString() !== session.user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { checkOutTime, location, notes, action } = body;

    if (action === 'checkout') {
      if (shift.status === 'completed') {
        return NextResponse.json({ error: 'Shift already completed' }, { status: 400 });
      }
      
      shift.checkOutTime = checkOutTime ? new Date(checkOutTime) : new Date();
      shift.status = 'completed';
      
      // Calculate duration
      const durationMs = shift.checkOutTime.getTime() - shift.checkInTime.getTime();
      shift.duration = Math.round(durationMs / (1000 * 60)); // in minutes
    }

    // Update other fields if provided
    if (location !== undefined) shift.location = location;
    if (notes !== undefined) shift.notes = notes;

    await shift.save();
    await shift.populate('userId', 'name email');

    return NextResponse.json({ shift });
  } catch (error) {
    console.error('Error updating shift:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/org/[slug]/shifts/[id] - Delete shift (ADMIN/OWNER only)
export async function DELETE(request: NextRequest, { params }: { params: { slug: string; id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    // Verify user has access to this organization and is ADMIN or OWNER
    const membership = await Membership.findOne({
      userId: session.user.id,
      slug: params.slug
    });
    
    if (!membership || !['ADMIN', 'OWNER'].includes(membership.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const shift = await Shift.findById(params.id);
    
    if (!shift || shift.orgId !== params.slug) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    await Shift.findByIdAndDelete(params.id);

    return NextResponse.json({ message: 'Shift deleted successfully' });
  } catch (error) {
    console.error('Error deleting shift:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}