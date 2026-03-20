// src/app/api/org/members/route.ts
import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import connectDB from '@/lib/mongodb';
import OrgMember from '@/models/OrgMember';
import OrgInvite from '@/models/OrgInvite';
import Organization, { PLAN_LIMITS, type OrgPlan } from '@/models/Organization';
import User from '@/models/User';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { checkPermission } from '@/lib/orgAuth';
import type { OrgRole } from '@/models/OrgMember';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.notFound('No organization found');

  await connectDB();

  const members = await OrgMember.find({ organizationId: auth.organizationId });

  // Enrich with user info
  const userIds = members.map((m) => m.userId);
  const users = await User.find({ _id: { $in: userIds } }).select('email name');
  const userMap = new Map(users.map((u) => [u._id.toString(), { email: u.email, name: u.name }]));

  const enriched = members.map((m) => ({
    userId: m.userId,
    role: m.role,
    ...userMap.get(m.userId),
    joinedAt: m.createdAt,
  }));

  return successResponse(enriched);
}

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId || !auth.orgRole) return Errors.notFound('No organization found');
  if (!checkPermission(auth.orgRole as OrgRole, 'invite_members')) {
    return Errors.forbidden('You do not have permission to invite members');
  }

  const body = await request.json();
  const { email, role } = body as { email?: string; role?: OrgRole };

  if (!email) return Errors.badRequest('email is required');
  if (role && !['admin', 'editor', 'viewer'].includes(role)) {
    return Errors.badRequest('Invalid role. Allowed: admin, editor, viewer');
  }

  await connectDB();

  // Check team size limit
  const org = await Organization.findById(auth.organizationId);
  if (!org) return Errors.notFound('Organization not found');

  const currentCount = await OrgMember.countDocuments({ organizationId: auth.organizationId });
  const limits = PLAN_LIMITS[org.plan as OrgPlan];
  if (currentCount >= limits.maxTeamMembers) {
    return Errors.forbidden(`Team member limit reached (${limits.maxTeamMembers}). Upgrade your plan.`);
  }

  // Create invite
  const token = randomBytes(32).toString('hex');
  const invite = await OrgInvite.findOneAndUpdate(
    { organizationId: auth.organizationId, email: email.toLowerCase() },
    {
      role: role || 'viewer',
      token,
      invitedBy: auth.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    { upsert: true, new: true }
  );

  const existingUser = await User.findOne({ email: email.toLowerCase() }).select('_id');
  if (existingUser) {
    const { notifyTeamInvite } = await import('@/lib/notificationTriggers');
    await notifyTeamInvite(existingUser._id.toString(), org.name, role).catch(() => {});
  }

  return successResponse({ inviteId: invite._id, token: invite.token, expiresAt: invite.expiresAt });
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId || !auth.orgRole) return Errors.notFound('No organization found');
  if (!checkPermission(auth.orgRole as OrgRole, 'invite_members')) {
    return Errors.forbidden('You do not have permission to remove members');
  }

  const body = await request.json();
  const { userId } = body as { userId?: string };
  if (!userId) return Errors.badRequest('userId is required');

  // Cannot remove the owner
  const targetMember = await OrgMember.findOne({ organizationId: auth.organizationId, userId });
  if (!targetMember) return Errors.notFound('Member not found');
  if (targetMember.role === 'owner') return Errors.forbidden('Cannot remove the organization owner');

  await connectDB();
  await OrgMember.deleteOne({ organizationId: auth.organizationId, userId });

  // Remove organizationId from user
  await User.findByIdAndUpdate(userId, { $set: { organizationId: null } });

  return successResponse(undefined, 'Member removed');
}
