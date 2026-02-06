'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
          <span className="text-4xl">⚠️</span>
        </div>
        <h1 className="mb-2 text-3xl font-bold text-white">Что-то пошло не так</h1>
        <p className="mb-6 text-gray-400">Произошла непредвиденная ошибка. Попробуйте обновить страницу.</p>
        {error.digest && <p className="mb-4 font-mono text-xs text-gray-600">Error ID: {error.digest}</p>}
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
          >
            Попробовать снова
          </button>
          <Link
            href="/"
            className="rounded-lg border border-white/10 px-6 py-3 font-medium text-gray-300 transition-colors hover:bg-white/5"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
