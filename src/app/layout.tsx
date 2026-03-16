import type { Metadata } from 'next';
import { Inter, Geist_Mono } from 'next/font/google';
import { ToastProvider } from '@/components/ui/Toast';
import ClientLanguageProvider from '@/i18n/ClientProvider';
import CookieConsent from '@/components/CookieConsent';
import AuthProvider from '@/components/AuthProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'cyrillic'],
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('wb-theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d)})()`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} bg-bg-primary text-text-primary font-sans antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <ClientLanguageProvider>
            <AuthProvider>
              <ToastProvider>{children}</ToastProvider>
            </AuthProvider>
            <CookieConsent />
          </ClientLanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
