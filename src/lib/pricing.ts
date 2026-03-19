export type PricingPlanId = 'free' | 'starter' | 'pro' | 'enterprise';

export interface PricingPlan {
  id: PricingPlanId;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  popular?: boolean;
  features: string[];
  limits: {
    widgets: string;
    messages: string;
    teamMembers: string;
    channels: string;
  };
  cta: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Try AI chat on your website',
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      '1 AI Chat widget',
      '100 messages/month',
      'AI Builder access',
      'Web channel only',
      'Basic sentiment analysis',
      'Community support',
    ],
    limits: {
      widgets: '1',
      messages: '100/mo',
      teamMembers: '1',
      channels: 'Web only',
    },
    cta: 'Get Started Free',
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'For small businesses ready to automate',
    monthlyPrice: 29,
    annualPrice: 24,
    features: [
      '3 widgets (Chat + FAQ + Form)',
      '1,000 messages/month',
      'Web + Telegram channels',
      'Customer memory & profiles',
      'Emotion AI & sentiment tracking',
      'HubSpot CRM integration',
      'Revenue tracking & lead capture',
      '2 team members',
      'Email support',
    ],
    limits: {
      widgets: '3',
      messages: '1,000/mo',
      teamMembers: '2',
      channels: 'Web + Telegram',
    },
    cta: 'Start Free Trial',
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For growing teams that need full power',
    monthlyPrice: 79,
    annualPrice: 66,
    popular: true,
    features: [
      'Unlimited widgets (all types)',
      'Unlimited messages',
      'All channels (Web, Telegram, WhatsApp, Instagram)',
      'All CRM integrations + webhooks',
      'Conversation intelligence & buying signals',
      'Auto-learning from feedback',
      'Agent personas (sales, support, billing)',
      'Industry templates',
      '2 concurrent A/B tests',
      'Revenue funnel analytics',
      '5 team members',
      'Priority support',
    ],
    limits: {
      widgets: 'Unlimited',
      messages: 'Unlimited',
      teamMembers: '5',
      channels: 'All channels',
    },
    cta: 'Start Free Trial',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For agencies & large teams',
    monthlyPrice: 299,
    annualPrice: 249,
    features: [
      'Everything in Pro, plus:',
      'Agent-built custom API (Gemini function calling)',
      'Unlimited A/B tests',
      'Omnichannel inbox (unified threads)',
      'Custom channel integrations',
      'Churn risk & competitor tracking',
      'Advanced revenue attribution',
      'Unlimited team members',
      'White-label (coming soon)',
      'Custom domain (coming soon)',
      'Dedicated account manager',
      '99.9% SLA',
    ],
    limits: {
      widgets: 'Unlimited',
      messages: 'Unlimited',
      teamMembers: 'Unlimited',
      channels: 'All + custom',
    },
    cta: 'Contact Sales',
  },
];

export function getPlanById(id: PricingPlanId): PricingPlan | null {
  return PRICING_PLANS.find((p) => p.id === id) || null;
}

export interface FeatureRow {
  feature: string;
  free: string | boolean;
  starter: string | boolean;
  pro: string | boolean;
  enterprise: string | boolean;
}

export function getFeatureComparison(): FeatureRow[] {
  return [
    { feature: 'Widgets', free: '1', starter: '3', pro: 'Unlimited', enterprise: 'Unlimited' },
    {
      feature: 'Widget types',
      free: 'AI Chat',
      starter: 'Chat + FAQ + Form',
      pro: 'All types',
      enterprise: 'All types',
    },
    { feature: 'Messages', free: '100/mo', starter: '1,000/mo', pro: 'Unlimited', enterprise: 'Unlimited' },
    {
      feature: 'Channels',
      free: 'Web',
      starter: 'Web + Telegram',
      pro: 'All (4 channels)',
      enterprise: 'All + custom',
    },
    {
      feature: 'CRM integrations',
      free: false,
      starter: 'HubSpot',
      pro: 'All CRM + webhooks',
      enterprise: 'All + Agent-built API',
    },
    { feature: 'Customer memory', free: false, starter: true, pro: true, enterprise: true },
    { feature: 'Emotion AI', free: 'Basic', starter: true, pro: true, enterprise: true },
    { feature: 'Conversation intelligence', free: false, starter: false, pro: true, enterprise: true },
    { feature: 'Auto-learning', free: false, starter: false, pro: true, enterprise: true },
    { feature: 'Agent personas', free: false, starter: false, pro: true, enterprise: true },
    { feature: 'Revenue tracking', free: false, starter: true, pro: 'Full funnel', enterprise: 'Full + attribution' },
    { feature: 'A/B Testing', free: false, starter: false, pro: '2 concurrent', enterprise: 'Unlimited' },
    { feature: 'Omnichannel inbox', free: false, starter: false, pro: false, enterprise: true },
    { feature: 'Industry templates', free: false, starter: false, pro: true, enterprise: true },
    { feature: 'Team seats', free: '1', starter: '2', pro: '5', enterprise: 'Unlimited' },
    { feature: 'White-label', free: false, starter: false, pro: false, enterprise: 'Coming soon' },
    { feature: 'Custom domain', free: false, starter: false, pro: false, enterprise: 'Coming soon' },
    { feature: 'Support', free: 'Community', starter: 'Email', pro: 'Priority', enterprise: 'Dedicated manager' },
    { feature: 'SLA', free: false, starter: false, pro: false, enterprise: '99.9%' },
  ];
}
