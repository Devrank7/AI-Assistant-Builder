import { describe, it, expect } from 'vitest';
import { WIDGET_TYPES, getWidgetTypeConfig, getRequiredThemeFields } from '../widgetTypes';

describe('widgetTypes', () => {
  it('has all three widget types', () => {
    expect(WIDGET_TYPES).toHaveLength(3);
    expect(WIDGET_TYPES.map((t) => t.id)).toEqual(['ai_chat', 'smart_faq', 'lead_form']);
  });

  it('getWidgetTypeConfig returns correct config', () => {
    const faq = getWidgetTypeConfig('smart_faq');
    expect(faq).toBeDefined();
    expect(faq!.label).toBe('Smart FAQ');
    expect(faq!.components).toContain('SmartFaq.jsx');
  });

  it('getWidgetTypeConfig returns null for unknown type', () => {
    expect(getWidgetTypeConfig('unknown' as any)).toBeNull();
  });

  it('getRequiredThemeFields includes base fields for all types', () => {
    const chatFields = getRequiredThemeFields('ai_chat');
    expect(chatFields).toContain('domain');
    expect(chatFields).toContain('font');
  });

  it('smart_faq has faq-specific theme fields', () => {
    const faqFields = getRequiredThemeFields('smart_faq');
    expect(faqFields).toContain('faqAccordionBg');
    expect(faqFields).toContain('faqSearchBg');
  });

  it('lead_form has form-specific theme fields', () => {
    const formFields = getRequiredThemeFields('lead_form');
    expect(formFields).toContain('formInputBg');
    expect(formFields).toContain('formSubmitFrom');
  });
});
