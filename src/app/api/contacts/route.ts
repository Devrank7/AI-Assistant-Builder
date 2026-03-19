import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Contact from '@/models/Contact';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import Client from '@/models/Client';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const minScore = searchParams.get('minScore');
    const maxScore = searchParams.get('maxScore');
    const tags = searchParams.get('tags');
    const channel = searchParams.get('channel');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    // Get user's client IDs for ownership check
    const ownerQuery = auth.organizationId ? { organizationId: auth.organizationId } : { userId: auth.userId };
    const userClients = await Client.find(ownerQuery).select('clientId');
    const allowedClientIds = userClients.map((c) => c.clientId);

    if (allowedClientIds.length === 0) {
      return successResponse({ contacts: [], total: 0, page, pages: 0 });
    }

    // Build query
    const query: Record<string, unknown> = {
      clientId: clientId && allowedClientIds.includes(clientId) ? clientId : { $in: allowedClientIds },
    };

    if (minScore) query.leadScore = { ...((query.leadScore as object) || {}), $gte: parseInt(minScore, 10) };
    if (maxScore) query.leadScore = { ...((query.leadScore as object) || {}), $lte: parseInt(maxScore, 10) };
    if (tags) query.tags = { $all: tags.split(',') };
    if (channel) query.channel = channel;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { contactId: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Contact.countDocuments(query);
    const contacts = await Contact.find(query)
      .sort({ leadScore: -1, lastSeenAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return successResponse({
      contacts,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    return Errors.internal('Failed to fetch contacts');
  }
}
