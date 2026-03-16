'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' };

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px] dark:bg-black/70"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`w-full ${sizeClasses[size]} border-border bg-bg-primary rounded-2xl border p-6 shadow-lg dark:shadow-none`}
        style={{ animation: 'modal-in 200ms ease-out' }}
      >
        <h2 className="text-text-primary text-lg font-semibold">{title}</h2>
        {description && <p className="text-text-secondary mt-1 text-sm">{description}</p>}
        <div className="mt-4">{children}</div>
        {footer && <div className="border-border-subtle mt-6 flex justify-end gap-2 border-t pt-4">{footer}</div>}
      </div>
    </div>
  );
}
