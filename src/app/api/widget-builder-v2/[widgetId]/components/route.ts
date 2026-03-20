import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import connectDB from '@/lib/mongodb';
import WidgetComponent from '@/models/WidgetComponent';

export async function POST(request: NextRequest, { params }: { params: Promise<{ widgetId: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { widgetId } = await params;
  const body = await request.json();

  if (!body.type || !body.name) {
    return Errors.badRequest('Missing required fields: type, name');
  }

  await connectDB();
  const maxOrder = await WidgetComponent.findOne({ widgetId }).sort({ order: -1 }).select('order').lean();
  const order = maxOrder ? (maxOrder.order || 0) + 1 : 0;

  const component = await WidgetComponent.create({
    widgetId,
    clientId: widgetId,
    type: body.type,
    name: body.name,
    order,
    props: body.props || {},
    cssVariables: body.cssVariables || {},
    isVisible: body.isVisible !== false,
  });

  return successResponse(component, 'Component added');
}
