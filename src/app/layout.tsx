import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ToastProvider } from '@/components/ui/Toast';
import ClientLanguageProvider from '@/i18n/ClientProvider';
import CookieConsent from '@/components/CookieConsent';
import AuthProvider from '@/components/AuthProvider';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'WinBix AI - AI Chat Widgets for Your Business',
  description:
    'Deploy AI-powered chat widgets that answer customer questions, collect leads, and integrate with your CRM. Start your free trial today.',
  keywords: ['AI chatbot', 'chat widget', 'customer support', 'lead generation', 'CRM integration'],
  openGraph: {
    title: 'WinBix AI - AI Chat Widgets for Your Business',
    description:
      'Deploy AI-powered chat widgets that answer customer questions, collect leads, and integrate with your CRM.',
    type: 'website',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-[#0a0a0f] text-white antialiased`}
        suppressHydrationWarning
      >
        <ClientLanguageProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
          <CookieConsent />
        </ClientLanguageProvider>
      </body>
    </html>
  );
}
