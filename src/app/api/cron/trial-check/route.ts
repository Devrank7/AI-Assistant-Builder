import { NextRequest, NextResponse } from 'next/server';
import { checkTrialReminders } from '@/lib/trialReminders';
import { resetMonthlyCosts } from '@/lib/costGuard';

/**
 * Cron endpoint for trial checks and cost resets.
 * Can be called by:
 * - Vercel Cron Jobs
 * - External cron service (e.g. cron-job.org)
 * - Manual admin trigger
 *
 * Protected by ADMIN_SECRET_TOKEN via Authorization header.
 */
export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.ADMIN_SECRET_TOKEN;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Run trial checks and cost resets in parallel
    const [trialResult, costResetCount] = await Promise.all([checkTrialReminders(), resetMonthlyCosts()]);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      trialCheck: trialResult,
      costReset: {
        clientsReset: costResetCount,
      },
    });
  } catch (error) {
    console.error('Cron trial-check error:', error);
    return NextResponse.json({ success: false, error: 'Cron job failed' }, { status: 500 });
  }
}
