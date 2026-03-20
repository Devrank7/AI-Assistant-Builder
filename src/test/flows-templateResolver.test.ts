// src/test/flows-templateResolver.test.ts
import { describe, it, expect } from 'vitest';
import { resolveTemplate } from '@/lib/flows/templateResolver';

describe('Template Resolver', () => {
  const context = {
    contact: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      leadScore: 85,
      leadTemp: 'hot',
      channel: 'telegram',
    },
    conversation: {
      lastMessage: 'What is your pricing?',
    },
    trigger: {
      reason: 'high_value',
    },
    widget: {
      name: 'Acme Support',
    },
  };

  it('should resolve contact variables', () => {
    expect(resolveTemplate('Hi {{contact.name}}!', context)).toBe('Hi John Doe!');
  });

  it('should resolve nested paths', () => {
    expect(resolveTemplate('Score: {{contact.leadScore}}', context)).toBe('Score: 85');
  });

  it('should resolve conversation variables', () => {
    expect(resolveTemplate('Last: {{conversation.lastMessage}}', context)).toBe('Last: What is your pricing?');
  });

  it('should resolve trigger variables', () => {
    expect(resolveTemplate('Reason: {{trigger.reason}}', context)).toBe('Reason: high_value');
  });

  it('should resolve widget variables', () => {
    expect(resolveTemplate('Widget: {{widget.name}}', context)).toBe('Widget: Acme Support');
  });

  it('should handle missing variables gracefully', () => {
    expect(resolveTemplate('Hi {{contact.unknown}}', context)).toBe('Hi ');
  });

  it('should resolve multiple variables in one string', () => {
    expect(resolveTemplate('{{contact.name}} ({{contact.leadTemp}}) via {{contact.channel}}', context)).toBe(
      'John Doe (hot) via telegram'
    );
  });

  it('should return string as-is when no variables present', () => {
    expect(resolveTemplate('Hello world', context)).toBe('Hello world');
  });
});
