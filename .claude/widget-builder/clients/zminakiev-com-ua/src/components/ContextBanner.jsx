import { Globe, X } from 'lucide-preact';

export default function ContextBanner({ ctx }) {
    const { pageTitle, contextDismissed, setContextDismissed, messages, config, uiStrings } = ctx;

    if (!pageTitle || contextDismissed || messages.length > 0) return null;

    return (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-aw-surface-border text-aw-text-primary" style={{ backgroundColor: 'color-mix(in srgb, var(--aw-primary) 10%, transparent)' }}>
            <Globe size={13} className="text-primary" />
            <span className="flex-1 text-[11.5px] font-medium truncate">{uiStrings.contextBanner}: <strong>{pageTitle}</strong></span>
            <button onClick={() => { setContextDismissed(true); try { sessionStorage.setItem('aw-ctx-' + config.clientId, '1'); } catch {} }}
                className="p-0.5 text-aw-text-muted hover:text-aw-text-secondary transition-colors">
                <X size={12} />
            </button>
        </div>
    );
}
