// src/app/api/inbox/conversations/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
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
    const status = searchParams.get('status');
    const channel = searchParams.get('channel');
    const assignedTo = searchParams.get('assignedTo');
    const clientId = searchParams.get('clientId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    // Get user's client IDs
    const ownerQuery = auth.organizationId ? { organizationId: auth.organizationId } : { userId: auth.userId };
    const userClients = await Client.find(ownerQuery).select('clientId');
    const allowedClientIds = userClients.map((c) => c.clientId);

    if (allowedClientIds.length === 0) {
      return successResponse({ conversations: [], total: 0, page, pages: 0 });
    }

    const query: Record<string, unknown> = {
      clientId: clientId && allowedClientIds.includes(clientId) ? clientId : { $in: allowedClientIds },
    };

    if (status) query.status = status;
    if (channel) query.channel = channel;
    if (assignedTo === 'me') query.assignedTo = auth.userId;
    else if (assignedTo === 'unassigned') query.assignedTo = null;

    // Search by last message text or contactId
    if (search) {
      query['lastMessage.text'] = { $regex: search, $options: 'i' };
    }

    const total = await Conversation.countDocuments(query);
    const conversations = await Conversation.find(query)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Enrich with contact info
    const contactIds = [...new Set(conversations.map((c) => c.contactId))];
    const contacts = await Contact.find({ contactId: { $in: contactIds } })
      .select('contactId name email leadScore leadTemp channel tags')
      .lean();
    const contactMap = Object.fromEntries(contacts.map((c) => [c.contactId, c]));

    const enriched = conversations.map((conv) => ({
      ...conv,
      contact: contactMap[conv.contactId] || null,
    }));

    return successResponse({ conversations: enriched, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get inbox conversations error:', error);
    return Errors.internal('Failed to fetch conversations');
  }
}
