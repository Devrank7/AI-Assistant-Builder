import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ToastProvider } from '@/components/ui/Toast';
import ClientLanguageProvider from '@/i18n/ClientProvider';
import CookieConsent from '@/components/CookieConsent';
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
  title: 'WinBix AI - Dashboard',
  description: 'Manage and monitor your WinBix AI widget clients',
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
          <ToastProvider>{children}</ToastProvider>
          <CookieConsent />
        </ClientLanguageProvider>
      </body>
    </html>
  );
}
