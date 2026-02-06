export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-lg bg-white/5" />
        <div className="h-10 w-32 rounded-lg bg-white/5" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
            <div className="mb-3 h-4 w-24 rounded bg-white/5" />
            <div className="mb-2 h-8 w-16 rounded bg-white/5" />
            <div className="h-3 w-32 rounded bg-white/5" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
        <div className="border-b border-white/5 p-4">
          <div className="h-10 w-full rounded-lg bg-white/5" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-white/5 p-4 last:border-0">
            <div className="h-10 w-10 rounded-full bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-white/5" />
              <div className="h-3 w-32 rounded bg-white/5" />
            </div>
            <div className="h-6 w-16 rounded-full bg-white/5" />
            <div className="h-8 w-20 rounded-lg bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
