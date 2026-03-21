import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { listTemplates, submitTemplate, seedDefaultTemplates } from '@/lib/marketplaceService';
import type { TemplateCategory } from '@/models/PremiumMarketplaceTemplate';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || undefined;
  const category = url.searchParams.get('category') as TemplateCategory | null;
  const pricing = url.searchParams.get('pricing') as 'free' | 'paid' | 'subscription' | 'all' | null;
  const sort = url.searchParams.get('sort') as 'popular' | 'newest' | 'rating' | 'price_asc' | 'price_desc' | null;
  const page = url.searchParams.get('page') ? Number(url.searchParams.get('page')) : 1;
  const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 20;

  // Seed if needed and fetch
  await seedDefaultTemplates();

  const result = await listTemplates({
    search,
    category: category || undefined,
    pricing: pricing === 'all' ? undefined : pricing || undefined,
    sort: sort || undefined,
    page,
    limit,
  });

  return successResponse(result);
}

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();

    if (!body.name || !body.description || !body.category) {
      return Errors.badRequest('Missing required fields: name, description, category');
    }

    const validCategories: TemplateCategory[] = [
      'widget_theme',
      'flow_template',
      'knowledge_pack',
      'integration_bundle',
      'prompt_pack',
    ];
    if (!validCategories.includes(body.category)) {
      return Errors.badRequest('Invalid category');
    }

    const template = await submitTemplate(auth.userId, {
      ...body,
      authorName: auth.user.email,
    });

    return successResponse(template, 'Template submitted for review');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit template';
    return Errors.badRequest(message);
  }
}
