import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { applyBrandToWidgets } from '@/lib/brandService';

/**
 * POST /api/brands/[id]/apply
 * Apply a brand's color/typography theme to a set of widgets.
 * Body: { widgetIds: string[] }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const { widgetIds } = body;

    if (!Array.isArray(widgetIds)) {
      return Errors.badRequest('widgetIds must be an array');
    }

    const orgId = auth.organizationId || auth.userId;
    const brand = await applyBrandToWidgets(id, orgId, widgetIds);
    if (!brand) return Errors.notFound('Brand not found');

    return successResponse(
      { brandId: brand._id, appliedTo: widgetIds.length, widgetIds },
      `Brand applied to ${widgetIds.length} widget(s)`
    );
  } catch (error) {
    console.error('Apply brand error:', error);
    return Errors.internal('Failed to apply brand');
  }
}
