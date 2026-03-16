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
    description: 'Get started with AI chat',
    monthlyPrice: 0,
    annualPrice: 0,
    features: ['1 AI Chat widget', '100 messages/month', 'Web channel only', 'Basic analytics', 'Community support'],
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
    description: 'For small businesses',
    monthlyPrice: 29,
    annualPrice: 24,
    features: [
      '3 widgets (Chat + FAQ + Form)',
      '1,000 messages/month',
      'Web + Telegram',
      '3 preset integrations',
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
    description: 'For growing teams',
    monthlyPrice: 79,
    annualPrice: 66,
    popular: true,
    features: [
      'Unlimited widgets (all types)',
      'Unlimited messages',
      'All channels',
      'All preset integrations + webhooks',
      '5 team members',
      '2 concurrent A/B tests',
      'Advanced analytics',
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
    description: 'For agencies & enterprises',
    monthlyPrice: 299,
    annualPrice: 249,
    features: [
      'Unlimited widgets (all types)',
      'Unlimited messages',
      'All channels + custom',
      'All integrations + Agent-built custom API',
      'Unlimited team members',
      'Unlimited A/B tests',
      'Full white-label',
      'Custom domain',
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
    { feature: 'Channels', free: 'Web', starter: 'Web + Telegram', pro: 'All', enterprise: 'All + custom' },
    {
      feature: 'Integrations',
      free: false,
      starter: '3 preset',
      pro: 'All preset + webhooks',
      enterprise: 'All + Agent-built',
    },
    { feature: 'A/B Testing', free: false, starter: false, pro: '2 concurrent', enterprise: 'Unlimited' },
    { feature: 'Analytics', free: 'Basic', starter: 'Standard', pro: 'Advanced', enterprise: 'Advanced + export' },
    { feature: 'Team seats', free: '1', starter: '2', pro: '5', enterprise: 'Unlimited' },
    { feature: 'White-label', free: false, starter: false, pro: false, enterprise: true },
    { feature: 'Custom domain', free: false, starter: false, pro: false, enterprise: true },
    {
      feature: 'Marketplace',
      free: 'Use only',
      starter: 'Use + publish',
      pro: 'Use + publish',
      enterprise: 'Use + publish',
    },
    { feature: 'Support', free: 'Community', starter: 'Email', pro: 'Priority', enterprise: 'Dedicated manager' },
    { feature: 'SLA', free: false, starter: false, pro: false, enterprise: '99.9%' },
  ];
}
