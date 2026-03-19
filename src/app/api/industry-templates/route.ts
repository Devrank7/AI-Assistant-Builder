/**
 * Industry Templates API
 *
 * GET /api/industry-templates - List all templates
 * GET /api/industry-templates?slug=dental - Get specific template
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import IndustryTemplate from '@/models/IndustryTemplate';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (slug) {
      const template = await IndustryTemplate.findOne({ slug, isActive: true }).lean();
      if (!template) {
        return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, template });
    }

    const templates = await IndustryTemplate.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .select('slug name nameRu icon description descriptionRu colorScheme recommendedIntegrations')
      .lean();

    return NextResponse.json({ success: true, templates });
  } catch (error) {
    console.error('Industry templates API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
