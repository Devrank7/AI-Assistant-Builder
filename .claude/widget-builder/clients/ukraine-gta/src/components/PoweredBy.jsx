export default function PoweredBy({ ctx }) {
    return (
        <div className="flex justify-center py-1.5 bg-aw-surface-bg">
            <a href="https://winbixai.com" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-medium text-aw-text-muted hover:text-aw-text-secondary transition-colors opacity-70 hover:opacity-100">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                Powered by WinBix AI
            </a>
        </div>
    );
}
