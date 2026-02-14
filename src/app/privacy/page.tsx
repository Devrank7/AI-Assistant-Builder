import type { Metadata } from 'next';
import PrivacyContent from '@/i18n/legal/PrivacyContent';

export const metadata: Metadata = {
  title: 'Privacy Policy — WinBix AI',
  description: 'WinBix AI Privacy Policy',
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
