import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import BuilderSession from '@/models/BuilderSession';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // If specific session requested, return full session with messages
    if (id) {
      const session = await BuilderSession.findOne({ _id: id, userId: auth.userId });
      if (!session) {
        return Errors.notFound('Session not found');
      }
      return successResponse(session);
    }

    // Otherwise return summary list
    const sessions = await BuilderSession.find({ userId: auth.userId })
      .select('widgetName status updatedAt clientId')
      .sort({ updatedAt: -1 })
      .limit(50);

    const summaries = sessions.map((s) => ({
      _id: s._id,
      widgetName: s.widgetName,
      status: s.status,
      clientId: s.clientId,
      updatedAt: s.updatedAt,
    }));

    return successResponse(summaries);
  } catch (error) {
    console.error('Builder sessions error:', error);
    return Errors.internal('Failed to fetch sessions');
  }
}
