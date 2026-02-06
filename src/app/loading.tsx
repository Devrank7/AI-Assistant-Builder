export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
      <div className="text-center">
        <div className="relative mx-auto mb-4 h-16 w-16">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cyan-400" />
          <div
            className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-t-purple-400"
            style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}
          />
          <div
            className="absolute inset-4 animate-spin rounded-full border-2 border-transparent border-t-pink-400"
            style={{ animationDuration: '1.5s' }}
          />
        </div>
        <p className="animate-pulse text-gray-400">Загрузка...</p>
      </div>
    </div>
  );
}
