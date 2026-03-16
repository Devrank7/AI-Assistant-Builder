'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(next);
  };

  return (
    <button
      onClick={cycle}
      className="text-text-secondary hover:bg-bg-tertiary hover:text-text-primary flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
      title={`Theme: ${theme}`}
    >
      {theme === 'light' && <Sun size={16} strokeWidth={1.5} />}
      {theme === 'dark' && <Moon size={16} strokeWidth={1.5} />}
      {theme === 'system' && <Monitor size={16} strokeWidth={1.5} />}
    </button>
  );
}
