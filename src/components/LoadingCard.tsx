'use client';

export default function LoadingCard() {
  return (
    <div className="overflow-hidden rounded-2xl">
      <div className="glass border-white/[0.04] p-6">
        {/* Header skeleton */}
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="skeleton h-12 w-12 rounded-xl" />
            <div>
              <div className="skeleton mb-2 h-5 w-28 rounded-lg" />
              <div className="skeleton h-3.5 w-36 rounded-lg" />
            </div>
          </div>
          <div className="skeleton h-6 w-14 rounded-full" />
        </div>

        {/* Stats skeleton */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-white/[0.04] bg-white/[0.03] p-3 text-center">
              <div className="skeleton mx-auto mb-1.5 h-6 w-12 rounded-lg" />
              <div className="skeleton mx-auto h-3 w-10 rounded" />
            </div>
          ))}
        </div>

        {/* Footer skeleton */}
        <div className="flex items-center justify-between">
          <div className="skeleton h-3.5 w-28 rounded-lg" />
          <div className="skeleton h-3.5 w-20 rounded-lg" />
        </div>

        {/* CTA skeleton */}
        <div className="mt-4 flex justify-center border-t border-white/[0.04] pt-4">
          <div className="skeleton h-3.5 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
