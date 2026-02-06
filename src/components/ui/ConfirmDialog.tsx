'use client';

import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

const variantStyles = {
  danger: {
    icon: '🗑️',
    iconBg: 'bg-red-500/10',
    button: 'bg-red-600 hover:bg-red-700',
  },
  warning: {
    icon: '⚠️',
    iconBg: 'bg-amber-500/10',
    button: 'bg-amber-600 hover:bg-amber-700',
  },
  info: {
    icon: 'ℹ️',
    iconBg: 'bg-cyan-500/10',
    button: 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90',
  },
};

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const style = variantStyles[variant];

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="animate-scale-in mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#12121a] p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <div className="flex flex-col items-center text-center">
          <div className={`h-14 w-14 rounded-full ${style.iconBg} mb-4 flex items-center justify-center text-2xl`}>
            {style.icon}
          </div>
          <h3 id="confirm-title" className="mb-2 text-lg font-semibold text-white">
            {title}
          </h3>
          {description && <p className="mb-6 text-sm text-gray-400">{description}</p>}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all disabled:opacity-50 ${style.button}`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Загрузка...
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
