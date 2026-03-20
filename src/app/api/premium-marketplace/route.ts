import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { listPremiumTemplates, submitTemplate } from '@/lib/premiumMarketplace';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const url = new URL(request.url);
  const filters = {
    niche: url.searchParams.get('niche') || undefined,
    minPrice: url.searchParams.get('minPrice') ? Number(url.searchParams.get('minPrice')) : undefined,
    maxPrice: url.searchParams.get('maxPrice') ? Number(url.searchParams.get('maxPrice')) : undefined,
    minRating: url.searchParams.get('minRating') ? Number(url.searchParams.get('minRating')) : undefined,
    search: url.searchParams.get('search') || undefined,
    sort: (url.searchParams.get('sort') as 'newest' | 'popular' | 'price_asc' | 'price_desc' | 'rating') || undefined,
    page: url.searchParams.get('page') ? Number(url.searchParams.get('page')) : 1,
    limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 20,
  };

  const result = await listPremiumTemplates(filters);
  return successResponse(result);
}

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    if (!body.title || !body.description || !body.niche || !body.themeConfig) {
      return Errors.badRequest('Missing required fields: title, description, niche, themeConfig');
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
