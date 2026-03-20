import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import MarketplaceTemplate from '@/models/MarketplaceTemplate';
import MarketplaceReview from '@/models/MarketplaceReview';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

  const [reviews, total] = await Promise.all([
    MarketplaceReview.find({ templateId: id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    MarketplaceReview.countDocuments({ templateId: id }),
  ]);

  return successResponse({
    reviews,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();

  const template = await MarketplaceTemplate.findById(id);
  if (!template || template.status !== 'published') {
    return Errors.notFound('Template not found');
  }

  const body = await request.json();
  const { rating, comment } = body;

  if (!rating || rating < 1 || rating > 5) {
    return Errors.badRequest('Rating must be between 1 and 5');
  }

  // Get user name
  const User = (await import('@/models/User')).default;
  const user = await User.findById(auth.userId).select('name email');
  const userName = user?.name || user?.email || 'Anonymous';

  // Upsert review (one per user per template)
  await MarketplaceReview.findOneAndUpdate(
    { templateId: id, userId: auth.userId },
    {
      templateId: id,
      userId: auth.userId,
      userName,
      rating: Math.round(rating),
      comment: comment || '',
    },
    { upsert: true, new: true }
  );

  // Recalculate average rating
  const allReviews = await MarketplaceReview.find({ templateId: id }).select('rating');
  const avgRating = allReviews.length > 0 ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length : 0;

  await MarketplaceTemplate.updateOne(
    { _id: id },
    { rating: Math.round(avgRating * 10) / 10, reviewCount: allReviews.length }
  );

  return successResponse(null, 'Review submitted');
}
