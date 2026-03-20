// src/app/api/flows/templates/route.ts
import { successResponse } from '@/lib/apiResponse';
import { BUILT_IN_TEMPLATES } from '@/lib/flows/templates';

export async function GET() {
  return successResponse({ templates: BUILT_IN_TEMPLATES });
}
