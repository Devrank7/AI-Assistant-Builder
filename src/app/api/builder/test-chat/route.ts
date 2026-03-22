import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const { clientId, message, conversationId } = body;

    if (!clientId || !message) {
      return Errors.badRequest('clientId and message are required');
    }

    await connectDB();

    // Proxy to the main chat stream API, marking it as a test message
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const res = await fetch(`${baseUrl}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        message,
        conversationId: conversationId || `test-${Date.now()}`,
        isTest: true,
      }),
    });

    if (!res.ok) {
      return Errors.internal('Failed to get AI response');
    }

    // Read the streamed response and return as JSON
    const text = await res.text();
    return successResponse({ response: text, conversationId: conversationId || `test-${Date.now()}` });
  } catch (error) {
    console.error('Test chat error:', error);
    return Errors.internal('Failed to process test message');
  }
}
