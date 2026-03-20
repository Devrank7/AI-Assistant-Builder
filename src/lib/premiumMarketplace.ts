import connectDB from './mongodb';
import PremiumTemplate, { IPremiumTemplate } from '@/models/PremiumTemplate';
import TemplatePurchase from '@/models/TemplatePurchase';

export interface ListFilters {
  niche?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  search?: string;
  status?: string;
  authorId?: string;
  page?: number;
  limit?: number;
  sort?: 'newest' | 'popular' | 'price_asc' | 'price_desc' | 'rating';
}

export async function listPremiumTemplates(filters: ListFilters) {
  await connectDB();

  const query: Record<string, unknown> = {};

  if (filters.status) {
    query.status = filters.status;
  } else {
    query.status = 'approved';
  }

  if (filters.niche) query.niche = filters.niche;
  if (filters.authorId) query.authorId = filters.authorId;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    query.price = {};
    if (filters.minPrice !== undefined) (query.price as Record<string, number>).$gte = filters.minPrice;
    if (filters.maxPrice !== undefined) (query.price as Record<string, number>).$lte = filters.maxPrice;
  }
  if (filters.minRating !== undefined) {
    query.rating = { $gte: filters.minRating };
  }
  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 20, 50);
  const skip = (page - 1) * limit;

  let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
  switch (filters.sort) {
    case 'popular':
      sortObj = { downloads: -1 };
      break;
    case 'price_asc':
      sortObj = { price: 1 };
      break;
    case 'price_desc':
      sortObj = { price: -1 };
      break;
    case 'rating':
      sortObj = { rating: -1 };
      break;
  }

  const [templates, total] = await Promise.all([
    PremiumTemplate.find(query).sort(sortObj).skip(skip).limit(limit).lean(),
    PremiumTemplate.countDocuments(query),
  ]);

  return { templates, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function submitTemplate(authorId: string, data: Partial<IPremiumTemplate>) {
  await connectDB();

  const template = await PremiumTemplate.create({
    ...data,
    authorId,
    status: 'pending_review',
    downloads: 0,
    rating: 0,
    reviewCount: 0,
    revenue: 0,
  });

  return template;
}

export async function approveTemplate(templateId: string) {
  await connectDB();
  const template = await PremiumTemplate.findByIdAndUpdate(templateId, { status: 'approved' }, { new: true });
  return template;
}

export async function purchaseTemplate(buyerId: string, templateId: string) {
  await connectDB();

  const template = await PremiumTemplate.findById(templateId);
  if (!template) throw new Error('Template not found');
  if (template.status !== 'approved') throw new Error('Template not available');

  // Check if already purchased
  const existing = await TemplatePurchase.findOne({ buyerId, templateId });
  if (existing) throw new Error('Already purchased');

  const authorEarnings = Math.round(template.price * template.revenueShare);
  const platformFee = template.price - authorEarnings;

  const purchase = await TemplatePurchase.create({
    buyerId,
    templateId,
    authorId: template.authorId,
    price: template.price,
    authorEarnings,
    platformFee,
    status: 'completed',
  });

  // Update template stats
  await PremiumTemplate.findByIdAndUpdate(templateId, {
    $inc: { downloads: 1, revenue: template.price },
  });

  return { purchase, downloadUrl: `/api/premium-marketplace/${templateId}/download` };
}

export async function getAuthorEarnings(authorId: string) {
  await connectDB();

  const purchases = await TemplatePurchase.find({ authorId, status: 'completed' }).lean();
  const total = purchases.reduce((sum, p) => sum + p.authorEarnings, 0);

  const templates = await PremiumTemplate.find({ authorId }).lean();
  const templateStats = templates.map((t) => ({
    id: t._id,
    title: t.title,
    downloads: t.downloads,
    revenue: t.revenue,
    status: t.status,
  }));

  return {
    total,
    pending: Math.round(total * 0.1), // 10% held for refund window
    paid: Math.round(total * 0.9),
    templates: templateStats,
  };
}

export async function getTopSellers(limit = 10) {
  await connectDB();
  return PremiumTemplate.find({ status: 'approved' }).sort({ downloads: -1 }).limit(limit).lean();
}
