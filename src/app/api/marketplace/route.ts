import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import MarketplaceTemplate, { MARKETPLACE_NICHES, type MarketplaceNiche } from '@/models/MarketplaceTemplate';

export async function GET(request: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(request.url);

  const niche = searchParams.get('niche');
  const widgetType = searchParams.get('widgetType');
  const tier = searchParams.get('tier');
  const sort = searchParams.get('sort') || 'popular';
  const search = searchParams.get('search');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

  const filter: Record<string, unknown> = { status: 'published' };
  if (niche && MARKETPLACE_NICHES.includes(niche as MarketplaceNiche)) filter.niche = niche;
  if (widgetType) filter.widgetType = widgetType;
  if (tier && ['official', 'community'].includes(tier)) filter.tier = tier;
  if (search) filter.$text = { $search: search };

  let sortObj: Record<string, 1 | -1> = {};
  if (sort === 'popular') sortObj = { installCount: -1 };
  else if (sort === 'newest') sortObj = { createdAt: -1 };
  else if (sort === 'top_rated') sortObj = { rating: -1 };
  else sortObj = { installCount: -1 };

  const [templates, total] = await Promise.all([
    MarketplaceTemplate.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-themeJson -configJson -knowledgeSample'),
    MarketplaceTemplate.countDocuments(filter),
  ]);

  return successResponse({
    templates,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();
  const body = await request.json();
  const { name, description, shortDescription, niche, widgetType, tags, themeJson, configJson, knowledgeSample } = body;

  if (!name || !description || !shortDescription || !niche || !themeJson || !configJson) {
    return Errors.badRequest(
      'Missing required fields: name, description, shortDescription, niche, themeJson, configJson'
    );
  }

  if (!MARKETPLACE_NICHES.includes(niche)) {
    return Errors.badRequest('Invalid niche');
  }

  // Generate slug from name
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  let slug = baseSlug;
  let counter = 1;
  while (await MarketplaceTemplate.findOne({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Get user name
  const User = (await import('@/models/User')).default;
  const user = await User.findById(auth.userId).select('name email');
  const authorName = user?.name || user?.email || 'Anonymous';

  const template = await MarketplaceTemplate.create({
    name,
    slug,
    description,
    shortDescription,
    niche,
    widgetType: widgetType || 'ai_chat',
    tags: tags || [],
    themeJson,
    configJson,
    knowledgeSample: knowledgeSample || '',
    authorId: auth.userId,
    authorName,
    tier: 'community',
    status: 'review',
    previewConfig: {
      primaryColor: themeJson.cssPrimary || '#5bbad5',
      isDark: themeJson.isDark ?? true,
    },
  });

  return successResponse(template, 'Template submitted for review');
}
