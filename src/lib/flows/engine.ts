// src/lib/flows/engine.ts
import { nanoid } from 'nanoid';
import connectDB from '@/lib/mongodb';
import Flow from '@/models/Flow';
import FlowExecution from '@/models/FlowExecution';
import Contact from '@/models/Contact';
import Conversation from '@/models/Conversation';
import Client from '@/models/Client';
import { evaluateConditions } from './conditionEvaluator';
import { executeAction } from './actionExecutor';
import type { TemplateContext } from './templateResolver';
import type { EventPayload } from '@/lib/events';
import type { IFlowStep } from '@/models/Flow';

/**
 * Build a flat data map from event payload + contact for condition evaluation.
 */
function buildConditionData(event: EventPayload, contact: Record<string, unknown> | null): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  // Event payload fields
  if (event.payload) {
    for (const [key, val] of Object.entries(event.payload)) {
      data[`event.${key}`] = val;
    }
  }

  // Contact fields
  if (contact) {
    for (const [key, val] of Object.entries(contact)) {
      data[`contact.${key}`] = val;
    }
  }

  return data;
}

/**
 * Build template context from contact, conversation, event.
 */
function buildTemplateContext(
  contact: Record<string, unknown> | null,
  conversation: Record<string, unknown> | null,
  event: EventPayload,
  widgetName: string
): TemplateContext {
  return {
    contact: contact || {},
    conversation: conversation
      ? { lastMessage: (conversation.lastMessage as Record<string, unknown>)?.text || '' }
      : {},
    trigger: { reason: event.payload.reason || '', type: event.eventType },
    widget: { name: widgetName },
  };
}

/**
 * Process an event through the flow engine.
 * Called by the event bus listener.
 */
export async function processEvent(event: EventPayload): Promise<void> {
  await connectDB();

  // 1. Find active flows matching this event type
  const flows = await Flow.find({
    'trigger.type': event.eventType,
    clientId: event.clientId,
    status: 'active',
  }).lean();

  if (flows.length === 0) return;

  // 2. Load contact data
  const contactId = event.payload.contactId as string | undefined;
  const contact = contactId ? await Contact.findOne({ contactId }).lean() : null;

  // 3. Load conversation data
  const conversationId = event.payload.conversationId as string | undefined;
  const conversation = conversationId ? await Conversation.findOne({ conversationId }).lean() : null;

  // 4. Get widget name
  const client = await Client.findOne({ clientId: event.clientId }).lean();
  const widgetName = ((client as Record<string, unknown>)?.widgetName as string) || event.clientId;

  const templateContext = buildTemplateContext(
    contact as Record<string, unknown> | null,
    conversation as Record<string, unknown> | null,
    event,
    widgetName
  );

  // 5. Process each matching flow
  for (const flow of flows) {
    try {
      // Evaluate conditions
      const conditionData = buildConditionData(event, contact as Record<string, unknown> | null);
      const conditionsMet = evaluateConditions(flow.trigger.conditions, conditionData);
      if (!conditionsMet) continue;

      // Execute steps sequentially
      const stepsExecuted: Array<{
        stepIndex: number;
        status: 'completed' | 'failed' | 'skipped';
        result?: string;
        timestamp: Date;
      }> = [];

      for (let i = 0; i < flow.steps.length; i++) {
        const step = flow.steps[i];

        if (step.type === 'delay') {
          // Create pending execution for remaining steps
          const remainingSteps = flow.steps.slice(i + 1);
          if (remainingSteps.length > 0) {
            const delayMs = (step.delayMinutes || 1) * 60 * 1000;
            await FlowExecution.create({
              executionId: nanoid(12),
              flowId: flow.flowId,
              contactId: contactId || 'unknown',
              conversationId: conversationId || null,
              trigger: { type: event.eventType, data: event.payload },
              stepsExecuted,
              status: 'pending',
              scheduledAt: new Date(Date.now() + delayMs),
              remainingSteps,
            });
          }
          break; // Stop processing — remaining steps will be handled by cron
        }

        if (step.type === 'action' && step.action) {
          const result = await executeAction({
            actionType: step.action,
            config: step.config,
            contactId: contactId || 'unknown',
            clientId: event.clientId,
            conversationId: conversationId || null,
            templateContext,
          });

          stepsExecuted.push({
            stepIndex: i,
            status: result.success ? 'completed' : 'failed',
            result: result.result,
            timestamp: new Date(),
          });
        }
      }

      // Log completed execution (if no delay was encountered)
      const hasDelay = flow.steps.some((s: IFlowStep) => s.type === 'delay');
      if (!hasDelay) {
        await FlowExecution.create({
          executionId: nanoid(12),
          flowId: flow.flowId,
          contactId: contactId || 'unknown',
          conversationId: conversationId || null,
          trigger: { type: event.eventType, data: event.payload },
          stepsExecuted,
          status: stepsExecuted.some((s) => s.status === 'failed') ? 'failed' : 'completed',
          scheduledAt: null,
          remainingSteps: [],
        });
      }

      // Update flow stats
      await Flow.findOneAndUpdate(
        { flowId: flow.flowId },
        { $inc: { 'stats.timesTriggered': 1 }, $set: { 'stats.lastTriggeredAt': new Date() } }
      );
    } catch (err) {
      console.error(`Flow ${flow.flowId} execution error:`, err);
    }
  }
}
