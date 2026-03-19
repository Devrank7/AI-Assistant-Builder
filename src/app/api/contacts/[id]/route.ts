import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Contact from '@/models/Contact';
import Client from '@/models/Client';
import Conversation from '@/models/Conversation';
import Event from '@/models/Event';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;

    const contact = await Contact.findOne({ contactId: id });
    if (!contact) return Errors.notFound('Contact not found');

    // Verify ownership
    const ownerQuery = auth.organizationId
      ? { clientId: contact.clientId, organizationId: auth.organizationId }
      : { clientId: contact.clientId, userId: auth.userId };
    const client = await Client.findOne(ownerQuery);
    if (!client) return Errors.notFound('Contact not found');

    // Get activity timeline from events
    const timeline = await Event.find({
      clientId: contact.clientId,
      'payload.contactId': contact.contactId,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    // Get conversations
    const conversations = await Conversation.find({ contactId: contact.contactId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('conversationId channel status lastMessage createdAt');

    return successResponse({ contact, timeline, conversations });
  } catch (error) {
    console.error('Get contact detail error:', error);
    return Errors.internal('Failed to fetch contact');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const contact = await Contact.findOne({ contactId: id });
    if (!contact) return Errors.notFound('Contact not found');

    // Verify ownership
    const ownerQuery = auth.organizationId
      ? { clientId: contact.clientId, organizationId: auth.organizationId }
      : { clientId: contact.clientId, userId: auth.userId };
    const client = await Client.findOne(ownerQuery);
    if (!client) return Errors.notFound('Contact not found');

    // Only allow updating specific fields
    const allowedFields = ['tags', 'customFields', 'name', 'email', 'phone'];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (contact as unknown as Record<string, unknown>)[field] = body[field];
      }
    }

    await contact.save();
    return successResponse(contact, 'Contact updated');
  } catch (error) {
    console.error('Update contact error:', error);
    return Errors.internal('Failed to update contact');
  }
}
