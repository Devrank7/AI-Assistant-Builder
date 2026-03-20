// src/app/api/cron/flow-scheduler/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import FlowExecution from '@/models/FlowExecution';
import Flow from '@/models/Flow';
import Contact from '@/models/Contact';
import Conversation from '@/models/Conversation';
import Client from '@/models/Client';
import { evaluateConditions } from '@/lib/flows/conditionEvaluator';
import { executeAction } from '@/lib/flows/actionExecutor';
import type { TemplateContext } from '@/lib/flows/templateResolver';
import { successResponse, Errors } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Simple auth: check cron secret or admin token
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || process.env.ADMIN_SECRET_TOKEN;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return Errors.unauthorized();
    }

    await connectDB();

    // Find pending executions that are due
    const now = new Date();
    const pendingExecutions = await FlowExecution.find({
      status: 'pending',
      scheduledAt: { $lte: now },
    }).limit(50);

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const execution of pendingExecutions) {
      try {
        // Load flow to re-evaluate conditions
        const flow = await Flow.findOne({ flowId: execution.flowId, status: 'active' });
        if (!flow) {
          execution.status = 'skipped';
          await execution.save();
          skipped++;
          continue;
        }

        // Load contact for re-evaluation
        const contact = await Contact.findOne({ contactId: execution.contactId }).lean();
        if (!contact) {
          execution.status = 'skipped';
          await execution.save();
          skipped++;
          continue;
        }

        // Re-evaluate conditions against current state (spec requirement for "Follow-up After Silence" pattern)
        const conditionData: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(contact)) {
          conditionData[`contact.${key}`] = val;
        }
        for (const [key, val] of Object.entries(execution.trigger.data || {})) {
          conditionData[`event.${key}`] = val;
        }

        const conditionsMet = evaluateConditions(flow.trigger.conditions, conditionData);
        if (!conditionsMet) {
          execution.status = 'skipped';
          await execution.save();
          skipped++;
          continue;
        }

        // Load conversation and client for template context
        const conversation = execution.conversationId
          ? await Conversation.findOne({ conversationId: execution.conversationId }).lean()
          : null;
        const client = await Client.findOne({ clientId: flow.clientId }).lean();
        const clientRecord = client as unknown as Record<string, unknown> | null;
        const widgetName = (clientRecord?.widgetName as string) || flow.clientId;

        const contactRecord = contact as unknown as Record<string, unknown>;
        const conversationRecord = conversation as unknown as Record<string, unknown> | null;

        const templateContext: TemplateContext = {
          contact: contactRecord,
          conversation: conversationRecord ? { lastMessage: (conversationRecord.lastMessage as string) || '' } : {},
          trigger: {
            reason: (execution.trigger.data?.reason as string) || '',
            type: execution.trigger.type,
          },
          widget: { name: widgetName },
        };

        // Execute remaining steps
        for (const step of execution.remainingSteps) {
          if (step.type === 'action' && step.action) {
            const result = await executeAction({
              actionType: step.action,
              config: step.config,
              contactId: execution.contactId,
              clientId: flow.clientId,
              conversationId: execution.conversationId,
              templateContext,
            });
            execution.stepsExecuted.push({
              stepIndex: execution.stepsExecuted.length,
              status: result.success ? 'completed' : 'failed',
              result: result.result,
              timestamp: new Date(),
            });
          }
          // Nested delays: create a new pending execution for remaining steps after this delay
          if (step.type === 'delay') {
            const remainingAfterDelay = execution.remainingSteps.slice(execution.remainingSteps.indexOf(step) + 1);
            if (remainingAfterDelay.length > 0) {
              await FlowExecution.create({
                executionId: `${execution.executionId}-cont`,
                flowId: execution.flowId,
                contactId: execution.contactId,
                conversationId: execution.conversationId,
                trigger: execution.trigger,
                stepsExecuted: execution.stepsExecuted,
                status: 'pending',
                scheduledAt: new Date(Date.now() + (step.delayMinutes || 1) * 60000),
                remainingSteps: remainingAfterDelay,
              });
            }
            break;
          }
        }

        execution.status = 'completed';
        execution.remainingSteps = [];
        await execution.save();
        processed++;
      } catch (err) {
        console.error(`Flow execution ${execution.executionId} error:`, err);
        execution.status = 'failed';
        await execution.save();
        failed++;
      }
    }

    return successResponse({ processed, skipped, failed, total: pendingExecutions.length });
  } catch (error) {
    console.error('Cron flow-scheduler error:', error);
    return Errors.internal('Flow scheduler failed');
  }
}
