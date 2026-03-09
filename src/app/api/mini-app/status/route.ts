import { NextRequest } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import connectDB from '@/lib/mongodb';
import BotState from '@/models/BotState';

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  try {
    await connectDB();

    const state = await BotState.findOne().lean();

    if (!state) {
      return successResponse({
        orchestrator_running: false,
        session_id: null,
        active_stages: {},
        last_update: null,
      });
    }

    return successResponse({
      orchestrator_running: state.orchestratorRunning,
      session_id: state.sessionId || null,
      active_stages: state.activeStages || {},
      last_update: state.lastUpdate?.toISOString() || null,
    });
  } catch (error) {
    console.error('[mini-app/status] Error:', error);
    return Errors.internal('Failed to fetch status');
  }
}
