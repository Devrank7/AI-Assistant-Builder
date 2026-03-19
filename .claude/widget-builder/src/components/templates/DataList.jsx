import { useState, useEffect } from 'react';

export default function DataList({ ctx }) {
  const { provider, action, params, displayFields = [], emptyMessage, onSelectAction } = ctx;
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!provider || !action) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await ctx.executeIntegration(provider, action, params || {});
        if (!cancelled) setItems(Array.isArray(data) ? data : [data]);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [provider, action]);

  const handleSelect = (item) => {
    if (!onSelectAction) return;
    if (onSelectAction.type === 'message') {
      ctx.sendMessage?.(onSelectAction.template?.replace(/\{\{(\w+)\}\}/g, (_, k) => item[k] || '') || item[displayFields[0]?.key]);
    } else if (onSelectAction.provider) {
      ctx.executeIntegration(onSelectAction.provider, onSelectAction.action, item);
    }
  };

  if (error) return <div className="px-4 py-2 text-xs text-red-400">{error}</div>;
  if (items === null) return <div className="px-4 py-3 text-center text-aw-text-secondary text-xs">Loading...</div>;
  if (items.length === 0) return <div className="px-4 py-3 text-center text-aw-text-secondary text-xs">{emptyMessage || 'No items found'}</div>;

  return (
    <div className="px-4 py-2 space-y-1.5 max-h-48 overflow-y-auto">
      {items.map((item, i) => (
        <div key={i} onClick={() => handleSelect(item)}
          className={`bg-aw-surface-card rounded-lg p-2.5 border border-aw-surface-border ${onSelectAction ? 'cursor-pointer hover:border-aw-focus-border transition-colors' : ''}`}>
          {displayFields.map(f => (
            <div key={f.key} className="flex justify-between text-xs">
              <span className="text-aw-text-secondary">{f.label}</span>
              <span className="text-aw-text-primary font-medium">{item[f.key] ?? '—'}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
