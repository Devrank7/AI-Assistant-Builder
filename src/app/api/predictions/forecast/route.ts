import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getPeakHoursForecast, getWeeklyForecast } from '@/lib/predictiveEngagement';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const clientId = request.nextUrl.searchParams.get('clientId');
    if (!clientId) {
      return successResponse({
        weekly: { days: [], totalPredicted: 0, trend: 'stable', trendPercent: 0 },
        peakHours: {
          hourlyDistribution: [],
          peakHour: 0,
          peakDay: 'Mon',
          weekdayDistribution: [],
        },
      });
    }

    const [weekly, peakHours] = await Promise.all([getWeeklyForecast(clientId), getPeakHoursForecast(clientId)]);

    return successResponse({ weekly, peakHours });
  } catch (error) {
    console.error('Get forecast error:', error);
    return Errors.internal('Failed to fetch forecast data');
  }
}
