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
    description: 'Try AI chat on your website — forever free',
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      '1 AI Chat widget',
      '100 messages/month',
      '30-second setup from URL',
      'AI knowledge base training',
      'Web channel',
      'Basic analytics & sentiment',
      'Lead capture',
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
    description: 'For small businesses ready to automate sales',
    monthlyPrice: 29,
    annualPrice: 24,
    features: [
      '3 widgets (Chat + FAQ + Form)',
      '1,000 messages/month',
      'Web + Telegram channels',
      'Customer memory & profiles',
      'Emotion AI & sentiment tracking',
      'HubSpot CRM integration',
      'Google Sheets sync',
      'Revenue tracking & lead scoring',
      'Custom branding & colors',
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
    description: 'Full AI power with omnichannel and intelligence',
    monthlyPrice: 79,
    annualPrice: 66,
    popular: true,
    features: [
      'Unlimited widgets (all types)',
      'Unlimited messages',
      'All channels (Web, Telegram, WhatsApp, Instagram)',
      'All CRM integrations + webhooks',
      'AI agent personas (Sales, Support, Booking)',
      'Conversation intelligence & buying signals',
      'Auto-learning from feedback',
      'Multi-model AI (Gemini + Claude fallback)',
      'A/B testing (2 concurrent)',
      'Revenue funnel analytics',
      'Industry templates',
      'API access',
      'Custom branding',
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
    description: 'For agencies, resellers, and large organizations',
    monthlyPrice: 299,
    annualPrice: 249,
    features: [
      'Everything in Pro, plus:',
      'Enterprise SSO (SAML 2.0 / OIDC)',
      'Multi-agent orchestration (Sales → Support → Billing)',
      'Real-time voice AI agent (WebRTC)',
      'AI Training Studio (upload ideal conversations)',
      'Auto-evolving knowledge (weekly re-crawl)',
      'Conversation intelligence dashboard',
      'Advanced analytics (funnels, cohorts, churn prediction)',
      'White-label branding (remove WinBix)',
      'Custom domain + auto-SSL',
      'Reseller program with sub-accounts',
      'Omnichannel inbox (unified threads)',
      'Unlimited A/B tests',
      'Custom channel integrations',
      'Unlimited team members',
      'Dedicated account manager',
      '99.9% SLA guarantee',
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
    { feature: '30-second URL setup', free: true, starter: true, pro: true, enterprise: true },
    { feature: 'AI knowledge base', free: true, starter: true, pro: true, enterprise: true },
    { feature: 'Lead capture', free: true, starter: true, pro: true, enterprise: true },
    { feature: 'Custom branding', free: false, starter: true, pro: true, enterprise: true },
    {
      feature: 'CRM integrations',
      free: false,
      starter: 'HubSpot + Sheets',
      pro: 'All CRM + webhooks',
      enterprise: 'All + custom API',
    },
    { feature: 'Customer memory', free: false, starter: true, pro: true, enterprise: true },
    { feature: 'Emotion AI & sentiment', free: 'Basic', starter: true, pro: true, enterprise: true },
    { feature: 'AI agent personas', free: false, starter: false, pro: true, enterprise: true },
    { feature: 'Multi-model AI fallback', free: false, starter: false, pro: true, enterprise: true },
    { feature: 'Conversation intelligence', free: false, starter: false, pro: true, enterprise: true },
    { feature: 'Auto-learning', free: false, starter: false, pro: true, enterprise: true },
    {
      feature: 'Revenue tracking',
      free: false,
      starter: 'Basic',
      pro: 'Full funnel',
      enterprise: 'Full + attribution',
    },
    { feature: 'A/B Testing', free: false, starter: false, pro: '2 concurrent', enterprise: 'Unlimited' },
    { feature: 'API access', free: false, starter: false, pro: true, enterprise: true },
    { feature: 'Industry templates', free: false, starter: false, pro: true, enterprise: true },
    { feature: 'Enterprise SSO (SAML/OIDC)', free: false, starter: false, pro: false, enterprise: true },
    { feature: 'Multi-agent orchestration', free: false, starter: false, pro: false, enterprise: true },
    { feature: 'Voice AI agent', free: false, starter: false, pro: false, enterprise: true },
    { feature: 'AI Training Studio', free: false, starter: false, pro: false, enterprise: true },
    { feature: 'Auto-evolving knowledge', free: false, starter: false, pro: false, enterprise: true },
    { feature: 'White-label', free: false, starter: false, pro: false, enterprise: true },
    { feature: 'Custom domain + SSL', free: false, starter: false, pro: false, enterprise: true },
    { feature: 'Reseller program', free: false, starter: false, pro: false, enterprise: true },
    { feature: 'Omnichannel inbox', free: false, starter: false, pro: false, enterprise: true },
    { feature: 'Team seats', free: '1', starter: '2', pro: '5', enterprise: 'Unlimited' },
    { feature: 'Support', free: 'Community', starter: 'Email', pro: 'Priority', enterprise: 'Dedicated manager' },
    { feature: 'SLA', free: false, starter: false, pro: false, enterprise: '99.9%' },
  ];
}
