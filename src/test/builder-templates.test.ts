// src/test/builder-templates.test.ts
import { describe, it, expect } from 'vitest';
import { INDUSTRY_TEMPLATES, getTemplateById } from '@/lib/builder/templates';

describe('Industry Templates', () => {
  it('should have 5 templates', () => {
    expect(INDUSTRY_TEMPLATES.length).toBe(5);
  });

  it('should have required fields on each template', () => {
    for (const t of INDUSTRY_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(t.emoji).toBeTruthy();
      expect(t.defaultColors.length).toBeGreaterThanOrEqual(3);
      expect(t.defaultFont).toBeTruthy();
      expect(t.sampleQuickReplies.length).toBeGreaterThanOrEqual(3);
      expect(t.sampleKnowledge.length).toBeGreaterThanOrEqual(1);
      expect(t.sampleKnowledge.every((k) => k.length <= 2000)).toBe(true);
      expect(t.systemPromptHints).toBeTruthy();
    }
  });

  it('should include dental, restaurant, saas, realestate, beauty', () => {
    const ids = INDUSTRY_TEMPLATES.map((t) => t.id);
    expect(ids).toContain('dental');
    expect(ids).toContain('restaurant');
    expect(ids).toContain('saas');
    expect(ids).toContain('realestate');
    expect(ids).toContain('beauty');
  });

  it('should find template by id', () => {
    const template = getTemplateById('dental');
    expect(template).toBeDefined();
    expect(template!.label).toContain('Dental');
  });

  it('should return undefined for unknown id', () => {
    expect(getTemplateById('unknown')).toBeUndefined();
  });
});
