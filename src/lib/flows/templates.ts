// src/lib/flows/templates.ts
import type { IFlowStep, IFlowCondition } from '@/models/Flow';

export interface FlowTemplate {
  templateId: string;
  name: string;
  description: string;
  category: string;
  trigger: {
    type: string;
    conditions: IFlowCondition[];
  };
  steps: IFlowStep[];
}

export const BUILT_IN_TEMPLATES: FlowTemplate[] = [
  {
    templateId: 'hot-lead-alert',
    name: 'Hot Lead Alert',
    description: 'Notify your team via Telegram when a contact becomes hot (score > 80).',
    category: 'Notifications',
    trigger: {
      type: 'contact:score_changed',
      conditions: [{ field: 'contact.leadScore', operator: 'gt', value: 80 }],
    },
    steps: [
      {
        type: 'action',
        action: 'send_notification',
        config: {
          message: '🔥 Hot lead: {{contact.name}} (score: {{contact.leadScore}}) on {{widget.name}}',
          channel: 'telegram',
        },
      },
    ],
  },
  {
    templateId: 'follow-up-after-silence',
    name: 'Follow-up After Silence',
    description: 'Send a follow-up message 24h after a conversation is resolved, if no new activity.',
    category: 'Re-engagement',
    trigger: {
      type: 'conversation:resolved',
      conditions: [],
    },
    steps: [
      {
        type: 'delay',
        config: {},
        delayMinutes: 1440, // 24 hours
      },
      {
        type: 'action',
        action: 'send_message',
        config: {
          message: "Hi {{contact.name}}! Just checking in — do you have any other questions? We're here to help.",
        },
      },
    ],
  },
  {
    templateId: 'welcome-sequence',
    name: 'Welcome Sequence',
    description: 'Tag new contacts and send a welcome message after 1 hour.',
    category: 'Onboarding',
    trigger: {
      type: 'contact:created',
      conditions: [],
    },
    steps: [
      {
        type: 'action',
        action: 'add_tag',
        config: { tag: 'new' },
      },
      {
        type: 'delay',
        config: {},
        delayMinutes: 60, // 1 hour
      },
      {
        type: 'action',
        action: 'send_message',
        config: {
          message: 'Welcome, {{contact.name}}! Thanks for reaching out to {{widget.name}}. How can we help you today?',
        },
      },
    ],
  },
  {
    templateId: 'auto-tag-pricing',
    name: 'Auto-Tag by Topic',
    description: 'Automatically tag contacts who ask about pricing.',
    category: 'Tagging',
    trigger: {
      type: 'message:received',
      conditions: [{ field: 'event.text', operator: 'contains', value: 'pricing' }],
    },
    steps: [
      {
        type: 'action',
        action: 'add_tag',
        config: { tag: 'pricing-asked' },
      },
    ],
  },
];
