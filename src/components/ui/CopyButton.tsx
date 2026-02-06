'use client';

import { useState, useCallback } from 'react';

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
        className={`rounded-lg p-1.5 text-gray-500 transition-all duration-200 hover:bg-white/5 hover:text-white ${className}`}
        title={copied ? 'Скопировано!' : label}
      >
        {copied ? <span className="text-emerald-400">✓</span> : <span>📋</span>}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-lg border font-medium transition-all duration-200 ${
        copied
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
          : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
      } ${size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'} ${className}`}
    >
      <span>{copied ? '✓' : '📋'}</span>
      <span>{copied ? 'Скопировано!' : label}</span>
    </button>
  );
}
