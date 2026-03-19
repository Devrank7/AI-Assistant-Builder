import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Contact from '@/models/Contact';
import Client from '@/models/Client';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    // Get user's client IDs
    const ownerQuery = auth.organizationId ? { organizationId: auth.organizationId } : { userId: auth.userId };
    const userClients = await Client.find(ownerQuery).select('clientId');
    const allowedClientIds = userClients.map((c) => c.clientId);

    const matchClientId = clientId && allowedClientIds.includes(clientId) ? clientId : { $in: allowedClientIds };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, hot, warm, cold, newToday] = await Promise.all([
      Contact.countDocuments({ clientId: matchClientId }),
      Contact.countDocuments({ clientId: matchClientId, leadTemp: 'hot' }),
      Contact.countDocuments({ clientId: matchClientId, leadTemp: 'warm' }),
      Contact.countDocuments({ clientId: matchClientId, leadTemp: 'cold' }),
      Contact.countDocuments({ clientId: matchClientId, createdAt: { $gte: today } }),
    ]);

    return successResponse({ total, hot, warm, cold, newToday });
  } catch (error) {
    console.error('Get contact stats error:', error);
    return Errors.internal('Failed to fetch contact stats');
  }
}
