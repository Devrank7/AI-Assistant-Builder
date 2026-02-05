'use client';

export default function LoadingCard() {
  return (
    <div className="glass-card p-6">
      {/* Header skeleton */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full skeleton" />
          <div>
            <div className="h-5 w-32 skeleton rounded mb-2" />
            <div className="h-4 w-40 skeleton rounded" />
          </div>
        </div>
        <div className="h-6 w-16 skeleton rounded-full" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-3 text-center">
            <div className="h-8 w-16 skeleton rounded mx-auto mb-1" />
            <div className="h-3 w-12 skeleton rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Footer skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 skeleton rounded" />
        <div className="h-4 w-24 skeleton rounded" />
      </div>
    </div>
  );
}
