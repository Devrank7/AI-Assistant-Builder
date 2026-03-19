/**
 * Industry Templates Seeder
 *
 * Seeds the IndustryTemplate collection with pre-built configs
 * for common business types. Run on startup or manually.
 */

import connectDB from '@/lib/mongodb';
import IndustryTemplate from '@/models/IndustryTemplate';

const TEMPLATES = [
  {
    slug: 'dental',
    name: 'Dental Clinic',
    nameRu: 'Стоматологическая клиника',
    icon: '🦷',
    description: 'AI assistant for dental clinics: appointments, services, pricing, emergency info',
    descriptionRu: 'AI-ассистент для стоматологий: запись на прием, услуги, цены, экстренная помощь',
    systemPrompt: `You are a friendly and professional AI assistant for a dental clinic. Help patients with:
- Booking appointments and checking availability
- Information about dental services and procedures
- Pricing and insurance questions
- Emergency dental care guidance
- Post-procedure care instructions
Always be warm, reassuring, and professional. Many patients have dental anxiety — be empathetic.`,
    greeting: 'Hello! Welcome to our dental clinic. How can I help you today?',
    greetingRu: 'Здравствуйте! Добро пожаловать в нашу стоматологическую клинику. Чем могу помочь?',
    quickReplies: ['Book appointment', 'Our services', 'Pricing', 'Emergency'],
    quickRepliesRu: ['Записаться на прием', 'Наши услуги', 'Цены', 'Экстренная помощь'],
    temperature: 0.6,
    knowledgeTopics: ['services', 'pricing', 'doctors', 'schedule', 'insurance', 'location', 'emergency'],
    personas: [
      {
        name: 'Reception',
        role: 'reception',
        tone: 'friendly',
        systemPromptOverlay: 'You handle appointment booking and general inquiries. Be warm and efficient.',
      },
      {
        name: 'Dr. Assistant',
        role: 'medical',
        tone: 'professional',
        systemPromptOverlay: 'You provide medical information about dental procedures. Be accurate and reassuring.',
      },
    ],
    recommendedIntegrations: ['google_calendar', 'whatsapp', 'telegram'],
    colorScheme: { primary: '#2563EB', secondary: '#1E40AF', accent: '#60A5FA' },
    proactiveTriggers: [
      { trigger: 'page_load', message: 'Need to book a dental appointment? I can help!', delaySeconds: 5 },
    ],
    sortOrder: 1,
  },
  {
    slug: 'beauty_salon',
    name: 'Beauty Salon',
    nameRu: 'Салон красоты',
    icon: '💇‍♀️',
    description: 'AI assistant for beauty salons: bookings, services, master selection',
    descriptionRu: 'AI-ассистент для салонов красоты: запись, услуги, выбор мастера',
    systemPrompt: `You are a stylish and friendly AI assistant for a beauty salon. Help clients with:
- Booking appointments with specific masters/stylists
- Information about services (hair, nails, skincare, makeup)
- Pricing and packages
- Product recommendations
- Gift certificates
Be trendy, warm, and make clients feel special.`,
    greeting: 'Hey! Welcome to our beauty salon. Ready to look amazing?',
    greetingRu: 'Привет! Добро пожаловать в наш салон красоты. Готовы выглядеть потрясающе?',
    quickReplies: ['Book appointment', 'Services & prices', 'Our masters', 'Gift cards'],
    quickRepliesRu: ['Записаться', 'Услуги и цены', 'Наши мастера', 'Подарочные сертификаты'],
    temperature: 0.7,
    knowledgeTopics: ['services', 'pricing', 'masters', 'schedule', 'products', 'location'],
    personas: [
      {
        name: 'Salon Admin',
        role: 'reception',
        tone: 'friendly',
        systemPromptOverlay: 'You handle bookings and general inquiries. Be warm and trendy.',
      },
    ],
    recommendedIntegrations: ['google_calendar', 'instagram', 'whatsapp'],
    colorScheme: { primary: '#EC4899', secondary: '#BE185D', accent: '#F9A8D4' },
    proactiveTriggers: [
      { trigger: 'page_load', message: 'Looking for a new look? Check out our latest services!', delaySeconds: 5 },
    ],
    sortOrder: 2,
  },
  {
    slug: 'restaurant',
    name: 'Restaurant',
    nameRu: 'Ресторан',
    icon: '🍽️',
    description: 'AI assistant for restaurants: reservations, menu, delivery, events',
    descriptionRu: 'AI-ассистент для ресторанов: бронирование, меню, доставка, мероприятия',
    systemPrompt: `You are a hospitable AI assistant for a restaurant. Help guests with:
- Table reservations and party bookings
- Menu information, dietary restrictions, allergens
- Delivery and takeout orders
- Special events and catering
- Hours and location
Be warm, inviting, and make guests feel welcome. Suggest popular dishes when asked.`,
    greeting: 'Welcome! Would you like to see our menu or make a reservation?',
    greetingRu: 'Добро пожаловать! Хотите посмотреть меню или забронировать столик?',
    quickReplies: ['Menu', 'Reserve a table', 'Delivery', 'Hours & location'],
    quickRepliesRu: ['Меню', 'Забронировать стол', 'Доставка', 'Часы и адрес'],
    temperature: 0.7,
    knowledgeTopics: ['menu', 'pricing', 'reservations', 'delivery', 'events', 'hours', 'location', 'allergens'],
    personas: [
      {
        name: 'Maitre D',
        role: 'reception',
        tone: 'formal',
        systemPromptOverlay: 'You are the digital maitre d. Handle reservations with elegance.',
      },
    ],
    recommendedIntegrations: ['google_calendar', 'stripe', 'whatsapp'],
    colorScheme: { primary: '#DC2626', secondary: '#991B1B', accent: '#FCA5A5' },
    proactiveTriggers: [{ trigger: 'page_load', message: 'Hungry? Check out our specials today!', delaySeconds: 3 }],
    sortOrder: 3,
  },
  {
    slug: 'real_estate',
    name: 'Real Estate',
    nameRu: 'Недвижимость',
    icon: '🏠',
    description: 'AI assistant for real estate agencies: property search, viewings, mortgage info',
    descriptionRu: 'AI-ассистент для агентств недвижимости: поиск объектов, просмотры, ипотека',
    systemPrompt: `You are a knowledgeable AI assistant for a real estate agency. Help clients with:
- Property search based on preferences (location, budget, size, type)
- Scheduling property viewings
- Mortgage and financing information
- Market insights and pricing
- Neighborhood information
Be professional, trustworthy, and proactive in suggesting properties that match their needs.`,
    greeting: 'Hello! Looking to buy, sell, or rent? Tell me what you need.',
    greetingRu: 'Здравствуйте! Покупка, продажа или аренда? Расскажите, что вам нужно.',
    quickReplies: ['Buy property', 'Rent', 'Sell my property', 'Mortgage info'],
    quickRepliesRu: ['Купить', 'Аренда', 'Продать', 'Ипотека'],
    temperature: 0.6,
    knowledgeTopics: ['properties', 'pricing', 'neighborhoods', 'mortgage', 'agents', 'process'],
    personas: [
      {
        name: 'Sales Agent',
        role: 'sales',
        tone: 'professional',
        systemPromptOverlay:
          'Focus on understanding client needs and matching properties. Ask about budget, location, and must-haves.',
      },
      {
        name: 'Mortgage Advisor',
        role: 'finance',
        tone: 'professional',
        systemPromptOverlay: 'Provide mortgage and financing guidance. Be thorough with numbers.',
      },
    ],
    recommendedIntegrations: ['google_calendar', 'hubspot', 'whatsapp'],
    colorScheme: { primary: '#059669', secondary: '#047857', accent: '#6EE7B7' },
    proactiveTriggers: [
      { trigger: 'page_load', message: 'Looking for your dream home? I can help you search!', delaySeconds: 5 },
    ],
    sortOrder: 4,
  },
  {
    slug: 'auto_service',
    name: 'Auto Service',
    nameRu: 'Автосервис',
    icon: '🚗',
    description: 'AI assistant for auto services: booking, diagnostics, parts, pricing',
    descriptionRu: 'AI-ассистент для автосервисов: запись, диагностика, запчасти, цены',
    systemPrompt: `You are a helpful AI assistant for an auto service center. Help customers with:
- Booking service appointments
- Diagnostic information and repair estimates
- Parts availability and pricing
- Maintenance schedules and recommendations
- Emergency roadside assistance info
Be knowledgeable about cars, honest about pricing, and helpful with technical questions.`,
    greeting: 'Hi! Need car service? Tell me what your car needs.',
    greetingRu: 'Привет! Нужен автосервис? Расскажите, что случилось с машиной.',
    quickReplies: ['Book service', 'Get estimate', 'Parts inquiry', 'Emergency'],
    quickRepliesRu: ['Записаться', 'Узнать цену', 'Запчасти', 'Экстренная помощь'],
    temperature: 0.6,
    knowledgeTopics: ['services', 'pricing', 'parts', 'mechanics', 'schedule', 'location', 'brands'],
    personas: [
      {
        name: 'Service Advisor',
        role: 'sales',
        tone: 'friendly',
        systemPromptOverlay: 'Help customers understand what their car needs. Be honest and straightforward.',
      },
    ],
    recommendedIntegrations: ['google_calendar', 'whatsapp', 'telegram'],
    colorScheme: { primary: '#F59E0B', secondary: '#D97706', accent: '#FDE68A' },
    proactiveTriggers: [
      { trigger: 'page_load', message: 'Car trouble? Book a diagnostic — we can help!', delaySeconds: 5 },
    ],
    sortOrder: 5,
  },
  {
    slug: 'saas',
    name: 'SaaS Product',
    nameRu: 'SaaS-продукт',
    icon: '💻',
    description: 'AI assistant for SaaS products: onboarding, features, pricing, support',
    descriptionRu: 'AI-ассистент для SaaS: онбординг, функции, цены, поддержка',
    systemPrompt: `You are a helpful AI assistant for a SaaS product. Help users with:
- Product features and capabilities
- Pricing plans and comparisons
- Getting started / onboarding
- Technical support and troubleshooting
- Integration and API questions
Be clear, concise, and technical when needed. Link to docs when relevant.`,
    greeting: 'Hi! How can I help you with our product today?',
    greetingRu: 'Привет! Чем могу помочь с нашим продуктом?',
    quickReplies: ['Features', 'Pricing', 'Get started', 'Support'],
    quickRepliesRu: ['Возможности', 'Цены', 'Начать работу', 'Поддержка'],
    temperature: 0.5,
    knowledgeTopics: ['features', 'pricing', 'docs', 'api', 'integrations', 'faq', 'changelog'],
    personas: [
      {
        name: 'Sales',
        role: 'sales',
        tone: 'professional',
        systemPromptOverlay: 'Focus on product value, ROI, and competitive advantages. Guide toward trial or purchase.',
      },
      {
        name: 'Support',
        role: 'support',
        tone: 'friendly',
        systemPromptOverlay: 'Help with technical issues. Be patient and thorough with debugging steps.',
      },
    ],
    recommendedIntegrations: ['stripe', 'hubspot', 'slack'],
    colorScheme: { primary: '#7C3AED', secondary: '#5B21B6', accent: '#C4B5FD' },
    proactiveTriggers: [
      { trigger: 'page_load', message: 'Need help getting started? I can walk you through it!', delaySeconds: 8 },
    ],
    sortOrder: 6,
  },
];

export async function seedIndustryTemplates(): Promise<number> {
  await connectDB();

  let seeded = 0;
  for (const template of TEMPLATES) {
    const existing = await IndustryTemplate.findOne({ slug: template.slug });
    if (!existing) {
      await IndustryTemplate.create({ ...template, isActive: true });
      seeded++;
    }
  }

  return seeded;
}
