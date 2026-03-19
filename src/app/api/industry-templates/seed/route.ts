/**
 * POST /api/industry-templates/seed - Seed industry templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrClient } from '@/lib/auth';
import { seedIndustryTemplates } from '@/lib/seedTemplates';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated || auth.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
    }

    const count = await seedIndustryTemplates();
    return NextResponse.json({ success: true, seeded: count });
  } catch (error) {
    console.error('Seed templates error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
