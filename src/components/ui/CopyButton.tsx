'use client';

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
  variant?: 'icon' | 'button';
}

export default function CopyButton({
  text,
  label = 'Скопировать',
  className = '',
  size = 'sm',
  variant = 'button',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  if (variant === 'icon') {
    return (
      <button
        onClick={handleCopy}
        className={`text-text-secondary hover:bg-bg-tertiary hover:text-text-primary rounded-lg p-1.5 transition-all duration-200 ${className}`}
        title={copied ? 'Скопировано!' : label}
      >
        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-lg border font-medium transition-all duration-200 ${
        copied
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
          : 'border-border bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80 hover:text-text-primary'
      } ${size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'} ${className}`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      <span>{copied ? 'Скопировано!' : label}</span>
    </button>
  );
}
