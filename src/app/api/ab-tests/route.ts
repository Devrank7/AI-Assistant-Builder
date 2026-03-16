// src/app/api/ab-tests/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import ABTest from '@/models/ABTest';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();

    const query = auth.organizationId ? { organizationId: auth.organizationId } : { organizationId: auth.userId };
    const tests = await ABTest.find(query).sort({ createdAt: -1 });

    return successResponse(tests);
  } catch (error) {
    console.error('Get AB tests error:', error);
    return Errors.internal('Failed to fetch A/B tests');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const { name, clientId, variants } = body;

    if (!name || !clientId || !variants || variants.length < 2) {
      return Errors.badRequest('name, clientId, and at least 2 variants are required');
    }

    await connectDB();

    const test = await ABTest.create({
      clientId,
      organizationId: auth.organizationId || auth.userId,
      name,
      status: 'draft',
      variants: variants.map((v: { label: string; config: Record<string, unknown> }) => ({
        id: randomUUID().slice(0, 8),
        label: v.label,
        config: v.config || {},
        visitors: 0,
        conversions: 0,
      })),
    });

    return successResponse(test, undefined, 201);
  } catch (error) {
    console.error('Create AB test error:', error);
    return Errors.internal('Failed to create A/B test');
  }
}
