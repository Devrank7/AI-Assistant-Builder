import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { INDUSTRY_TEMPLATES } from '@/lib/builder/templates';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    // Return templates without sampleKnowledge (too verbose for listing)
    const templates = INDUSTRY_TEMPLATES.map(({ sampleKnowledge, systemPromptHints, ...rest }) => rest);
    return successResponse(templates);
  } catch (error) {
    console.error('Templates error:', error);
    return Errors.internal('Failed to fetch templates');
  }
}
