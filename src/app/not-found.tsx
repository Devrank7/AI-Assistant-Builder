import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
      <div className="text-center">
        <h1 className="gradient-text mb-4 text-8xl font-bold">404</h1>
        <p className="mb-2 text-2xl text-gray-400">Страница не найдена</p>
        <p className="mb-8 text-gray-500">Запрашиваемая страница не существует или была удалена</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
        >
          ← На главную
        </Link>
      </div>
    </div>
  );
}
