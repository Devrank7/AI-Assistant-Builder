import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

  // MongoDB check
  try {
    const dbStart = Date.now();
    const mongoose = await connectDB();
    if (mongoose.connection.readyState === 1) {
      checks.mongodb = { status: 'ok', latency: Date.now() - dbStart };
    } else {
      checks.mongodb = { status: 'degraded', error: `readyState: ${mongoose.connection.readyState}` };
    }
  } catch (err) {
    checks.mongodb = { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' };
  }

  // Environment check
  const requiredEnv = ['MONGODB_URI', 'ADMIN_SECRET_TOKEN', 'GEMINI_API_KEY'];
  const missingEnv = requiredEnv.filter((key) => !process.env[key]);
  checks.environment =
    missingEnv.length === 0 ? { status: 'ok' } : { status: 'error', error: `Missing: ${missingEnv.join(', ')}` };

  const allOk = Object.values(checks).every((c) => c.status === 'ok');

  return NextResponse.json(
    {
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      latency: Date.now() - start,
      checks,
      version: process.env.npm_package_version || '1.0.0',
    },
    { status: allOk ? 200 : 503 }
  );
}
