import { sendEmail } from '@/lib/notifications';

export interface SequenceEmail {
  id: string;
  day: number; // days after signup
  subject: string;
  heading: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  condition?: (user: SequenceUser) => boolean;
}

export interface SequenceUser {
  _id: string;
  email: string;
  name: string;
  createdAt: Date;
  onboardingCompleted: boolean;
  plan: string;
  emailSequencesSent: string[];
}

export const ONBOARDING_SEQUENCE: SequenceEmail[] = [
  {
    id: 'onboarding_day0',
    day: 0,
    subject: 'Welcome to WinBix AI — Your first widget awaits',
    heading: 'Welcome, {{name}}!',
    body: 'You just joined 500+ businesses using AI to engage customers. Your dashboard is ready — create your first widget in under 3 minutes.',
    ctaText: 'Create Your Widget',
    ctaUrl: '/dashboard',
  },
  {
    id: 'onboarding_day1',
    day: 1,
    subject: 'Quick start: embed your widget in 30 seconds',
    heading: 'Ready to go live?',
    body: 'Copy one line of code and paste it into your website. Your AI assistant will be live instantly.',
    ctaText: 'Get Embed Code',
    ctaUrl: '/dashboard/installation',
    condition: (u) => !u.onboardingCompleted,
  },
  {
    id: 'onboarding_day3',
    day: 3,
    subject: 'Your widget is waiting for its first conversation',
    heading: 'Test your widget',
    body: 'Open your website and start a test conversation. See how your AI responds to real questions.',
    ctaText: 'Open Dashboard',
    ctaUrl: '/dashboard/chats',
    condition: (u) => !u.onboardingCompleted,
  },
  {
    id: 'onboarding_day7',
    day: 7,
    subject: 'Your Week 1 report is ready',
    heading: 'Week 1 at WinBix AI',
    body: 'Check your analytics to see how your widget performed this week. See conversations, leads, and engagement metrics.',
    ctaText: 'View Analytics',
    ctaUrl: '/dashboard/analytics',
  },
  {
    id: 'onboarding_day10',
    day: 10,
    subject: 'Unlock more with WinBix Pro',
    heading: 'Ready to level up?',
    body: "You've been using WinBix for 10 days. Upgrade to unlock unlimited messages, all channels, A/B testing, and advanced analytics.",
    ctaText: 'View Plans',
    ctaUrl: '/pricing',
    condition: (u) => u.plan === 'free' || u.plan === 'none',
  },
  {
    id: 'onboarding_day14',
    day: 14,
    subject: 'Connect more channels — Telegram, WhatsApp, Instagram',
    heading: 'Go omnichannel',
    body: 'Your customers are everywhere. Connect Telegram, WhatsApp, and Instagram to manage all conversations from one inbox.',
    ctaText: 'Connect Channels',
    ctaUrl: '/dashboard/integrations',
  },
  {
    id: 'onboarding_day30',
    day: 30,
    subject: 'Your monthly performance report',
    heading: 'Month 1 complete!',
    body: 'See your full first month of analytics — conversations, leads captured, satisfaction scores, and top questions.',
    ctaText: 'View Report',
    ctaUrl: '/dashboard/analytics',
  },
];

export function getSequenceForUser(user: SequenceUser, sequence: SequenceEmail[]): SequenceEmail[] {
  const daysSinceSignup = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const sent = new Set(user.emailSequencesSent || []);

  return sequence.filter((email) => {
    if (sent.has(email.id)) return false;
    if (email.day > daysSinceSignup) return false;
    if (email.condition && !email.condition(user)) return false;
    return true;
  });
}

export function buildEmailHtml(heading: string, ctaText: string, ctaUrl: string, vars: Record<string, string>): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://winbixai.com';
  let resolvedHeading = heading;
  for (const [key, val] of Object.entries(vars)) {
    resolvedHeading = resolvedHeading.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
  }

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background: #3B82F6; color: white; font-weight: 700; width: 36px; height: 36px; line-height: 36px; border-radius: 10px; font-size: 16px;">W</div>
        <span style="display: inline-block; margin-left: 8px; font-weight: 600; font-size: 18px; color: #111;">WinBix AI</span>
      </div>
      <h2 style="font-size: 24px; font-weight: 700; color: #111; margin: 0 0 16px;">${resolvedHeading}</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 24px;">${vars.body || ''}</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${baseUrl}${ctaUrl}" style="display: inline-block; background: #3B82F6; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px;">${ctaText}</a>
      </div>
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0;">
      <p style="font-size: 12px; color: #9CA3AF; text-align: center;">WinBix AI · AI-powered chat widgets for your business</p>
    </div>
  `;
}

export async function processSequenceForUser(user: SequenceUser): Promise<string[]> {
  const due = getSequenceForUser(user, ONBOARDING_SEQUENCE);
  const sent: string[] = [];

  for (const email of due) {
    const html = buildEmailHtml(email.heading, email.ctaText, email.ctaUrl, {
      name: user.name || 'there',
      body: email.body,
    });

    const success = await sendEmail(user.email, email.subject, html);
    if (success) sent.push(email.id);
  }

  return sent;
}
