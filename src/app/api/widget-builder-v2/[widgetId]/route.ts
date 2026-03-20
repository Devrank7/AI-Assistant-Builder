import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getComponents, reorderComponents, updateComponent } from '@/lib/widgetBuilderV2';

export async function GET(request: NextRequest, { params }: { params: Promise<{ widgetId: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { widgetId } = await params;
  const components = await getComponents(widgetId);
  return successResponse(components);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ widgetId: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { widgetId } = await params;
  const body = await request.json();

  // Batch update: { updates: [{ id, props, cssVariables }], orderMap?: {} }
  if (body.updates && Array.isArray(body.updates)) {
    const results = await Promise.all(
      body.updates.map(
        (u: {
          id: string;
          props?: Record<string, unknown>;
          cssVariables?: Record<string, string>;
          isVisible?: boolean;
        }) => updateComponent(u.id, { props: u.props, cssVariables: u.cssVariables, isVisible: u.isVisible } as never)
      )
    );
    if (body.orderMap) {
      await reorderComponents(widgetId, body.orderMap);
    }
    return successResponse(results);
  }

  // Just reorder
  if (body.orderMap) {
    await reorderComponents(widgetId, body.orderMap);
    const components = await getComponents(widgetId);
    return successResponse(components);
  }

  return Errors.badRequest('Provide updates array or orderMap');
}
