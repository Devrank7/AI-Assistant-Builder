// src/app/api/inbox/suggest-reply/route.ts
import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { generateInboxSuggestedReply } from '@/lib/inbox/suggestReply';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    if (!body.conversationId) {
      return Errors.badRequest('conversationId is required');
    }

    const suggestion = await generateInboxSuggestedReply(body.conversationId);
    if (!suggestion) {
      return Errors.internal('Failed to generate suggestion');
    }

    return successResponse({ suggestion });
  } catch (error) {
    console.error('Suggest reply error:', error);
    return Errors.internal('Failed to generate suggestion');
  }
}
