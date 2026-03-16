import connectDB from './mongodb';
import OrgMember from '@/models/OrgMember';
import Organization, { type IOrganization } from '@/models/Organization';
import type { OrgRole } from '@/models/OrgMember';

export type Permission =
  | 'manage_billing'
  | 'invite_members'
  | 'create_widgets'
  | 'edit_widgets'
  | 'edit_knowledge'
  | 'manage_integrations'
  | 'view_analytics'
  | 'view_chats'
  | 'manage_ab_tests'
  | 'publish_marketplace'
  | 'manage_api_keys'
  | 'manage_whitelabel';

export const PERMISSIONS: Record<Permission, OrgRole[]> = {
  manage_billing: ['owner'],
  invite_members: ['owner', 'admin'],
  create_widgets: ['owner', 'admin', 'editor'],
  edit_widgets: ['owner', 'admin', 'editor'],
  edit_knowledge: ['owner', 'admin', 'editor'],
  manage_integrations: ['owner', 'admin', 'editor'],
  view_analytics: ['owner', 'admin', 'editor', 'viewer'],
  view_chats: ['owner', 'admin', 'editor', 'viewer'],
  manage_ab_tests: ['owner', 'admin', 'editor'],
  publish_marketplace: ['owner', 'admin', 'editor'],
  manage_api_keys: ['owner', 'admin'],
  manage_whitelabel: ['owner', 'admin'],
};

export function checkPermission(role: OrgRole, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(role);
}

export async function getOrgForUser(userId: string): Promise<{ organization: IOrganization; role: OrgRole } | null> {
  await connectDB();
  const membership = await OrgMember.findOne({ userId });
  if (!membership) return null;

  const organization = await Organization.findById(membership.organizationId);
  if (!organization) return null;

  return { organization, role: membership.role as OrgRole };
}
