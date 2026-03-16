# Design System Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform WinBix AI into a Linear/Arc-level product with design system, light/dark theme, and pixel-perfect components — preserving ALL existing functionality.

**Architecture:** CSS variables (`--wb-*`) in `:root`/`.dark` mapped via Tailwind v4 `@theme inline`. Reusable `src/components/ui/` component library. ThemeProvider with system preference detection + localStorage override. Inter font via next/font.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, Lucide React, Inter font, CSS custom properties

**Spec:** `docs/superpowers/specs/2026-03-16-design-system-redesign.md`

---

## File Structure

### New Files

| File                               | Responsibility                                              |
| ---------------------------------- | ----------------------------------------------------------- |
| `src/components/ui/Button.tsx`     | Button component (primary/secondary/ghost/danger, sm/md/lg) |
| `src/components/ui/Card.tsx`       | Card container with padding variants and hoverable option   |
| `src/components/ui/Input.tsx`      | Form input with label, themed borders and focus ring        |
| `src/components/ui/Badge.tsx`      | Status badge (default/blue/green/amber/red/purple)          |
| `src/components/ui/Modal.tsx`      | Dialog overlay with sizes, animated entry                   |
| `src/components/ui/Table.tsx`      | Table with header, rows, hover, empty state                 |
| `src/components/ui/Avatar.tsx`     | Circle avatar with initials fallback and size variants      |
| `src/components/ui/Dropdown.tsx`   | Dropdown menu with trigger and items                        |
| `src/components/ui/Toggle.tsx`     | Switch toggle with label                                    |
| `src/components/ThemeProvider.tsx` | Theme context: system detection, localStorage, class toggle |
| `src/components/ThemeToggle.tsx`   | Sun/Moon icon button for header                             |

### Modified Files (per task below)

---

## Chunk 1: Foundation (Tasks 1-6)

No visual changes to users yet. Sets up the design system infrastructure.

### Task 1: Install Inter Font + Configure Root Layout

**Files:**

- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Read the current layout.tsx**

Read `src/app/layout.tsx` to understand current font setup (Geist Sans/Mono) and the `className="dark"` hardcoding.

- [ ] **Step 2: Update font imports**

Replace Geist with Inter:

```tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'cyrillic'],
});
```

Keep Geist Mono for code blocks if used elsewhere:

```tsx
import { Geist_Mono } from 'next/font/google';
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
```

- [ ] **Step 3: Update html element**

Remove hardcoded `className="dark"`. Remove hardcoded `bg-[#0a0a0f]` from body. Add `suppressHydrationWarning` for theme script:

```tsx
<html lang="en" suppressHydrationWarning>
  <head>
    <script dangerouslySetInnerHTML={{ __html: `
      (function(){
        var t=localStorage.getItem('wb-theme');
        var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);
        document.documentElement.classList.toggle('dark',d);
      })()
    `}} />
  </head>
  <body className={`${inter.variable} ${geistMono.variable} font-sans bg-bg-primary text-text-primary antialiased`}>
```

- [ ] **Step 4: Verify the app still loads**

Run: `npx tsc --noEmit src/app/layout.tsx`
Check dev server renders without errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: switch to Inter font, remove hardcoded dark mode, add theme flash prevention"
```

---

### Task 2: Add Design Tokens to globals.css

**Files:**

- Modify: `src/app/globals.css`

- [ ] **Step 1: Read globals.css**

Read the full file to understand the existing `@theme inline` block and structure.

- [ ] **Step 2: Add CSS variables at the TOP of the file (after imports)**

Add right after the `@import` lines but before the existing `@theme inline` block:

```css
/* === WinBix Design System Tokens === */
:root {
  --wb-bg-primary: #ffffff;
  --wb-bg-secondary: #f9fafb;
  --wb-bg-tertiary: #f3f4f6;
  --wb-border: #e5e7eb;
  --wb-border-subtle: #f3f4f6;
  --wb-text-primary: #111827;
  --wb-text-secondary: #6b7280;
  --wb-text-tertiary: #9ca3af;
  --wb-accent: #3b82f6;
  --wb-accent-hover: #2563eb;
  --wb-accent-subtle: rgba(59, 130, 246, 0.08);
  --wb-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --wb-shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
  --wb-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.dark {
  --wb-bg-primary: #0a0a0f;
  --wb-bg-secondary: #111118;
  --wb-bg-tertiary: #1a1a24;
  --wb-border: rgba(255, 255, 255, 0.08);
  --wb-border-subtle: rgba(255, 255, 255, 0.04);
  --wb-text-primary: #f9fafb;
  --wb-text-secondary: #9ca3af;
  --wb-text-tertiary: #6b7280;
  --wb-accent: #3b82f6;
  --wb-accent-hover: #60a5fa;
  --wb-accent-subtle: rgba(59, 130, 246, 0.12);
  --wb-shadow-sm: none;
  --wb-shadow-md: none;
  --wb-shadow-lg: none;
}
```

- [ ] **Step 3: Update the `@theme inline` block**

Find the existing `@theme inline` block and ADD the new token mappings to it (don't remove existing mappings yet — they're used by pages not yet migrated):

```css
@theme inline {
  /* ... keep existing mappings ... */

  /* Design System tokens */
  --color-bg-primary: var(--wb-bg-primary);
  --color-bg-secondary: var(--wb-bg-secondary);
  --color-bg-tertiary: var(--wb-bg-tertiary);
  --color-border: var(--wb-border);
  --color-border-subtle: var(--wb-border-subtle);
  --color-text-primary: var(--wb-text-primary);
  --color-text-secondary: var(--wb-text-secondary);
  --color-text-tertiary: var(--wb-text-tertiary);
  --color-accent: var(--wb-accent);
  --color-accent-hover: var(--wb-accent-hover);
  --color-accent-subtle: var(--wb-accent-subtle);
  --shadow-sm: var(--wb-shadow-sm);
  --shadow-md: var(--wb-shadow-md);
  --shadow-lg: var(--wb-shadow-lg);
}
```

- [ ] **Step 4: Verify Tailwind picks up new tokens**

Run dev server. Verify `bg-bg-primary`, `text-text-primary`, `border-border` work in a temporary test.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add design system CSS tokens for light/dark themes"
```

---

### Task 3: Create ThemeProvider + ThemeToggle

**Files:**

- Create: `src/components/ThemeProvider.tsx`
- Create: `src/components/ThemeToggle.tsx`
- Modify: `src/app/layout.tsx` (wrap with ThemeProvider)

- [ ] **Step 1: Create ThemeProvider**

```tsx
// src/components/ThemeProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  resolvedTheme: 'dark',
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('wb-theme') as Theme | null;
    const t = stored || 'system';
    setThemeState(t);
    const resolved = resolveTheme(t);
    setResolvedTheme(resolved);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, []);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const resolved = getSystemTheme();
      setResolvedTheme(resolved);
      document.documentElement.classList.toggle('dark', resolved === 'dark');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem('wb-theme', t);
    const resolved = resolveTheme(t);
    setResolvedTheme(resolved);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, []);

  return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext.Provider>;
}
```

- [ ] **Step 2: Create ThemeToggle**

```tsx
// src/components/ThemeToggle.tsx
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
      className="text-text-secondary hover:bg-bg-tertiary hover:text-text-primary flex h-8 w-8 items-center justify-center rounded-md transition-colors"
      title={`Theme: ${theme}`}
    >
      {theme === 'light' && <Sun size={16} strokeWidth={1.5} />}
      {theme === 'dark' && <Moon size={16} strokeWidth={1.5} />}
      {theme === 'system' && <Monitor size={16} strokeWidth={1.5} />}
    </button>
  );
}
```

- [ ] **Step 3: Wrap app with ThemeProvider in layout.tsx**

Add `ThemeProvider` inside the existing provider chain in `layout.tsx`:

```tsx
import { ThemeProvider } from '@/components/ThemeProvider';

// In the body, wrap children:
<ThemeProvider>
  {/* existing providers */}
  {children}
</ThemeProvider>;
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit src/components/ThemeProvider.tsx src/components/ThemeToggle.tsx`

- [ ] **Step 5: Commit**

```bash
git add src/components/ThemeProvider.tsx src/components/ThemeToggle.tsx src/app/layout.tsx
git commit -m "feat: add ThemeProvider with system preference detection and ThemeToggle"
```

---

### Task 4: Create Core UI Components (Button, Card, Input, Badge)

**Files:**

- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Input.tsx`
- Create: `src/components/ui/Badge.tsx`

- [ ] **Step 1: Create Button**

```tsx
// src/components/ui/Button.tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover shadow-sm dark:shadow-none',
  secondary: 'border border-border bg-transparent text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
  ghost: 'bg-transparent text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
  danger: 'bg-red-500 text-white hover:bg-red-600',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-[13px]',
  lg: 'h-10 px-5 text-sm',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`focus-visible:ring-accent/50 inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
export { Button, type ButtonProps };
```

- [ ] **Step 2: Create Card**

```tsx
// src/components/ui/Card.tsx
import { type HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

const paddingClasses = { sm: 'p-3', md: 'p-5', lg: 'p-6' };

export function Card({ padding = 'md', hoverable, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`border-border bg-bg-secondary rounded-xl border shadow-sm dark:shadow-none ${paddingClasses[padding]} ${hoverable ? 'hover:border-border transition-colors hover:shadow-md dark:hover:border-[rgba(255,255,255,0.12)]' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Create Input**

```tsx
// src/components/ui/Input.tsx
import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className = '', id, ...props }, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="text-text-secondary block text-xs font-medium">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`text-text-primary placeholder:text-text-tertiary border-border focus:border-accent focus:ring-accent/10 h-9 w-full rounded-lg border bg-transparent px-3 text-sm transition-colors hover:border-[color-mix(in_srgb,var(--wb-border),var(--wb-text-tertiary)_20%)] focus:ring-2 focus:outline-none disabled:opacity-50 ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
});
Input.displayName = 'Input';
export { Input, type InputProps };
```

- [ ] **Step 4: Create Badge**

```tsx
// src/components/ui/Badge.tsx
type BadgeVariant = 'default' | 'blue' | 'green' | 'amber' | 'red' | 'purple';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-bg-tertiary text-text-secondary',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
};

export function Badge({ variant = 'default', className = '', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 5: Type-check all components**

Run: `npx tsc --noEmit src/components/ui/Button.tsx src/components/ui/Card.tsx src/components/ui/Input.tsx src/components/ui/Badge.tsx`

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Button.tsx src/components/ui/Card.tsx src/components/ui/Input.tsx src/components/ui/Badge.tsx
git commit -m "feat: add core UI components — Button, Card, Input, Badge"
```

---

### Task 5: Create Extended UI Components (Modal, Table, Avatar, Dropdown, Toggle)

**Files:**

- Create: `src/components/ui/Modal.tsx`
- Create: `src/components/ui/Table.tsx`
- Create: `src/components/ui/Avatar.tsx`
- Create: `src/components/ui/Dropdown.tsx`
- Create: `src/components/ui/Toggle.tsx`

- [ ] **Step 1: Create Modal**

```tsx
// src/components/ui/Modal.tsx
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
        className={`w-full ${sizeClasses[size]} border-border bg-bg-primary animate-in rounded-2xl border p-6 shadow-lg dark:shadow-none`}
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
```

- [ ] **Step 2: Create Table**

```tsx
// src/components/ui/Table.tsx
import { type ReactNode } from 'react';

interface Column {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  columns: Column[];
  data: T[];
  renderRow: (item: T, index: number) => ReactNode;
  emptyState?: ReactNode;
  onRowClick?: (item: T) => void;
}

export function Table<T>({ columns, data, renderRow, emptyState, onRowClick }: TableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-border border-b">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-text-tertiary px-4 py-2.5 text-left text-[11px] font-medium tracking-wider uppercase ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr
              key={i}
              className={`border-border-subtle hover:bg-bg-tertiary border-b transition-colors last:border-0 ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(item)}
            >
              {renderRow(item, i)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TableCell({
  children,
  className = '',
  align,
}: {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}) {
  return (
    <td
      className={`text-text-primary px-4 py-3 text-sm ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''} ${className}`}
    >
      {children}
    </td>
  );
}
```

- [ ] **Step 3: Create Avatar**

```tsx
// src/components/ui/Avatar.tsx
interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-10 w-10 text-sm' };

const colors = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-rose-500',
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

export function Avatar({ name, src, size = 'md', className = '' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const color = colors[hashName(name) % colors.length];

  if (src) {
    return <img src={src} alt={name} className={`rounded-full object-cover ${sizeClasses[size]} ${className}`} />;
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full font-medium text-white ${color} ${sizeClasses[size]} ${className}`}
    >
      {initials}
    </div>
  );
}
```

- [ ] **Step 4: Create Dropdown**

```tsx
// src/components/ui/Dropdown.tsx
'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
}

export function Dropdown({ trigger, children, align = 'right' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className={`border-border bg-bg-primary absolute top-full z-50 mt-1 min-w-[180px] rounded-lg border p-1 shadow-lg dark:shadow-none ${align === 'right' ? 'right-0' : 'left-0'}`}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  danger,
}: {
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${danger ? 'text-red-500 hover:bg-red-500/10' : 'text-text-primary hover:bg-bg-tertiary'}`}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 5: Create Toggle**

```tsx
// src/components/ui/Toggle.tsx
'use client';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label
      className={`inline-flex items-center gap-2.5 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-bg-tertiary'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4' : ''}`}
        />
      </button>
      {label && <span className="text-text-primary text-sm">{label}</span>}
    </label>
  );
}
```

- [ ] **Step 6: Add modal animation to globals.css**

Add after the design token section:

```css
@keyframes modal-in {
  from {
    opacity: 0;
    transform: scale(0.98) translateY(4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
```

- [ ] **Step 7: Type-check all components**

Run: `npx tsc --noEmit src/components/ui/Modal.tsx src/components/ui/Table.tsx src/components/ui/Avatar.tsx src/components/ui/Dropdown.tsx src/components/ui/Toggle.tsx`

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/Modal.tsx src/components/ui/Table.tsx src/components/ui/Avatar.tsx src/components/ui/Dropdown.tsx src/components/ui/Toggle.tsx src/app/globals.css
git commit -m "feat: add extended UI components — Modal, Table, Avatar, Dropdown, Toggle"
```

---

### Task 6: Create UI Components Index

**Files:**

- Create: `src/components/ui/index.ts`

- [ ] **Step 1: Create barrel export**

```tsx
// src/components/ui/index.ts
export { Button, type ButtonProps } from './Button';
export { Card } from './Card';
export { Input, type InputProps } from './Input';
export { Badge } from './Badge';
export { Modal } from './Modal';
export { Table, TableCell } from './Table';
export { Avatar } from './Avatar';
export { Dropdown, DropdownItem } from './Dropdown';
export { Toggle } from './Toggle';
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit src/components/ui/index.ts`

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/index.ts
git commit -m "feat: add UI components barrel export"
```

---

## Chunk 2: Layout Shell (Tasks 7-8)

### Task 7: Redesign Dashboard Layout (Sidebar + Header)

**Files:**

- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Read current layout.tsx**

Read `src/app/dashboard/layout.tsx` to understand the current sidebar structure, nav items, and header.

- [ ] **Step 2: Rewrite layout with grouped nav, compact header, theme toggle**

Key changes:

- Replace inline SVG icons with Lucide components
- Group nav items into sections (MAIN, BUILD, INSIGHTS, WORKSPACE, ACCOUNT)
- Add section labels: `text-[11px] uppercase tracking-wider text-text-tertiary px-4 mt-5 mb-1`
- Sidebar: `w-60 bg-bg-secondary border-r border-border`
- Header: `h-12` (from h-16)
- Add ThemeToggle in header
- Replace email text with Avatar + Dropdown (Settings, Billing, Log out)
- Add NotificationBell (already exists)
- Nav items: `h-8 px-2 mx-2 rounded-md text-[13px] font-medium`
  - Active: `bg-accent-subtle text-accent` (light) / `bg-[rgba(255,255,255,0.08)] text-white` (dark)
  - Inactive: `text-text-secondary hover:bg-bg-tertiary hover:text-text-primary`
- Use Lucide icons: `LayoutDashboard, MessageSquare, Bot, Sparkles, Plug, BarChart3, FlaskConical, Users, CreditCard, Settings`
- Preserve ALL existing logic: `isActive()`, `hasPaidPlan` check, `setSidebarOpen`, mobile overlay, etc.

Important: Keep all existing imports (useAuth, usePathname, useRouter, NotificationBell). Only change the visual rendering.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit src/app/dashboard/layout.tsx`

- [ ] **Step 4: Verify in browser**

Open `localhost:3000/dashboard`. Check:

- Sidebar renders with grouped sections
- Active state works
- Mobile hamburger works
- Theme toggle switches light/dark
- All nav links navigate correctly

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/layout.tsx
git commit -m "feat: redesign dashboard layout — grouped sidebar, compact header, theme toggle"
```

---

### Task 8: Restyle NotificationBell

**Files:**

- Modify: `src/components/NotificationBell.tsx`

- [ ] **Step 1: Read current NotificationBell**

Read `src/components/NotificationBell.tsx`.

- [ ] **Step 2: Update styling to design system**

Key changes:

- Badge: small 8px red dot (not number badge) when unread > 0
- Dropdown: `bg-bg-primary border-border rounded-xl shadow-lg` (not `bg-[#12121a]`)
- Items: `px-4 py-3 hover:bg-bg-tertiary` (not custom colors)
- Empty state: centered "All caught up" with icon
- Mark all read: Ghost button style
- Keep ALL existing logic: fetch, polling, markAllRead, timeAgo, click-outside

- [ ] **Step 3: Verify**

Open dashboard, check bell renders correctly in both themes.

- [ ] **Step 4: Commit**

```bash
git add src/components/NotificationBell.tsx
git commit -m "feat: restyle NotificationBell with design system tokens"
```

---

## Chunk 3: Dashboard Pages (Tasks 9-19)

### Task 9: Redesign Overview Page

**Files:**

- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Read current page**

Read `src/app/dashboard/page.tsx` fully.

- [ ] **Step 2: Rewrite with design system**

Key changes:

- Import and use `Card`, `Button`, `Badge` from `@/components/ui`
- Stat cards: simple Card with Caption label + Display value (28px, font-700) + change indicator (green/red)
- Remove: glow orbs, gradient icons, ambient blur, decorative shadows
- Activity chart: Card container, single AreaChart line, fill `#3B82F6` with 8% opacity
- Tooltip: simple Card (remove GlassTooltip)
- Chart axis: `text-text-tertiary` color, 10px size
- Bottom grid: "Top Widgets" as clean Table, "Recent Activity" as list
- Period toggle: Secondary Button (sm) group
- "New Widget" CTA: Primary Button (only primary on page)
- Preserve ALL data fetching, state, useEffect, API calls, calculations

- [ ] **Step 3: Verify in both themes**

Check light and dark mode render correctly.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: redesign Overview page with design system"
```

---

### Task 10: Redesign My Widgets Page

**Files:**

- Modify: `src/app/dashboard/widgets/page.tsx`

- [ ] **Step 1: Read current page**
- [ ] **Step 2: Rewrite with Table view as default**

Replace card grid with Table component. Columns: Name | Type (Badge) | Status (Badge) | Created | Actions (Ghost buttons).
Preserve: all fetch logic, delete handler, preview/customize links.

- [ ] **Step 3: Verify + Commit**

```bash
git add src/app/dashboard/widgets/page.tsx
git commit -m "feat: redesign My Widgets page with table view"
```

---

### Task 11: Redesign My Chats Page

**Files:**

- Modify: `src/app/dashboard/chats/page.tsx`

- [ ] **Step 1: Read current page**
- [ ] **Step 2: Rewrite with clean table rows**

Remove cyan glow effects. Use Table rows with Badge for status. Preserve click-to-navigate behavior and all filters.

- [ ] **Step 3: Verify + Commit**

```bash
git add src/app/dashboard/chats/page.tsx
git commit -m "feat: redesign My Chats page — clean table rows"
```

---

### Task 12: Redesign Analytics Page

**Files:**

- Modify: `src/app/dashboard/analytics/page.tsx`

- [ ] **Step 1: Read current page**
- [ ] **Step 2: Rewrite with design system**

Stat cards same as Overview pattern. Charts in Card containers. Heatmap: blue opacity scale. Widget filter: secondary buttons or dropdown. Preserve all data fetching.

- [ ] **Step 3: Verify + Commit**

```bash
git add src/app/dashboard/analytics/page.tsx
git commit -m "feat: redesign Analytics page with design system"
```

---

### Task 13: Redesign A/B Tests Page

**Files:**

- Modify: `src/app/dashboard/ab-tests/page.tsx`

- [ ] **Step 1: Read current page**
- [ ] **Step 2: Rewrite with Table view + detail expansion**

Table rows for tests. Variant comparison in Cards. Use Badge for status. Preserve all API interactions (create, start, pause tests).

- [ ] **Step 3: Verify + Commit**

```bash
git add src/app/dashboard/ab-tests/page.tsx
git commit -m "feat: redesign A/B Tests page with table view"
```

---

### Task 14: Redesign Team Page

**Files:**

- Modify: `src/app/dashboard/team/page.tsx`

- [ ] **Step 1: Read current page**
- [ ] **Step 2: Rewrite with Modal for invite + Avatar in member list**

Use Modal for invite form. Avatar component for member list. Badge for roles. Preserve existing API calls to `/api/org/members`.

- [ ] **Step 3: Verify + Commit**

```bash
git add src/app/dashboard/team/page.tsx
git commit -m "feat: redesign Team page with Modal invite + Avatar list"
```

---

### Task 15: Redesign Integrations Page

**Files:**

- Modify: `src/app/dashboard/integrations/page.tsx`

- [ ] **Step 1: Read current page**
- [ ] **Step 2: Rewrite as grouped list**

Grouped sections: "Connected" and "Available". Table rows instead of cards. Modal component for connect flow. Preserve all connect/disconnect logic.

- [ ] **Step 3: Verify + Commit**

```bash
git add src/app/dashboard/integrations/page.tsx
git commit -m "feat: redesign Integrations page — grouped table list"
```

---

### Task 16: Redesign Billing Page

**Files:**

- Modify: `src/app/dashboard/billing/page.tsx`

- [ ] **Step 1: Read current page**
- [ ] **Step 2: Rewrite with clean Cards**

Plan card with Badge status. Table for plan comparison. Preserve all billing/subscription logic.

- [ ] **Step 3: Verify + Commit**

```bash
git add src/app/dashboard/billing/page.tsx
git commit -m "feat: redesign Billing page with clean Cards"
```

---

### Task 17: Redesign Settings Page

**Files:**

- Modify: `src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Read current page**
- [ ] **Step 2: Rewrite as clean vertical form**

Remove gradient accent lines, icon boxes. Sections: Profile, Password, Danger Zone. Use Input, Button, Toggle components. Preserve all form logic (save, password change, delete account, email verification).

- [ ] **Step 3: Verify + Commit**

```bash
git add src/app/dashboard/settings/page.tsx
git commit -m "feat: redesign Settings page — clean form layout"
```

---

### Task 18: Update Onboarding Page

**Files:**

- Modify: `src/app/dashboard/onboarding/page.tsx`

- [ ] **Step 1: Read current page** (already updated with Lucide icons)
- [ ] **Step 2: Update to use design system tokens**

Replace hardcoded colors with token classes. Use Button component for CTAs. Apply `bg-bg-primary`, `text-text-primary`, `border-border` etc.

- [ ] **Step 3: Verify + Commit**

```bash
git add src/app/dashboard/onboarding/page.tsx
git commit -m "feat: update Onboarding page to design system tokens"
```

---

### Task 19: Minimal Update to AI Builder

**Files:**

- Modify: `src/app/dashboard/builder/page.tsx`

- [ ] **Step 1: Read current page**
- [ ] **Step 2: Apply minimal token updates**

Only change: background colors → tokens, font → Inter (inherited), border colors → tokens. Do NOT change any streaming logic, SSE handlers, agent activity, template selector, state management.

- [ ] **Step 3: Verify builder still works end-to-end**

Test: navigate to builder, ensure template selector renders, chat interface works if an active session exists.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/builder/page.tsx
git commit -m "feat: apply design tokens to AI Builder — minimal visual update"
```

---

## Chunk 4: Public Pages (Tasks 20-23)

### Task 20: Redesign Landing Page

**Files:**

- Modify: `src/app/page.tsx`

- [ ] **Step 1: Read current page fully**
- [ ] **Step 2: Rewrite landing page in Linear/Arc style**

Clean hero: Large headline (48-64px Inter, font-700) + subtitle + single Primary CTA + product screenshot/mockup area.
Features: 3-col Cards with Lucide icons + title + description.
How it works: 3 numbered steps.
Pricing: embedded section (link to /plans for detail).
Footer: clean links grid.

Remove: aurora effects, mesh backgrounds, neon text, floating animations, gradient text, dot patterns.
Keep: LandingChat component (restyle with tokens), LanguageSwitcher, AuthModal trigger.

Works in both light and dark themes.

- [ ] **Step 3: Verify in both themes**
- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: redesign landing page — clean Linear/Arc style"
```

---

### Task 21: Redesign Plans/Pricing Page

**Files:**

- Modify: `src/app/plans/page.tsx`

- [ ] **Step 1: Read current page**
- [ ] **Step 2: Rewrite with Card components**

Clean plan cards. Pro highlighted with accent border. Toggle component for annual/monthly. Feature lists with check icons.

- [ ] **Step 3: Verify + Commit**

```bash
git add src/app/plans/page.tsx
git commit -m "feat: redesign Pricing page with Card components"
```

---

### Task 22: Restyle Auth Modal

**Files:**

- Modify: `src/components/AuthModal.tsx`

- [ ] **Step 1: Read current AuthModal**
- [ ] **Step 2: Restyle with design system**

Use Modal container pattern. Clean tab underline. Input components. Button components. Remove gradient tab indicators, neon effects.
Preserve ALL auth logic: login, register, Google OAuth, email verification, error handling.

- [ ] **Step 3: Verify login/register works**
- [ ] **Step 4: Commit**

```bash
git add src/components/AuthModal.tsx
git commit -m "feat: restyle Auth Modal with design system"
```

---

### Task 23: Update Error + Not Found + Loading Pages

**Files:**

- Modify: `src/app/error.tsx`
- Modify: `src/app/not-found.tsx` (if exists)
- Modify: `src/app/loading.tsx` (if exists)

- [ ] **Step 1: Read current error pages**
- [ ] **Step 2: Update with design tokens**

Centered layout. Icon + Title + description + Button components. `bg-bg-primary text-text-primary`. Loading: skeleton with `bg-bg-tertiary animate-pulse`.

- [ ] **Step 3: Commit**

```bash
git add src/app/error.tsx src/app/not-found.tsx src/app/loading.tsx
git commit -m "feat: update error, not-found, loading pages with design tokens"
```

---

## Chunk 5: Polish (Tasks 24-27)

### Task 24: Restyle Existing UI Components

**Files:**

- Modify: `src/components/ui/ConfirmDialog.tsx`
- Modify: `src/components/ui/Pagination.tsx`
- Modify: `src/components/ui/TabNav.tsx`
- Modify: `src/components/ui/Toast.tsx`
- Modify: `src/components/ui/EmptyState.tsx`
- Modify: `src/components/ui/SearchFilter.tsx`
- Modify: `src/components/ui/CopyButton.tsx`
- Modify: `src/components/ui/Breadcrumbs.tsx`

- [ ] **Step 1: Read each component**
- [ ] **Step 2: Update each to use design tokens**

Replace hardcoded colors with token classes. Use `bg-bg-primary`, `text-text-primary`, `border-border`, etc. Ensure both themes work.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/
git commit -m "feat: restyle existing UI components with design tokens"
```

---

### Task 25: Restyle Supporting Components

**Files:**

- Modify: `src/components/LandingChat.tsx`
- Modify: `src/components/LanguageSwitcher.tsx`
- Modify: `src/components/CookieConsent.tsx`

- [ ] **Step 1: Read and update each**

Apply design tokens. Use Button/Card/Dropdown components where appropriate. Preserve all functionality.

- [ ] **Step 2: Commit**

```bash
git add src/components/LandingChat.tsx src/components/LanguageSwitcher.tsx src/components/CookieConsent.tsx
git commit -m "feat: restyle supporting components with design tokens"
```

---

### Task 26: Animation Pass + Responsive Fine-tuning

**Files:**

- Modify: `src/app/globals.css` (add minimal animation keyframes if needed)
- Review all dashboard pages for responsive breakpoints

- [ ] **Step 1: Review all pages at mobile, tablet, desktop widths**
- [ ] **Step 2: Fix any layout issues**

Ensure sidebar collapses properly below lg. Tables scroll horizontally on mobile. Cards stack single-column below sm.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "fix: responsive layout and animation polish"
```

---

### Task 27: Clean Up Legacy CSS

**Files:**

- Modify: `src/app/globals.css`

- [ ] **Step 1: Identify unused legacy classes**

Search the codebase for each legacy class. If it's only used by out-of-scope pages (admin, cabinet, industry, demo), keep it. If it's not used anywhere, remove it.

- [ ] **Step 2: Remove unused classes**

Carefully remove only classes that are confirmed unused by any page (in-scope or out-of-scope).

- [ ] **Step 3: Run all tests**

Run: `npx vitest run` — ensure all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "chore: clean up unused legacy CSS classes"
```

---

## Summary

| Phase              | Tasks | Description                                          |
| ------------------ | ----- | ---------------------------------------------------- |
| A: Foundation      | 1-6   | Font, tokens, ThemeProvider, UI components           |
| B: Layout Shell    | 7-8   | Sidebar + Header + NotificationBell                  |
| C: Dashboard Pages | 9-19  | All 11 dashboard pages                               |
| D: Public Pages    | 20-23 | Landing, Pricing, Auth, Error                        |
| E: Polish          | 24-27 | Restyle existing components, responsive, CSS cleanup |

**Total:** 27 tasks, ~27 commits. Each task is independently verifiable. All functionality preserved.
