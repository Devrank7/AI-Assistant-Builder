export type WidgetTypeId = 'ai_chat' | 'smart_faq' | 'lead_form';

export interface WidgetTypeConfig {
  id: WidgetTypeId;
  label: string;
  description: string;
  icon: string;
  components: string[];
  hooks: string[];
  themeFields: string[];
}

const BASE_THEME_FIELDS = [
  'domain',
  'font',
  'isDark',
  'widgetW',
  'widgetH',
  'widgetMaxW',
  'widgetMaxH',
  'toggleSize',
  'toggleRadius',
  'headerPad',
  'nameSize',
  'headerFrom',
  'headerVia',
  'headerTo',
  'toggleFrom',
  'toggleVia',
  'toggleTo',
  'toggleShadow',
  'toggleHoverRgb',
  'cssPrimary',
  'cssAccent',
  'focusRgb',
];

const FAQ_THEME_FIELDS = [
  'faqAccordionBg',
  'faqAccordionBorder',
  'faqAccordionText',
  'faqAccordionHover',
  'faqAccordionActive',
  'faqAccordionIcon',
  'faqSearchBg',
  'faqSearchBorder',
  'faqSearchText',
  'faqSearchPlaceholder',
  'faqHighlight',
  'faqCategoryBg',
  'faqCategoryText',
];

const FORM_THEME_FIELDS = [
  'formInputBg',
  'formInputBorder',
  'formInputText',
  'formInputFocus',
  'formLabelText',
  'formErrorText',
  'formErrorBorder',
  'formSubmitFrom',
  'formSubmitTo',
  'formSubmitText',
  'formSubmitHover',
  'formProgressBg',
  'formProgressFill',
  'formStepActive',
  'formStepInactive',
  'formSuccessBg',
  'formSuccessText',
  'formSuccessIcon',
];

export const WIDGET_TYPES: WidgetTypeConfig[] = [
  {
    id: 'ai_chat',
    label: 'AI Chat',
    description: 'RAG chatbot with knowledge base, streaming responses, and voice input',
    icon: '💬',
    components: ['Widget.jsx', 'ChatMessage.jsx', 'QuickReplies.jsx', 'MessageFeedback.jsx', 'RichBlocks.jsx'],
    hooks: ['useChat.js', 'useDrag.js', 'useLanguage.js', 'useVoice.js', 'useTTS.js', 'useProactive.js'],
    themeFields: [],
  },
  {
    id: 'smart_faq',
    label: 'Smart FAQ',
    description: 'Accordion with AI search, auto-generated from knowledge base',
    icon: '❓',
    components: ['SmartFaq.jsx'],
    hooks: ['useFaq.js', 'useDrag.js', 'useLanguage.js'],
    themeFields: FAQ_THEME_FIELDS,
  },
  {
    id: 'lead_form',
    label: 'Lead Form',
    description: 'Multi-step form with conditional logic and validation',
    icon: '📋',
    components: ['LeadForm.jsx'],
    hooks: ['useForm.js', 'useDrag.js', 'useLanguage.js'],
    themeFields: FORM_THEME_FIELDS,
  },
];

export function getWidgetTypeConfig(id: WidgetTypeId): WidgetTypeConfig | null {
  return WIDGET_TYPES.find((t) => t.id === id) || null;
}

export function getRequiredThemeFields(id: WidgetTypeId): string[] {
  const config = getWidgetTypeConfig(id);
  if (!config) return BASE_THEME_FIELDS;
  return [...BASE_THEME_FIELDS, ...config.themeFields];
}
