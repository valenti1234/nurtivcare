import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth-options';
import { FilterQuery } from 'mongoose';
import mongoose from 'mongoose';
import connectDB from '../mongodb';
import Membership from '../models/Membership';
import AuditLog from '../models/AuditLog';
import Organisation from '../models/Organisation';
import { findOrgBySlug } from './org-lookup';

export interface TenantContext {
  userId: string;
  slug: string;
  role: string;
  canRead: boolean;
  canWrite: boolean;
  canAdmin: boolean;
}

export async function requireOrgContext(
  request: NextRequest,
  slug?: string
): Promise<TenantContext> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  await connectDB();
  
  // Extract slug from query params if not provided
  let targetSlug = slug || request.nextUrl.searchParams.get('slug');
  
  // If no slug, try to extract from URL path (e.g., /org/[slug]/...)
  if (!targetSlug) {
    const pathSegments = request.nextUrl.pathname.split('/');
    const orgIndex = pathSegments.indexOf('org');
    if (orgIndex !== -1 && pathSegments[orgIndex + 1]) {
      targetSlug = pathSegments[orgIndex + 1];
    }
  }
  
  if (!targetSlug) {
    throw new Error('Organization slug required');
  }

  // Query membership with the user ID and organization slug
  console.log('Debug - Looking for membership with userId:', session.user.id, 'slug:', targetSlug);
  
  const membership = await Membership.findOne({
    userId: new mongoose.Types.ObjectId(session.user.id),
    slug: targetSlug
  });
  
  console.log('Debug - Membership found:', membership);
  
  // If no membership found, let's check what memberships exist for this user
  if (!membership) {
    const userMemberships = await Membership.find({ userId: new mongoose.Types.ObjectId(session.user.id) });
    console.log('Debug - All memberships for user:', userMemberships);
    
    // Also check what organization we're looking for
    const org = await Organisation.findOne({ slug: targetSlug });
    console.log('Debug - Target organization:', org);
  }

  if (!membership) {
    throw new Error('Access denied to organization');
  }

  const canAdmin = ['OWNER', 'ADMIN'].includes(membership.role);
  const canWrite = ['OWNER', 'ADMIN', 'CARER'].includes(membership.role);
  const canRead = true; // All members can read

  return {
    userId: session.user.id,
    slug: targetSlug,
    role: membership.role,
    canRead,
    canWrite,
    canAdmin
  };
}

export function createOrgFilter(slug: string): FilterQuery<any> {
  return { slug };
}

export async function auditLog(
  slug: string,
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  meta: Record<string, any> = {}
) {
  await AuditLog.create({
    slug,
    actorId,
    action,
    entity,
    entityId,
    meta
  });
}