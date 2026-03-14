import type { IndustryTemplate } from './types';

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'dental',
    label: 'Dental Clinic',
    emoji: '🦷',
    defaultColors: ['#1e40af', '#3b82f6', '#eff6ff'],
    defaultFont: 'Inter',
    sampleQuickReplies: ['Book appointment', 'Our services', 'Insurance info', 'Contact us'],
    sampleKnowledge: [
      'We offer comprehensive dental services including general dentistry, cosmetic procedures, orthodontics, and emergency dental care. Our team of experienced dentists is committed to providing the highest quality care in a comfortable environment.',
      'Our office hours are Monday through Friday, 9 AM to 6 PM, and Saturday 9 AM to 2 PM. We accept most dental insurance plans and offer flexible payment options including financing through CareCredit.',
    ],
    systemPromptHints: 'dental clinic, focus on appointments, insurance, dental procedures, patient comfort',
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    emoji: '🍕',
    defaultColors: ['#dc2626', '#f97316', '#fef3c7'],
    defaultFont: 'Playfair Display',
    sampleQuickReplies: ['See the menu', 'Make a reservation', 'Hours & location', 'Delivery options'],
    sampleKnowledge: [
      'Welcome to our restaurant! We serve authentic cuisine made with fresh, locally sourced ingredients. Our menu features appetizers, main courses, desserts, and a curated selection of wines and cocktails.',
      'We are open for lunch (11:30 AM - 2:30 PM) and dinner (5:30 PM - 10:00 PM), Tuesday through Sunday. Reservations are recommended for dinner, especially on weekends. We also offer takeout and delivery.',
    ],
    systemPromptHints: 'restaurant, focus on menu, reservations, hours, dietary restrictions, delivery',
  },
  {
    id: 'saas',
    label: 'SaaS / Tech',
    emoji: '💻',
    defaultColors: ['#7c3aed', '#a78bfa', '#f5f3ff'],
    defaultFont: 'Space Grotesk',
    sampleQuickReplies: ['Pricing plans', 'Book a demo', 'Technical support', 'API documentation'],
    sampleKnowledge: [
      'Our platform helps businesses streamline their operations with powerful automation tools, real-time analytics, and seamless integrations. We offer three plans: Starter (free), Pro ($49/mo), and Enterprise (custom pricing).',
      'Getting started is easy: sign up for a free account, connect your existing tools via our API or pre-built integrations, and start automating workflows in minutes. Our support team is available 24/7 via chat and email.',
    ],
    systemPromptHints: 'SaaS product, focus on features, pricing, integrations, API, onboarding',
  },
  {
    id: 'realestate',
    label: 'Real Estate',
    emoji: '🏠',
    defaultColors: ['#059669', '#34d399', '#ecfdf5'],
    defaultFont: 'DM Sans',
    sampleQuickReplies: ['View listings', 'Schedule viewing', 'Sell my property', 'Market report'],
    sampleKnowledge: [
      'We are a full-service real estate agency helping clients buy, sell, and rent properties. Our experienced agents provide personalized service, market analysis, and negotiation expertise to ensure the best outcomes.',
      'Browse our current listings on our website or contact an agent for a personalized property search. We offer free market valuations for sellers and can guide first-time buyers through every step of the process.',
    ],
    systemPromptHints: 'real estate, focus on listings, viewings, buying/selling process, market conditions',
  },
  {
    id: 'beauty',
    label: 'Beauty Salon',
    emoji: '💅',
    defaultColors: ['#db2777', '#f472b6', '#fdf2f8'],
    defaultFont: 'Cormorant Garamond',
    sampleQuickReplies: ['Book appointment', 'Our services', 'Pricing', 'Products we use'],
    sampleKnowledge: [
      'Welcome to our beauty salon! We offer a full range of services including haircuts, coloring, styling, manicures, pedicures, facials, and waxing. Our skilled team uses premium products to ensure the best results.',
      'Walk-ins are welcome but appointments are recommended to guarantee your preferred time slot. We are open Tuesday through Saturday, 10 AM to 7 PM. Gift cards are available for purchase online and in-salon.',
    ],
    systemPromptHints: 'beauty salon, focus on services, appointments, pricing, products, gift cards',
  },
];

export function getTemplateById(id: string): IndustryTemplate | undefined {
  return INDUSTRY_TEMPLATES.find((t) => t.id === id);
}
