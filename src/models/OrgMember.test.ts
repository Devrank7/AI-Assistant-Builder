import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

describe('OrgMember model', () => {
  let OrgMember: typeof import('@/models/OrgMember').default;

  beforeEach(async () => {
    vi.resetModules();
    delete mongoose.models.OrgMember;
    if ((mongoose as any).modelSchemas) delete (mongoose as any).modelSchemas.OrgMember;
    OrgMember = (await import('@/models/OrgMember')).default;
  });

  it('creates with correct defaults', () => {
    const member = new OrgMember({
      organizationId: 'org123',
      userId: 'user456',
    });
    expect(member.organizationId).toBe('org123');
    expect(member.userId).toBe('user456');
    expect(member.role).toBe('viewer');
  });

  it('accepts all valid roles', () => {
    const roles = ['owner', 'admin', 'editor', 'viewer'] as const;
    for (const role of roles) {
      const member = new OrgMember({ organizationId: 'o1', userId: 'u1', role });
      expect(member.role).toBe(role);
    }
  });
});
