export default function ExternalLink({ ctx }) {
  const { url, label, icon, openIn } = ctx;

  const handleClick = () => {
    if (openIn === 'popup') {
      window.open(url, '_blank', 'width=600,height=700,scrollbars=yes');
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="px-4 py-1.5">
      <button onClick={handleClick}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-aw-surface-border text-aw-text-primary text-sm hover:bg-aw-surface-card transition-all">
        {icon && <span>{icon}</span>}
        <span>{label || 'Open Link'}</span>
        <span className="text-aw-text-secondary">↗</span>
      </button>
    </div>
  );
}
