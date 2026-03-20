import connectDB from '@/lib/mongodb';
import Notification, { NotificationType } from '@/models/Notification';

interface NotifyInput {
  type: NotificationType;
  userId: string;
  title: string;
  message: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export async function notify(input: NotifyInput): Promise<void> {
  await connectDB();
  await Notification.create({
    type: input.type,
    userId: input.userId,
    title: input.title,
    message: input.message,
    targetId: input.targetId,
    metadata: input.metadata || {},
  });
}

export async function notifyWidgetDeployed(userId: string, clientId: string, widgetName: string) {
  await notify({
    type: 'widget_deployed',
    userId,
    title: 'Widget deployed',
    message: `"${widgetName}" is live and ready to receive visitors.`,
    targetId: clientId,
  });
}

export async function notifyKnowledgeGap(userId: string, clientId: string, question: string) {
  await notify({
    type: 'knowledge_gap',
    userId,
    title: 'Knowledge gap detected',
    message: `A visitor asked "${question.substring(0, 100)}" but your AI couldn't find an answer. Consider adding this to your knowledge base.`,
    targetId: clientId,
  });
}

export async function notifyTeamInvite(userId: string, orgName: string, role: string) {
  await notify({
    type: 'team_invite',
    userId,
    title: 'Team invitation',
    message: `You've been invited to join "${orgName}" as ${role}.`,
  });
}

export async function notifyABTestResult(userId: string, testId: string, result: string) {
  await notify({
    type: 'ab_test_result',
    userId,
    title: 'A/B test result',
    message: result,
    targetId: testId,
  });
}

export async function notifyNewClient(userId: string, clientId: string, clientName: string) {
  await notify({
    type: 'new_client',
    userId,
    title: 'New widget created',
    message: `Widget "${clientName}" has been created successfully.`,
    targetId: clientId,
  });
}

export async function notifyWidgetError(userId: string, clientId: string, error: string) {
  await notify({
    type: 'widget_error',
    userId,
    title: 'Widget error',
    message: `An error occurred with your widget: ${error.substring(0, 200)}`,
    targetId: clientId,
  });
}
