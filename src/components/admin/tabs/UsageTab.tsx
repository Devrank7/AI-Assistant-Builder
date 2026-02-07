'use client';

interface UsageTabProps {
  tokens: number;
  requests: number;
}

export default function UsageTab({ tokens, requests }: UsageTabProps) {
  return (
    <div className="glass-card p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">Usage Statistics</h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-white/5 p-6">
          <h4 className="mb-2 text-sm text-gray-400">Requests Over Time</h4>
          <div className="flex h-48 items-end justify-around gap-2">
            {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
              <div
                key={i}
                className="w-full rounded-t bg-gradient-to-t from-[var(--neon-cyan)] to-[var(--neon-purple)]"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-around text-xs text-gray-500">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-white/5 p-6">
          <h4 className="mb-4 text-sm text-gray-400">Token Usage</h4>
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-400">Used</span>
                <span className="text-white">{tokens.toLocaleString()} tokens</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-purple)]"
                  style={{ width: `${Math.min((tokens / 100000) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="text-sm text-gray-400">
              Avg per request: {requests > 0 ? Math.round(tokens / requests) : 0} tokens
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
