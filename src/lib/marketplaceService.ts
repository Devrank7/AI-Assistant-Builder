import connectDB from './mongodb';
import PremiumMarketplaceTemplate, {
  IPremiumMarketplaceTemplate,
  TemplateCategory,
  PricingType,
} from '@/models/PremiumMarketplaceTemplate';
import MarketplacePurchase from '@/models/MarketplacePurchase';
import { nanoid } from 'nanoid';

// ─── Seed Data ─────────────────────────────────────────────────────────────────

const DEFAULT_TEMPLATES: Omit<
  IPremiumMarketplaceTemplate,
  keyof import('mongoose').Document | 'createdAt' | 'updatedAt'
>[] = [
  // ── Widget Themes ──────────────────────────────────────────────────────────
  {
    templateId: 'theme-dark-elite',
    name: 'Dark Elite',
    description: 'Sophisticated dark glassmorphism widget with neon accents for premium brands.',
    longDescription:
      'Dark Elite transforms your chat widget into a premium experience. Featuring deep obsidian backgrounds, subtle glassmorphism panels, and electric blue neon accents, this theme communicates luxury and cutting-edge technology. Perfect for SaaS platforms, crypto projects, and high-end tech brands seeking to make an unforgettable first impression.',
    category: 'widget_theme',
    author: { userId: 'system', name: 'WinBix Team', avatar: '/avatars/winbix.png' },
    version: '2.1.0',
    pricing: { type: 'one_time', price: 29, currency: 'USD' },
    config: {
      primaryColor: '#00d4ff',
      secondaryColor: '#7c3aed',
      backgroundColor: '#0a0a0f',
      surfaceColor: 'rgba(255,255,255,0.04)',
      borderColor: 'rgba(255,255,255,0.08)',
      textColor: '#ffffff',
      fontFamily: 'Inter, sans-serif',
      borderRadius: '16px',
      shadow: '0 8px 32px rgba(0,212,255,0.15)',
      glassEffect: true,
      neonGlow: true,
    },
    previewImages: [
      'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=800&q=80',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
    ],
    tags: ['dark', 'premium', 'glassmorphism', 'neon', 'saas', 'tech'],
    stats: { purchases: 847, rating: 4.9, reviewCount: 124, activeInstalls: 712 },
    reviews: [
      {
        userId: 'user1',
        userName: 'Alex Chen',
        rating: 5,
        comment: 'Absolutely stunning. Customers are blown away by the design.',
        createdAt: new Date('2024-12-15'),
      },
      {
        userId: 'user2',
        userName: 'Sarah Kim',
        rating: 5,
        comment: 'Best widget theme on the marketplace. Zero config needed.',
        createdAt: new Date('2024-12-20'),
      },
    ],
    compatibility: { minPlan: 'starter', platforms: ['web', 'mobile'] },
    isPublished: true,
    isFeatured: true,
    isVerified: true,
  },
  {
    templateId: 'theme-neon-glow',
    name: 'Neon Glow',
    description: 'Vibrant cyberpunk-inspired theme with animated neon gradients and pulse effects.',
    longDescription:
      'Neon Glow brings the energy of a cyberpunk cityscape to your chat widget. Dynamic color transitions shift from electric purple to hot pink, with animated pulse rings and particle effects on messages. Your website visitors will immediately engage—this theme turns your support widget into a conversation starter.',
    category: 'widget_theme',
    author: { userId: 'system', name: 'WinBix Team', avatar: '/avatars/winbix.png' },
    version: '1.4.0',
    pricing: { type: 'one_time', price: 24, currency: 'USD' },
    config: {
      primaryColor: '#ff00ff',
      secondaryColor: '#00ffff',
      backgroundColor: '#0d001a',
      gradientStart: '#ff00ff',
      gradientEnd: '#00ffff',
      animatedGradient: true,
      pulseEffect: true,
      particleMessages: true,
      glowIntensity: 'high',
    },
    previewImages: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80'],
    tags: ['neon', 'cyberpunk', 'animated', 'vibrant', 'gaming', 'entertainment'],
    stats: { purchases: 523, rating: 4.7, reviewCount: 89, activeInstalls: 445 },
    reviews: [
      {
        userId: 'user3',
        userName: 'Marcus Johnson',
        rating: 5,
        comment: 'My gaming community loves it. Engagement went up 40%.',
        createdAt: new Date('2024-11-28'),
      },
    ],
    compatibility: { minPlan: 'starter', platforms: ['web'] },
    isPublished: true,
    isFeatured: false,
    isVerified: true,
  },
  {
    templateId: 'theme-corporate-blue',
    name: 'Corporate Blue',
    description: 'Clean, professional enterprise theme projecting trust and credibility.',
    longDescription:
      'Corporate Blue is the go-to theme for businesses that need to project authority and trustworthiness. The crisp white interface with deep navy accents and subtle shadow layering creates a widget that feels native to enterprise-grade platforms. Includes professionally crafted typography, structured conversation layouts, and a formal tone configuration preset.',
    category: 'widget_theme',
    author: { userId: 'system', name: 'WinBix Team', avatar: '/avatars/winbix.png' },
    version: '3.0.1',
    pricing: { type: 'free', price: 0, currency: 'USD' },
    config: {
      primaryColor: '#1e3a8a',
      secondaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      surfaceColor: '#f8fafc',
      borderColor: '#e2e8f0',
      textColor: '#1e293b',
      fontFamily: 'Inter, system-ui, sans-serif',
      borderRadius: '8px',
      professionalMode: true,
    },
    previewImages: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80'],
    tags: ['corporate', 'professional', 'blue', 'enterprise', 'clean', 'trust'],
    stats: { purchases: 2341, rating: 4.6, reviewCount: 312, activeInstalls: 2100 },
    reviews: [
      {
        userId: 'user4',
        userName: 'Jennifer Walsh',
        rating: 5,
        comment: 'Exactly what we needed for our financial services firm.',
        createdAt: new Date('2024-10-10'),
      },
    ],
    compatibility: { minPlan: 'free', platforms: ['web', 'mobile', 'tablet'] },
    isPublished: true,
    isFeatured: false,
    isVerified: true,
  },
  {
    templateId: 'theme-minimal-white',
    name: 'Minimal White',
    description: 'Ultra-clean minimalist design that blends seamlessly with any website.',
    longDescription:
      'Minimal White follows the less-is-more philosophy. Razor-thin borders, generous whitespace, and a muted color palette make this widget feel like it was always part of your site. A favorite among design agencies, portfolio sites, and brands that value aesthetic purity over flashy effects.',
    category: 'widget_theme',
    author: { userId: 'system', name: 'WinBix Team', avatar: '/avatars/winbix.png' },
    version: '2.0.0',
    pricing: { type: 'free', price: 0, currency: 'USD' },
    config: {
      primaryColor: '#18181b',
      secondaryColor: '#71717a',
      backgroundColor: '#ffffff',
      surfaceColor: '#fafafa',
      borderColor: '#e4e4e7',
      textColor: '#18181b',
      fontFamily: 'Geist, Inter, sans-serif',
      borderRadius: '12px',
      ultraMinimal: true,
    },
    previewImages: ['https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80'],
    tags: ['minimal', 'white', 'clean', 'elegant', 'portfolio', 'agency'],
    stats: { purchases: 1876, rating: 4.8, reviewCount: 267, activeInstalls: 1650 },
    reviews: [],
    compatibility: { minPlan: 'free', platforms: ['web', 'mobile'] },
    isPublished: true,
    isFeatured: false,
    isVerified: true,
  },
  {
    templateId: 'theme-gradient-sunset',
    name: 'Gradient Sunset',
    description: 'Warm amber-to-rose gradient theme that evokes energy and warmth.',
    longDescription:
      'Gradient Sunset wraps your chat widget in a warm spectrum of amber, orange, and rose—the digital equivalent of a perfect evening sky. The flowing gradient background, warm typography, and smooth transition animations create an inviting atmosphere that encourages visitors to reach out. Ideal for lifestyle brands, health & wellness, and creative businesses.',
    category: 'widget_theme',
    author: { userId: 'system', name: 'WinBix Team', avatar: '/avatars/winbix.png' },
    version: '1.2.0',
    pricing: { type: 'one_time', price: 19, currency: 'USD' },
    config: {
      primaryColor: '#f59e0b',
      secondaryColor: '#ec4899',
      gradientStart: '#f59e0b',
      gradientMid: '#f97316',
      gradientEnd: '#ec4899',
      backgroundColor: '#0c0a09',
      warmMode: true,
      animatedBackground: true,
    },
    previewImages: ['https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=800&q=80'],
    tags: ['gradient', 'warm', 'lifestyle', 'health', 'beauty', 'creative'],
    stats: { purchases: 634, rating: 4.7, reviewCount: 98, activeInstalls: 560 },
    reviews: [],
    compatibility: { minPlan: 'starter', platforms: ['web', 'mobile'] },
    isPublished: true,
    isFeatured: true,
    isVerified: true,
  },

  // ── Flow Templates ─────────────────────────────────────────────────────────
  {
    templateId: 'flow-lead-qualification',
    name: 'Lead Qualification Flow',
    description: 'Automated 7-step lead scoring flow that qualifies and routes high-value prospects.',
    longDescription:
      'This enterprise-grade lead qualification flow captures, scores, and routes leads without any manual intervention. It asks the right questions in the right order—company size, budget, timeline, decision-making authority—and routes hot leads directly to your sales calendar, warm leads to a nurture sequence, and cold leads to self-serve resources. Includes BANT framework scoring and CRM-ready data capture.',
    category: 'flow_template',
    author: { userId: 'system', name: 'WinBix Team', avatar: '/avatars/winbix.png' },
    version: '4.0.0',
    pricing: { type: 'one_time', price: 49, currency: 'USD' },
    config: {
      steps: [
        { id: 'greeting', type: 'message', content: 'Hi! I help match you with the right solution.' },
        {
          id: 'company_size',
          type: 'choice',
          question: 'How large is your team?',
          options: ['1-10', '11-50', '51-200', '200+'],
        },
        {
          id: 'budget',
          type: 'choice',
          question: "What's your monthly budget for this?",
          options: ['< $500', '$500-2K', '$2K-10K', '$10K+'],
        },
        {
          id: 'timeline',
          type: 'choice',
          question: 'When do you need this live?',
          options: ['ASAP', 'This month', 'This quarter', 'Exploring'],
        },
        {
          id: 'decision_maker',
          type: 'choice',
          question: 'Are you the decision maker?',
          options: ['Yes', 'Part of the team', 'Need to consult'],
        },
        { id: 'lead_capture', type: 'form', fields: ['name', 'email', 'phone', 'company'] },
        {
          id: 'routing',
          type: 'condition',
          rules: [
            { if: 'score >= 80', action: 'book_meeting' },
            { if: 'score >= 50', action: 'send_case_studies' },
            { if: 'default', action: 'self_serve_resources' },
          ],
        },
      ],
      scoring: {
        company_size: { '200+': 30, '51-200': 20, '11-50': 10, '1-10': 5 },
        budget: { '$10K+': 30, '$2K-10K': 20, '$500-2K': 10, '< $500': 0 },
      },
      integrations: ['calendly', 'hubspot', 'salesforce'],
    },
    previewImages: ['https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80'],
    tags: ['sales', 'leads', 'qualification', 'bant', 'crm', 'automation', 'b2b'],
    stats: { purchases: 1205, rating: 4.9, reviewCount: 187, activeInstalls: 1050 },
    reviews: [
      {
        userId: 'user5',
        userName: 'David Park',
        rating: 5,
        comment: 'Cut our lead qualification time from 2 days to instant. ROI was immediate.',
        createdAt: new Date('2024-12-01'),
      },
    ],
    compatibility: { minPlan: 'pro', platforms: ['web', 'mobile'] },
    isPublished: true,
    isFeatured: true,
    isVerified: true,
  },
  {
    templateId: 'flow-support-ticket',
    name: 'Support Ticket Flow',
    description: 'Intelligent triage flow that categorizes, prioritizes, and routes support requests.',
    longDescription:
      'Eliminate support chaos with this AI-powered triage flow. It automatically categorizes issues (billing, technical, account, general), assesses severity (critical, high, medium, low), attempts AI self-resolution for common issues, and escalates to the right human agent when needed. Integrates with Zendesk, Intercom, and Freshdesk out of the box.',
    category: 'flow_template',
    author: { userId: 'system', name: 'WinBix Team', avatar: '/avatars/winbix.png' },
    version: '3.1.0',
    pricing: { type: 'one_time', price: 39, currency: 'USD' },
    config: {
      categories: ['billing', 'technical', 'account', 'general'],
      severityLevels: ['critical', 'high', 'medium', 'low'],
      autoResolveThreshold: 0.85,
      escalationRules: [
        { category: 'billing', severity: 'critical', route: 'billing_team' },
        { category: 'technical', severity: 'critical', route: 'engineering_oncall' },
      ],
      integrations: ['zendesk', 'intercom', 'freshdesk', 'jira'],
      slaTargets: { critical: 15, high: 60, medium: 240, low: 1440 },
    },
    previewImages: ['https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&q=80'],
    tags: ['support', 'ticketing', 'triage', 'helpdesk', 'zendesk', 'sla'],
    stats: { purchases: 876, rating: 4.8, reviewCount: 143, activeInstalls: 750 },
    reviews: [],
    compatibility: { minPlan: 'pro', platforms: ['web', 'mobile', 'telegram', 'whatsapp'] },
    isPublished: true,
    isFeatured: false,
    isVerified: true,
  },
  {
    templateId: 'flow-appointment-booking',
    name: 'Appointment Booking Flow',
    description: 'Seamless 3-step booking flow with availability check and instant confirmation.',
    longDescription:
      'Convert website visitors into booked appointments in under 60 seconds. This flow handles service selection, real-time availability lookup, and instant booking confirmation—all inside the chat widget. Syncs with Google Calendar, Calendly, and Acuity. Sends automated reminders 24h and 1h before the appointment. Includes rescheduling and cancellation handling.',
    category: 'flow_template',
    author: { userId: 'system', name: 'WinBix Team', avatar: '/avatars/winbix.png' },
    version: '2.5.0',
    pricing: { type: 'one_time', price: 44, currency: 'USD' },
    config: {
      services: ['consultation', 'demo', 'support', 'custom'],
      calendarIntegrations: ['google_calendar', 'calendly', 'acuity'],
      reminderTiming: [1440, 60],
      timezone: 'auto-detect',
      bufferTime: 15,
      maxAdvanceBooking: 30,
    },
    previewImages: ['https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&q=80'],
    tags: ['booking', 'appointments', 'calendar', 'scheduling', 'healthcare', 'beauty', 'consulting'],
    stats: { purchases: 1423, rating: 4.8, reviewCount: 201, activeInstalls: 1280 },
    reviews: [],
    compatibility: { minPlan: 'starter', platforms: ['web', 'mobile'] },
    isPublished: true,
    isFeatured: true,
    isVerified: true,
  },

  // ── Knowledge Packs ────────────────────────────────────────────────────────
  {
    templateId: 'knowledge-ecommerce-faq',
    name: 'E-Commerce FAQ Pack',
    description: '500+ pre-written Q&As covering shipping, returns, payments, and product questions.',
    longDescription:
      'Stop your support team from answering the same questions daily. This pack includes 500+ meticulously crafted Q&A pairs covering every aspect of e-commerce customer service: shipping timelines, return policies, payment methods, size guides, product care, warranty information, and order tracking. Pre-optimized for AI understanding with semantic tagging and entity recognition.',
    category: 'knowledge_pack',
    author: { userId: 'system', name: 'WinBix Team', avatar: '/avatars/winbix.png' },
    version: '1.8.0',
    pricing: { type: 'one_time', price: 34, currency: 'USD' },
    config: {
      qaCount: 512,
      categories: ['shipping', 'returns', 'payments', 'products', 'account', 'promotions'],
      languages: ['en', 'es', 'fr', 'de'],
      lastUpdated: '2024-12-01',
      semanticTags: true,
      entityRecognition: true,
    },
    previewImages: ['https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80'],
    tags: ['ecommerce', 'faq', 'retail', 'shipping', 'returns', 'customer-service'],
    stats: { purchases: 967, rating: 4.7, reviewCount: 156, activeInstalls: 820 },
    reviews: [],
    compatibility: { minPlan: 'starter', platforms: ['web', 'mobile'] },
    isPublished: true,
    isFeatured: false,
    isVerified: true,
  },
  {
    templateId: 'knowledge-saas-onboarding',
    name: 'SaaS Onboarding Pack',
    description: 'Complete onboarding knowledge base for SaaS products with feature explanations and tutorials.',
    longDescription:
      'Reduce time-to-value for your SaaS customers with this comprehensive onboarding knowledge pack. Covers account setup, feature walkthroughs, integration guides, billing FAQ, and troubleshooting for the 50 most common SaaS product patterns. Includes activation checklists, pro tips, and upgrade prompts strategically embedded to drive expansion revenue.',
    category: 'knowledge_pack',
    author: { userId: 'system', name: 'WinBix Team', avatar: '/avatars/winbix.png' },
    version: '2.1.0',
    pricing: { type: 'one_time', price: 39, currency: 'USD' },
    config: {
      qaCount: 380,
      sections: ['setup', 'features', 'integrations', 'billing', 'troubleshooting', 'best_practices'],
      activationChecklistEnabled: true,
      upgradePromptsEnabled: true,
      productPatterns: 50,
    },
    previewImages: ['https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80'],
    tags: ['saas', 'onboarding', 'product', 'tutorials', 'activation', 'b2b'],
    stats: { purchases: 743, rating: 4.8, reviewCount: 112, activeInstalls: 640 },
    reviews: [],
    compatibility: { minPlan: 'pro', platforms: ['web'] },
    isPublished: true,
    isFeatured: false,
    isVerified: true,
  },
  {
    templateId: 'knowledge-restaurant-menu',
    name: 'Restaurant Menu Pack',
    description: 'Dynamic menu knowledge base with allergen info, dietary tags, and upsell suggestions.',
    longDescription:
      'Give your restaurant an AI sommelier and menu expert in one. This pack structures your menu data for AI understanding with allergen information, dietary tags (vegan, gluten-free, halal, etc.), portion sizes, and price points. Includes intelligent upsell flows (wine pairings, add-ons, dessert prompts) and handles reservation requests, hours, and location queries seamlessly.',
    category: 'knowledge_pack',
    author: { userId: 'system', name: 'WinBix Team', avatar: '/avatars/winbix.png' },
    version: '1.5.0',
    pricing: { type: 'one_time', price: 29, currency: 'USD' },
    config: {
      menuSections: ['starters', 'mains', 'desserts', 'drinks', 'specials'],
      allergenTracking: true,
      dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'halal', 'kosher', 'nut-free'],
      upsellEnabled: true,
      reservationIntegration: ['opentable', 'resy', 'custom'],
    },
    previewImages: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80'],
    tags: ['restaurant', 'menu', 'food', 'allergens', 'dietary', 'reservations'],
    stats: { purchases: 445, rating: 4.6, reviewCount: 78, activeInstalls: 390 },
    reviews: [],
    compatibility: { minPlan: 'starter', platforms: ['web', 'mobile', 'whatsapp'] },
    isPublished: true,
    isFeatured: false,
    isVerified: true,
  },

  // ── Prompt Packs ───────────────────────────────────────────────────────────
  {
    templateId: 'prompt-sales-closer',
    name: 'Sales Closer Pack',
    description: '15 proven sales prompts based on Sandler, SPIN, and Challenger methodologies.',
    longDescription:
      'Built from real sales playbooks used by top SaaS companies, this prompt pack equips your AI with 15 proven closing techniques. Includes objection-handling frameworks (price, timing, competitor), discovery question sequences, value proposition articulation, urgency creation, and soft close scripts—all adapted for conversational AI without feeling pushy or scripted.',
    category: 'prompt_pack',
    author: { userId: 'system', name: 'WinBix Team', avatar: '/avatars/winbix.png' },
    version: '3.0.0',
    pricing: { type: 'one_time', price: 59, currency: 'USD' },
    config: {
      promptCount: 15,
      methodologies: ['sandler', 'spin', 'challenger', 'meddic'],
      useCases: ['objection_handling', 'discovery', 'closing', 'upsell', 'reactivation'],
      toneOptions: ['professional', 'friendly', 'consultative'],
      ab_tested: true,
    },
    previewImages: ['https://images.unsplash.com/photo-1556742208-999815fca738?w=800&q=80'],
    tags: ['sales', 'closing', 'objections', 'b2b', 'revenue', 'conversion', 'spin'],
    stats: { purchases: 1567, rating: 4.9, reviewCount: 243, activeInstalls: 1340 },
    reviews: [
      {
        userId: 'user6',
        userName: 'Rachel Torres',
        rating: 5,
        comment: 'Conversion rate went from 8% to 23% in 3 weeks. Unbelievable.',
        createdAt: new Date('2024-11-15'),
      },
    ],
    compatibility: { minPlan: 'pro', platforms: ['web', 'mobile'] },
    isPublished: true,
    isFeatured: true,
    isVerified: true,
  },
  {
    templateId: 'prompt-empathetic-support',
    name: 'Empathetic Support Pack',
    description: 'Human-centered support prompts that de-escalate, empathize, and resolve.',
    longDescription:
      'Customer service is the frontline of brand loyalty. This pack trains your AI to communicate with genuine empathy—acknowledging frustration, validating feelings, taking ownership, and guiding customers to resolution with warmth. Based on research from top-rated support teams at Zappos, Chewy, and Apple. Reduces escalations by an average of 67% in pilot deployments.',
    category: 'prompt_pack',
    author: { userId: 'system', name: 'WinBix Team', avatar: '/avatars/winbix.png' },
    version: '2.2.0',
    pricing: { type: 'one_time', price: 44, currency: 'USD' },
    config: {
      promptCount: 20,
      emotionalTones: ['empathetic', 'reassuring', 'solution-focused', 'apologetic'],
      escalationPrevention: true,
      sentimentDetection: true,
      languageAdaptation: true,
    },
    previewImages: ['https://images.unsplash.com/photo-1521737852567-6949f3f9f2b5?w=800&q=80'],
    tags: ['support', 'empathy', 'customer-service', 'cx', 'retention', 'helpdesk'],
    stats: { purchases: 823, rating: 4.8, reviewCount: 134, activeInstalls: 720 },
    reviews: [],
    compatibility: { minPlan: 'starter', platforms: ['web', 'mobile', 'telegram', 'whatsapp'] },
    isPublished: true,
    isFeatured: false,
    isVerified: true,
  },
  {
    templateId: 'prompt-multilingual',
    name: 'Multilingual Pack',
    description: 'Auto-detect and respond in 28 languages with culturally-aware prompt engineering.',
    longDescription:
      "Go global without hiring multilingual agents. This pack enables your AI to automatically detect the visitor's language and respond natively in 28 languages, with culturally-appropriate communication styles. Includes formal/informal register switching, regional idiom adaptation, RTL language support (Arabic, Hebrew), and currency/date format localization.",
    category: 'prompt_pack',
    author: { userId: 'system', name: 'WinBix Team', avatar: '/avatars/winbix.png' },
    version: '1.9.0',
    pricing: { type: 'subscription', price: 19, currency: 'USD' },
    config: {
      languages: 28,
      autoDetection: true,
      rtlSupport: true,
      culturalAdaptation: true,
      formalityLevels: ['formal', 'neutral', 'casual'],
      localization: ['currency', 'date', 'time', 'number_format'],
    },
    previewImages: ['https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80'],
    tags: ['multilingual', 'international', 'localization', 'global', 'translation', 'rtl'],
    stats: { purchases: 934, rating: 4.7, reviewCount: 156, activeInstalls: 810 },
    reviews: [],
    compatibility: { minPlan: 'pro', platforms: ['web', 'mobile', 'telegram', 'whatsapp', 'instagram'] },
    isPublished: true,
    isFeatured: false,
    isVerified: true,
  },

  // ── Integration Bundles ────────────────────────────────────────────────────
  {
    templateId: 'bundle-crm-starter',
    name: 'CRM Starter Kit',
    description: 'Pre-configured integrations for HubSpot, Salesforce, and Pipedrive with bi-directional sync.',
    longDescription:
      'Your AI widget and your CRM should work as one. This bundle pre-configures bi-directional data sync between your WinBix widget and the three most popular CRMs. Every conversation creates/updates a contact, every lead is scored and tagged, and every booking is logged with the full conversation transcript. Includes field mapping templates, trigger rules, and a data quality validation layer.',
    category: 'integration_bundle',
    author: { userId: 'system', name: 'WinBix Team', avatar: '/avatars/winbix.png' },
    version: '5.0.0',
    pricing: { type: 'one_time', price: 79, currency: 'USD' },
    config: {
      crms: ['hubspot', 'salesforce', 'pipedrive'],
      syncMode: 'bidirectional',
      fieldMappings: 47,
      triggerRules: 12,
      dataValidation: true,
      conversationTranscripts: true,
      leadScoring: true,
    },
    previewImages: ['https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800&q=80'],
    tags: ['crm', 'hubspot', 'salesforce', 'pipedrive', 'integration', 'sync', 'b2b'],
    stats: { purchases: 1892, rating: 4.9, reviewCount: 287, activeInstalls: 1650 },
    reviews: [
      {
        userId: 'user7',
        userName: 'Thomas Mitchell',
        rating: 5,
        comment: 'Set up in 20 minutes. Now every chat automatically creates HubSpot deals.',
        createdAt: new Date('2024-12-10'),
      },
    ],
    compatibility: { minPlan: 'pro', platforms: ['web'] },
    isPublished: true,
    isFeatured: true,
    isVerified: true,
  },
  {
    templateId: 'bundle-analytics-suite',
    name: 'Analytics Suite',
    description: 'Deep analytics integrations: GA4, Mixpanel, Segment, and custom event tracking.',
    longDescription:
      'Turn every chat interaction into actionable product intelligence. This bundle connects your widget to GA4, Mixpanel, Segment, and Amplitude, pushing rich event data for every conversation milestone: widget opened, message sent, lead captured, appointment booked, handoff requested. Includes a pre-built Looker Studio dashboard and Mixpanel funnel templates.',
    category: 'integration_bundle',
    author: { userId: 'system', name: 'WinBix Team', avatar: '/avatars/winbix.png' },
    version: '2.3.0',
    pricing: { type: 'one_time', price: 64, currency: 'USD' },
    config: {
      platforms: ['google_analytics_4', 'mixpanel', 'segment', 'amplitude'],
      events: 34,
      customDimensions: 12,
      lookerDashboard: true,
      mixpanelFunnels: 8,
      dataLayerSupport: true,
    },
    previewImages: ['https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80'],
    tags: ['analytics', 'ga4', 'mixpanel', 'segment', 'data', 'insights', 'tracking'],
    stats: { purchases: 712, rating: 4.7, reviewCount: 108, activeInstalls: 620 },
    reviews: [],
    compatibility: { minPlan: 'pro', platforms: ['web'] },
    isPublished: true,
    isFeatured: false,
    isVerified: true,
  },
];

// ─── Service Functions ──────────────────────────────────────────────────────

export async function seedDefaultTemplates(): Promise<void> {
  await connectDB();
  const count = await PremiumMarketplaceTemplate.countDocuments();
  if (count > 0) return;

  await PremiumMarketplaceTemplate.insertMany(DEFAULT_TEMPLATES);
  console.log(`[MarketplaceService] Seeded ${DEFAULT_TEMPLATES.length} default templates`);
}

export interface ListFilters {
  search?: string;
  category?: TemplateCategory;
  pricing?: 'free' | 'paid' | 'subscription' | 'all';
  sort?: 'popular' | 'newest' | 'rating' | 'price_asc' | 'price_desc';
  page?: number;
  limit?: number;
}

export async function listTemplates(filters: ListFilters = {}) {
  await connectDB();
  await seedDefaultTemplates();

  const query: Record<string, unknown> = { isPublished: true };

  if (filters.category) query.category = filters.category;

  if (filters.pricing === 'free') {
    query['pricing.type'] = 'free';
  } else if (filters.pricing === 'paid') {
    query['pricing.type'] = 'one_time';
  } else if (filters.pricing === 'subscription') {
    query['pricing.type'] = 'subscription';
  }

  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  let sortObj: Record<string, 1 | -1> = { 'stats.purchases': -1 };
  switch (filters.sort) {
    case 'newest':
      sortObj = { createdAt: -1 };
      break;
    case 'rating':
      sortObj = { 'stats.rating': -1 };
      break;
    case 'price_asc':
      sortObj = { 'pricing.price': 1 };
      break;
    case 'price_desc':
      sortObj = { 'pricing.price': -1 };
      break;
  }

  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 20, 50);
  const skip = (page - 1) * limit;

  const [templates, total] = await Promise.all([
    PremiumMarketplaceTemplate.find(query).sort(sortObj).skip(skip).limit(limit).lean(),
    PremiumMarketplaceTemplate.countDocuments(query),
  ]);

  return { templates, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getTemplateById(id: string) {
  await connectDB();
  // Try templateId first, then _id
  const template =
    (await PremiumMarketplaceTemplate.findOne({ templateId: id }).lean()) ||
    (await PremiumMarketplaceTemplate.findById(id)
      .lean()
      .catch(() => null));
  return template;
}

export async function purchaseTemplate(templateId: string, userId: string) {
  await connectDB();

  const template = await PremiumMarketplaceTemplate.findOne({ templateId }).lean();
  if (!template) throw new Error('Template not found');
  if (!template.isPublished) throw new Error('Template not available');

  // Check duplicate purchase
  const existing = await MarketplacePurchase.findOne({ buyerId: userId, templateId }).lean();
  if (existing) throw new Error('Already purchased');

  const price = template.pricing.price;
  const authorEarnings = Math.round(price * 0.7 * 100) / 100;
  const platformFee = price - authorEarnings;

  const purchase = await MarketplacePurchase.create({
    buyerId: userId,
    templateId,
    authorId: template.author.userId,
    price,
    currency: template.pricing.currency,
    authorEarnings,
    platformFee,
    status: 'completed',
  });

  // Increment stats
  await PremiumMarketplaceTemplate.updateOne(
    { templateId },
    { $inc: { 'stats.purchases': 1, 'stats.activeInstalls': 1 } }
  );

  return { purchase, template };
}

export async function installTemplate(templateId: string, userId: string, clientId: string) {
  await connectDB();

  const template = await PremiumMarketplaceTemplate.findOne({ templateId }).lean();
  if (!template) throw new Error('Template not found');

  // Verify ownership (free templates can be installed without purchase)
  if (template.pricing.type !== 'free') {
    const purchase = await MarketplacePurchase.findOne({ buyerId: userId, templateId }).lean();
    if (!purchase) throw new Error('Template not purchased');

    await MarketplacePurchase.updateOne(
      { buyerId: userId, templateId },
      { isInstalled: true, installedClientId: clientId, installedAt: new Date() }
    );
  }

  return { template, config: template.config };
}

export async function submitTemplate(
  userId: string,
  data: {
    name: string;
    description: string;
    longDescription?: string;
    category: TemplateCategory;
    authorName: string;
    pricing?: { type: PricingType; price: number };
    tags?: string[];
    config?: Record<string, unknown>;
  }
) {
  await connectDB();

  const templateId = `user-${nanoid(10)}`;
  const template = await PremiumMarketplaceTemplate.create({
    templateId,
    name: data.name,
    description: data.description,
    longDescription: data.longDescription || '',
    category: data.category,
    author: { userId, name: data.authorName },
    pricing: data.pricing || { type: 'free', price: 0, currency: 'USD' },
    tags: data.tags || [],
    config: data.config || {},
    isPublished: false,
    isFeatured: false,
    isVerified: false,
  });

  return template;
}

export async function reviewTemplate(
  templateId: string,
  userId: string,
  userName: string,
  rating: number,
  comment: string
) {
  await connectDB();

  const template = await PremiumMarketplaceTemplate.findOne({ templateId });
  if (!template) throw new Error('Template not found');

  // Prevent duplicate reviews
  const existingReview = template.reviews.find((r) => r.userId === userId);
  if (existingReview) throw new Error('Already reviewed');

  template.reviews.push({ userId, userName, rating, comment, createdAt: new Date() });

  // Recalculate average rating
  const totalRating = template.reviews.reduce((sum, r) => sum + r.rating, 0);
  template.stats.rating = Math.round((totalRating / template.reviews.length) * 10) / 10;
  template.stats.reviewCount = template.reviews.length;

  await template.save();
  return template;
}

export async function getUserPurchases(userId: string) {
  await connectDB();

  const purchases = await MarketplacePurchase.find({ buyerId: userId, status: 'completed' })
    .sort({ createdAt: -1 })
    .lean();

  const templateIds = purchases.map((p) => p.templateId);
  const templates = await PremiumMarketplaceTemplate.find({
    templateId: { $in: templateIds },
  }).lean();

  const templateMap = new Map(templates.map((t) => [t.templateId, t]));

  return purchases.map((p) => ({
    purchase: p,
    template: templateMap.get(p.templateId) || null,
  }));
}

export async function getSellerStats(userId: string) {
  await connectDB();

  const myTemplates = await PremiumMarketplaceTemplate.find({ 'author.userId': userId }).lean();
  const templateIds = myTemplates.map((t) => t.templateId);

  const purchases = await MarketplacePurchase.find({
    templateId: { $in: templateIds },
    status: 'completed',
  }).lean();

  const totalEarnings = purchases.reduce((sum, p) => sum + p.authorEarnings, 0);
  const totalSales = purchases.length;
  const avgRating =
    myTemplates.length > 0 ? myTemplates.reduce((sum, t) => sum + t.stats.rating, 0) / myTemplates.length : 0;

  return {
    totalEarnings,
    totalSales,
    avgRating: Math.round(avgRating * 10) / 10,
    templates: myTemplates.map((t) => ({
      ...t,
      salesCount: purchases.filter((p) => p.templateId === t.templateId).length,
      revenue: purchases.filter((p) => p.templateId === t.templateId).reduce((sum, p) => sum + p.authorEarnings, 0),
    })),
  };
}
