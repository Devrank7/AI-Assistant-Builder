'use client';

import { Suspense } from 'react';
import { LanguageProvider } from './context';

export default function ClientLanguageProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <LanguageProvider>{children}</LanguageProvider>
    </Suspense>
  );
}
