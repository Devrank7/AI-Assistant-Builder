'use client';

import { LanguageProvider } from './context';

export default function ClientLanguageProvider({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
