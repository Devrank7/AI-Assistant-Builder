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
    // Run trial checks and cost resets in parallel (allSettled so one failure doesn't block the other)
    const [trialSettled, costSettled] = await Promise.allSettled([checkTrialReminders(), resetMonthlyCosts()]);

    const trialResult =
      trialSettled.status === 'fulfilled' ? trialSettled.value : { error: String(trialSettled.reason) };
    const costResetCount = costSettled.status === 'fulfilled' ? costSettled.value : 0;

    if (trialSettled.status === 'rejected') console.error('Trial check failed:', trialSettled.reason);
    if (costSettled.status === 'rejected') console.error('Cost reset failed:', costSettled.reason);

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
