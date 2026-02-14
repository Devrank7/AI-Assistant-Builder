import type { Metadata } from 'next';
import TermsContent from '@/i18n/legal/TermsContent';

export const metadata: Metadata = {
  title: 'Terms of Service — WinBix AI',
  description: 'WinBix AI Terms of Service',
};

export default function TermsPage() {
  return <TermsContent />;
}
