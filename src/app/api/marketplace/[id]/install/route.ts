import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import MarketplaceTemplate from '@/models/MarketplaceTemplate';
import crypto from 'crypto';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();

  const template = await MarketplaceTemplate.findById(id);
  if (!template || template.status !== 'published') {
    return Errors.notFound('Template not found');
  }

  // Enforce widget limit
  const { checkWidgetLimit } = await import('@/lib/planLimits');
  const widgetCheck = await checkWidgetLimit(auth.userId, auth.user.plan as import('@/models/User').Plan);
  if (!widgetCheck.allowed) {
    return Errors.forbidden(
      `Widget limit reached (${widgetCheck.used}/${widgetCheck.limit}). Upgrade your plan to create more widgets.`
    );
  }

  // Create a new client from template
  const Client = (await import('@/models/Client')).default;
  const clientId = `mp-${crypto.randomBytes(6).toString('hex')}`;
  const clientToken = crypto.randomBytes(32).toString('hex');

  await Client.create({
    clientId,
    clientToken,
    clientType: 'full',
    widgetType: template.widgetType || 'ai_chat',
    username: template.name,
    userId: auth.userId,
    organizationId: auth.organizationId || undefined,
  });

  // Increment install count
  await MarketplaceTemplate.updateOne({ _id: id }, { $inc: { installCount: 1 } });

  return successResponse(
    {
      clientId,
      themeJson: template.themeJson,
      configJson: template.configJson,
      knowledgeSample: template.knowledgeSample,
    },
    'Template installed successfully'
  );
}
