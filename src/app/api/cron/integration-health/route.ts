import { NextRequest } from 'next/server';
import { successResponse, Errors } from '@/lib/apiResponse';
import { checkAllConnections } from '@/lib/integrations/core/HealthMonitor';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Errors.unauthorized('Invalid cron secret');
  }

  const result = await checkAllConnections();
  return successResponse(result, 'Health check complete');
}
