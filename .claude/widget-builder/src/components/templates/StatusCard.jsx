import { useState, useEffect, useRef } from 'react';

export default function StatusCard({ ctx }) {
  const { provider, action, params, displayFields = [], refreshInterval, title } = ctx;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  const fetchData = async () => {
    try {
      const result = await ctx.executeIntegration(provider, action, params || {});
      setData(result);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (!provider || !action) return;
    fetchData();
    if (refreshInterval && refreshInterval > 0) {
      intervalRef.current = setInterval(fetchData, refreshInterval * 1000);
      return () => clearInterval(intervalRef.current);
    }
  }, [provider, action, refreshInterval]);

  return (
    <div className="px-4 py-2">
      <div className="bg-aw-surface-card rounded-xl p-3 border border-aw-surface-border">
        {title && <h4 className="text-xs font-semibold text-aw-text-secondary mb-2 uppercase tracking-wide">{title}</h4>}
        {error && <p className="text-xs text-red-400">{error}</p>}
        {!data && !error && <p className="text-xs text-aw-text-secondary">Loading...</p>}
        {data && displayFields.map(f => (
          <div key={f.key} className="flex justify-between py-1 border-b border-aw-surface-border last:border-0">
            <span className="text-xs text-aw-text-secondary">{f.label}</span>
            <span className="text-sm text-aw-text-primary font-medium">{data[f.key] ?? '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
