import { useState } from 'react';

export default function ActionButton({ ctx }) {
  const [state, setState] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const { label, icon, provider, action, params, style } = ctx;

  const handleClick = async () => {
    if (state === 'loading') return;
    setState('loading');
    setErrorMsg('');
    try {
      await ctx.executeIntegration(provider, action, params || {});
      setState('success');
      setTimeout(() => setState('idle'), 2000);
    } catch (err) {
      setErrorMsg(err.message);
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  const baseClass = 'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95';
  const styleClass = style === 'outline'
    ? 'border border-aw-surface-border text-aw-text-primary hover:bg-aw-surface-card'
    : style === 'secondary'
      ? 'bg-aw-surface-card text-aw-text-primary hover:opacity-90'
      : 'bg-aw-send text-white hover:bg-aw-send-hover shadow-md';

  return (
    <div className="px-4 py-1.5">
      <button onClick={handleClick} disabled={state === 'loading'}
        className={`${baseClass} ${styleClass} w-full disabled:opacity-50`}>
        {state === 'loading' && <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />}
        {state === 'success' && <span>✓</span>}
        {state === 'error' && <span>✗</span>}
        {state === 'idle' && icon && <span>{icon}</span>}
        <span>{state === 'success' ? 'Done!' : state === 'error' ? 'Failed' : label || 'Action'}</span>
      </button>
      {errorMsg && <p className="text-xs text-red-400 mt-1 text-center">{errorMsg}</p>}
    </div>
  );
}
