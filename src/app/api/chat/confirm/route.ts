import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PendingAction from '@/models/PendingAction';
import ChatLog from '@/models/ChatLog';
import { pluginRegistry } from '@/lib/integrations/core/PluginRegistry';

export async function POST(request: NextRequest) {
  try {
    const { confirmId, sessionId, approved } = await request.json();

    if (!confirmId || !sessionId) {
      return NextResponse.json({ success: false, error: 'confirmId and sessionId are required' }, { status: 400 });
    }

    await connectDB();

    // Find and validate the pending action
    const pending = await PendingAction.findOne({ confirmId });

    if (!pending) {
      return NextResponse.json({ success: false, error: 'Action not found or expired' }, { status: 404 });
    }

    // Session validation — prevents unauthorized execution
    if (pending.sessionId !== sessionId) {
      return NextResponse.json({ success: false, error: 'Session mismatch' }, { status: 403 });
    }

    // Check expiry
    if (new Date() > pending.expiresAt) {
      await PendingAction.deleteOne({ confirmId });
      return NextResponse.json({ success: false, error: 'Action expired' }, { status: 410 });
    }

    // Delete pending action (one-time use)
    await PendingAction.deleteOne({ confirmId });

    if (!approved) {
      return NextResponse.json({ success: true, status: 'rejected' });
    }

    // Parse tool name: try each possible slug prefix against registry
    // Tool names: {slug}_{actionId} — slug may use underscores or hyphens
    const toolName = pending.tool;
    let slug = '';
    let actionId = '';

    const parts = toolName.split('_');
    for (let i = 1; i < parts.length; i++) {
      const candidateSlug = parts.slice(0, i).join('_');
      const candidateAction = parts.slice(i).join('_');
      // Try both underscore and hyphenated forms
      const hyphenSlug = candidateSlug.replace(/_/g, '-');
      if (pluginRegistry.get(candidateSlug)) {
        slug = candidateSlug;
        actionId = candidateAction;
        break;
      }
      if (pluginRegistry.get(hyphenSlug)) {
        slug = hyphenSlug;
        actionId = candidateAction;
        break;
      }
    }

    if (!slug) {
      return NextResponse.json({ success: false, error: `Plugin not found for tool "${toolName}"` }, { status: 404 });
    }

    // Execute the action via plugin registry
    const result = await pluginRegistry.executeAction(
      slug,
      actionId,
      pending.args as Record<string, unknown>,
      pending.userId,
      pending.widgetId
    );

    // Store confirmed action result in chat log so next conversation turn has context
    await ChatLog.findOneAndUpdate(
      { clientId: pending.widgetId, sessionId: pending.sessionId },
      {
        $push: {
          messages: {
            role: 'assistant',
            content: `[Action confirmed: ${toolName}] ${result.success ? 'Success' : 'Failed: ' + result.error}`,
            timestamp: new Date(),
          },
        },
      }
    );

    return NextResponse.json({ success: true, status: 'confirmed', result });
  } catch (err) {
    console.error('[ConfirmRoute] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
