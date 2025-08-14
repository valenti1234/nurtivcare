import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SuggestedAction from '@/lib/models/SuggestedAction';
import { requireOrgContext, createOrgFilter } from '@/lib/auth/tenant-guard';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const { slug } = await requireOrgContext(request);
    const { id } = params;
    
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    
    let filter: any = {
      patientId: id,
      ...createOrgFilter(slug)
    };
    
    if (status && ['pending', 'done'].includes(status)) {
      filter.status = status;
    }
    
    const actions = await SuggestedAction.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    
    return NextResponse.json(actions);
    
  } catch (error: any) {
    console.error('Patient actions API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}