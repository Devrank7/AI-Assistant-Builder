# Admin Panel Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing admin panel with a professional Enterprise Dark interface featuring sidebar navigation, user/client management, subscription quick-actions, analytics, global search, and notifications.

**Architecture:** Next.js 15 App Router pages under `/admin/*` with a shared layout (sidebar + header). Shared UI components in `src/components/admin/ui/`. API routes under `/api/admin/` using existing `verifyAdmin()` auth. All pages are `'use client'` with useState/useEffect data fetching.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, MongoDB/Mongoose, recharts 3.7.0, framer-motion 12.33.0, Vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-03-15-admin-panel-redesign-design.md`

**Worktree:** `/Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform` on branch `feature/saas-platform`

---

## Chunk 1: Foundation (CSS, UI Components, Layout)

### Task 1: Admin CSS Design Tokens

**Files:**

- Create: `src/styles/admin.css`
- Modify: `src/app/globals.css` (add import)

- [ ] **Step 1: Create admin.css with design tokens**

```css
/* src/styles/admin.css */

/* Admin Panel Design Tokens — Enterprise Dark */
:root {
  /* Backgrounds */
  --admin-bg-primary: #0f1117;
  --admin-bg-card: #1a1d2b;
  --admin-bg-hover: #252836;
  --admin-bg-active: #2d3148;

  /* Text */
  --admin-text-primary: #f1f5f9;
  --admin-text-secondary: #94a3b8;
  --admin-text-muted: #475569;

  /* Accent */
  --admin-accent-blue: #2563eb;
  --admin-accent-blue-light: #3b82f6;

  /* Status */
  --admin-status-success: #34d399;
  --admin-status-warning: #f59e0b;
  --admin-status-danger: #ef4444;
  --admin-status-info: #60a5fa;

  /* Borders */
  --admin-border-subtle: rgba(255, 255, 255, 0.06);
  --admin-border-emphasis: rgba(255, 255, 255, 0.12);

  /* Spacing */
  --admin-sidebar-width: 240px;
  --admin-header-height: 56px;
}

/* Admin skeleton shimmer */
@keyframes admin-shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.admin-skeleton {
  background: linear-gradient(90deg, var(--admin-bg-card) 25%, var(--admin-bg-hover) 50%, var(--admin-bg-card) 75%);
  background-size: 200% 100%;
  animation: admin-shimmer 1.5s infinite;
  border-radius: 4px;
}
```

- [ ] **Step 2: Import admin.css in globals.css**

Add `@import "../styles/admin.css";` after the first line (`@import "tailwindcss";`) in `src/app/globals.css`.

- [ ] **Step 3: Verify import works**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx next build --no-lint 2>&1 | head -20`
Expected: No CSS import errors

- [ ] **Step 4: Commit**

```bash
git add src/styles/admin.css src/app/globals.css
git commit -m "feat(admin): add Enterprise Dark design tokens CSS"
```

---

### Task 2: StatusBadge Component

**Files:**

- Create: `src/components/admin/ui/StatusBadge.tsx`
- Create: `src/components/admin/ui/__tests__/StatusBadge.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/ui/__tests__/StatusBadge.test.tsx
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  it('renders with correct text', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('applies green classes for active status', () => {
    render(<StatusBadge status="active" />);
    const badge = screen.getByText('active');
    expect(badge.className).toContain('bg-emerald');
  });

  it('applies yellow classes for trial status', () => {
    render(<StatusBadge status="trial" />);
    const badge = screen.getByText('trial');
    expect(badge.className).toContain('bg-amber');
  });

  it('applies red classes for past_due status', () => {
    render(<StatusBadge status="past_due" />);
    const badge = screen.getByText('past_due');
    expect(badge.className).toContain('bg-red');
  });

  it('applies gray classes for unknown status', () => {
    render(<StatusBadge status="canceled" />);
    const badge = screen.getByText('canceled');
    expect(badge.className).toContain('bg-slate');
  });

  it('renders custom label when provided', () => {
    render(<StatusBadge status="active" label="Active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/components/admin/ui/__tests__/StatusBadge.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/admin/ui/StatusBadge.tsx
'use client';

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  trial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  past_due: 'bg-red-500/10 text-red-400 border-red-500/20',
  pending: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  suspended: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  none: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const fallback = 'bg-slate-500/10 text-slate-400 border-slate-500/20';

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const styles = statusStyles[status] ?? fallback;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles}`}>
      {label ?? status}
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/components/admin/ui/__tests__/StatusBadge.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ui/StatusBadge.tsx src/components/admin/ui/__tests__/StatusBadge.test.tsx
git commit -m "feat(admin): add StatusBadge component with tests"
```

---

### Task 3: StatCard Component

**Files:**

- Create: `src/components/admin/ui/StatCard.tsx`
- Create: `src/components/admin/ui/__tests__/StatCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/ui/__tests__/StatCard.test.tsx
import { render, screen } from '@testing-library/react';
import { StatCard } from '../StatCard';

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Total Users" value="1,234" />);
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('renders positive trend with up arrow', () => {
    render(<StatCard label="MRR" value="$5,000" trend={{ value: 12, positive: true }} />);
    expect(screen.getByText('+12%')).toBeInTheDocument();
  });

  it('renders negative trend with down arrow', () => {
    render(<StatCard label="Churn" value="3%" trend={{ value: 5, positive: false }} />);
    expect(screen.getByText('-5%')).toBeInTheDocument();
  });

  it('renders subtext when provided', () => {
    render(<StatCard label="MRR" value="$5,000" subtext="3 past due" />);
    expect(screen.getByText('3 past due')).toBeInTheDocument();
  });

  it('renders loading skeleton when loading', () => {
    const { container } = render(<StatCard label="MRR" value="$5,000" loading />);
    expect(container.querySelector('.admin-skeleton')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/components/admin/ui/__tests__/StatCard.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/admin/ui/StatCard.tsx
'use client';

interface Trend {
  value: number;
  positive: boolean;
}

interface StatCardProps {
  label: string;
  value: string;
  trend?: Trend;
  subtext?: string;
  loading?: boolean;
  onClick?: () => void;
}

export function StatCard({ label, value, trend, subtext, loading, onClick }: StatCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
        <div className="admin-skeleton mb-3 h-3 w-20" />
        <div className="admin-skeleton mb-2 h-8 w-24" />
        <div className="admin-skeleton h-3 w-16" />
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5 transition-colors duration-150 ${onClick ? 'cursor-pointer hover:bg-[var(--admin-bg-hover)]' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">{label}</p>
      <p className="mt-1 text-[32px] leading-tight font-bold text-[var(--admin-text-primary)]">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {trend && (
          <span className={`text-xs font-medium ${trend.positive ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend.positive ? '↑' : '↓'}
            {trend.positive ? '+' : '-'}
            {trend.value}%
          </span>
        )}
        {subtext && <span className="text-xs text-[var(--admin-text-secondary)]">{subtext}</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/components/admin/ui/__tests__/StatCard.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ui/StatCard.tsx src/components/admin/ui/__tests__/StatCard.test.tsx
git commit -m "feat(admin): add StatCard KPI component with tests"
```

---

### Task 4: Modal Component

**Files:**

- Create: `src/components/admin/ui/Modal.tsx`
- Create: `src/components/admin/ui/__tests__/Modal.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/ui/__tests__/Modal.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../Modal';

describe('Modal', () => {
  it('renders when open', () => {
    render(
      <Modal open onClose={() => {}} title="Test Modal">
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Test Modal">
        <p>Content</p>
      </Modal>
    );
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Test">
        <p>Body</p>
      </Modal>
    );
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Test">
        <p>Body</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders confirm variant with action buttons', () => {
    const onConfirm = vi.fn();
    render(
      <Modal open onClose={() => {}} title="Confirm" onConfirm={onConfirm} confirmLabel="Delete" variant="danger">
        <p>Are you sure?</p>
      </Modal>
    );
    fireEvent.click(screen.getByText('Delete'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/components/admin/ui/__tests__/Modal.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/admin/ui/Modal.tsx
'use client';

import { useEffect, useCallback, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  loading?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  const confirmBtnClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-[var(--admin-accent-blue)] hover:bg-[var(--admin-accent-blue-light)] text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div data-testid="modal-backdrop" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="animate-in fade-in zoom-in-95 relative z-10 w-full max-w-md rounded-xl border border-[var(--admin-border-emphasis)] bg-[var(--admin-bg-card)] p-6 shadow-2xl duration-200">
        <h2 className="text-lg font-semibold text-[var(--admin-text-primary)]">{title}</h2>
        <div className="mt-4 text-sm text-[var(--admin-text-secondary)]">{children}</div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--admin-border-emphasis)] px-4 py-2 text-sm text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-hover)]"
          >
            {cancelLabel}
          </button>
          {onConfirm && (
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${confirmBtnClass} disabled:opacity-50`}
            >
              {loading ? 'Processing...' : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/components/admin/ui/__tests__/Modal.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ui/Modal.tsx src/components/admin/ui/__tests__/Modal.test.tsx
git commit -m "feat(admin): add Modal component with tests"
```

---

### Task 5: SearchInput Component

**Files:**

- Create: `src/components/admin/ui/SearchInput.tsx`
- Create: `src/components/admin/ui/__tests__/SearchInput.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/ui/__tests__/SearchInput.test.tsx
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SearchInput } from '../SearchInput';

describe('SearchInput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with placeholder', () => {
    render(<SearchInput value="" onChange={() => {}} placeholder="Search users..." />);
    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
  });

  it('debounces onChange by 300ms', () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onChange).toHaveBeenCalledWith('test');
  });

  it('shows clear button when value is non-empty', () => {
    render(<SearchInput value="hello" onChange={() => {}} />);
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('calls onChange with empty string on clear', () => {
    const onChange = vi.fn();
    render(<SearchInput value="hello" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Clear search'));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/components/admin/ui/__tests__/SearchInput.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/admin/ui/SearchInput.tsx
'use client';

import { useState, useEffect, useRef } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
}

export function SearchInput({ value, onChange, placeholder = 'Search...', loading }: SearchInputProps) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleChange = (v: string) => {
    setLocal(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(v), 300);
  };

  const handleClear = () => {
    setLocal('');
    clearTimeout(timerRef.current);
    onChange('');
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div className="relative">
      <svg
        className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--admin-text-muted)]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-primary)] py-2 pr-8 pl-10 text-sm text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent-blue)] focus:outline-none"
      />
      {loading && (
        <div className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-[var(--admin-accent-blue)] border-t-transparent" />
      )}
      {local && !loading && (
        <button
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute top-1/2 right-3 -translate-y-1/2 text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/components/admin/ui/__tests__/SearchInput.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ui/SearchInput.tsx src/components/admin/ui/__tests__/SearchInput.test.tsx
git commit -m "feat(admin): add SearchInput component with debounce and tests"
```

---

### Task 6: Accordion Component

**Files:**

- Create: `src/components/admin/ui/Accordion.tsx`
- Create: `src/components/admin/ui/__tests__/Accordion.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/ui/__tests__/Accordion.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Accordion } from '../Accordion';

describe('Accordion', () => {
  it('renders title', () => {
    render(
      <Accordion title="Section 1">
        <p>Content</p>
      </Accordion>
    );
    expect(screen.getByText('Section 1')).toBeInTheDocument();
  });

  it('hides content by default', () => {
    render(
      <Accordion title="Section 1">
        <p>Hidden content</p>
      </Accordion>
    );
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
  });

  it('shows content when defaultOpen is true', () => {
    render(
      <Accordion title="Section 1" defaultOpen>
        <p>Visible content</p>
      </Accordion>
    );
    expect(screen.getByText('Visible content')).toBeInTheDocument();
  });

  it('toggles content on header click', () => {
    render(
      <Accordion title="Section 1">
        <p>Toggle content</p>
      </Accordion>
    );
    fireEvent.click(screen.getByText('Section 1'));
    expect(screen.getByText('Toggle content')).toBeInTheDocument();
  });

  it('renders badge when provided', () => {
    render(
      <Accordion title="Knowledge" badge="42">
        <p>Items</p>
      </Accordion>
    );
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/components/admin/ui/__tests__/Accordion.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/admin/ui/Accordion.tsx
'use client';

import { useState, type ReactNode } from 'react';

interface AccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
}

export function Accordion({ title, children, defaultOpen = false, badge }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [rendered, setRendered] = useState(defaultOpen);

  const toggle = () => {
    if (!rendered) setRendered(true);
    setOpen((o) => !o);
  };

  return (
    <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)]">
      <button onClick={toggle} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">{title}</h3>
          {badge !== undefined && (
            <span className="rounded-full bg-[var(--admin-bg-hover)] px-2 py-0.5 text-xs text-[var(--admin-text-secondary)]">
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`h-5 w-5 text-[var(--admin-text-muted)] transition-transform duration-250 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {rendered && (
        <div
          className={`overflow-hidden transition-all duration-250 ease-in-out ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="border-t border-[var(--admin-border-subtle)] px-5 py-4">{children}</div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/components/admin/ui/__tests__/Accordion.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ui/Accordion.tsx src/components/admin/ui/__tests__/Accordion.test.tsx
git commit -m "feat(admin): add Accordion component with lazy rendering and tests"
```

---

### Task 7: QuickActionMenu Component

**Files:**

- Create: `src/components/admin/ui/QuickActionMenu.tsx`
- Create: `src/components/admin/ui/__tests__/QuickActionMenu.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/ui/__tests__/QuickActionMenu.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickActionMenu, type MenuItem } from '../QuickActionMenu';

const items: MenuItem[] = [
  { label: 'Edit', onClick: vi.fn() },
  { type: 'divider' },
  { label: 'Delete', onClick: vi.fn(), variant: 'danger' },
];

describe('QuickActionMenu', () => {
  it('renders trigger button', () => {
    render(<QuickActionMenu items={items} />);
    expect(screen.getByLabelText('Actions')).toBeInTheDocument();
  });

  it('shows menu on click', () => {
    render(<QuickActionMenu items={items} />);
    fireEvent.click(screen.getByLabelText('Actions'));
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls onClick and closes menu', () => {
    render(<QuickActionMenu items={items} />);
    fireEvent.click(screen.getByLabelText('Actions'));
    fireEvent.click(screen.getByText('Edit'));
    expect(items[0].onClick).toHaveBeenCalled();
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('renders submenu items', () => {
    const subItems: MenuItem[] = [
      {
        label: 'Change Plan',
        submenu: [
          { label: 'Basic', onClick: vi.fn() },
          { label: 'Pro', onClick: vi.fn() },
        ],
      },
    ];
    render(<QuickActionMenu items={subItems} />);
    fireEvent.click(screen.getByLabelText('Actions'));
    fireEvent.click(screen.getByText('Change Plan'));
    expect(screen.getByText('Basic')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/components/admin/ui/__tests__/QuickActionMenu.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/admin/ui/QuickActionMenu.tsx
'use client';

import { useState, useRef, useEffect } from 'react';

export type MenuItem =
  | { type: 'divider' }
  | {
      label: string;
      onClick?: () => void;
      variant?: 'default' | 'danger';
      submenu?: MenuItem[];
      type?: never;
    };

interface QuickActionMenuProps {
  items: MenuItem[];
}

export function QuickActionMenu({ items }: QuickActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [submenuIndex, setSubmenuIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSubmenuIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleItemClick = (item: MenuItem, index: number) => {
    if ('type' in item && item.type === 'divider') return;
    if (!('label' in item)) return;
    if (item.submenu) {
      setSubmenuIndex(submenuIndex === index ? null : index);
      return;
    }
    item.onClick?.();
    setOpen(false);
    setSubmenuIndex(null);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Actions"
        className="rounded-md p-1.5 text-[var(--admin-text-muted)] hover:bg-[var(--admin-bg-hover)] hover:text-[var(--admin-text-secondary)]"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-[var(--admin-border-emphasis)] bg-[var(--admin-bg-card)] py-1 shadow-xl">
          {items.map((item, i) => {
            if ('type' in item && item.type === 'divider') {
              return <div key={i} className="my-1 border-t border-[var(--admin-border-subtle)]" />;
            }
            if (!('label' in item)) return null;
            const isDanger = item.variant === 'danger';
            return (
              <div key={i}>
                <button
                  onClick={() => handleItemClick(item, i)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${isDanger ? 'text-red-400 hover:bg-red-500/10' : 'text-[var(--admin-text-primary)] hover:bg-[var(--admin-bg-hover)]'}`}
                >
                  {item.label}
                  {item.submenu && (
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
                {item.submenu && submenuIndex === i && (
                  <div className="border-t border-[var(--admin-border-subtle)] bg-[var(--admin-bg-primary)] py-1">
                    {item.submenu.map((sub, si) => {
                      if ('type' in sub && sub.type === 'divider')
                        return <div key={si} className="my-1 border-t border-[var(--admin-border-subtle)]" />;
                      if (!('label' in sub)) return null;
                      return (
                        <button
                          key={si}
                          onClick={() => {
                            sub.onClick?.();
                            setOpen(false);
                            setSubmenuIndex(null);
                          }}
                          className="w-full px-4 py-1.5 text-left text-sm text-[var(--admin-text-primary)] hover:bg-[var(--admin-bg-hover)]"
                        >
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/components/admin/ui/__tests__/QuickActionMenu.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ui/QuickActionMenu.tsx src/components/admin/ui/__tests__/QuickActionMenu.test.tsx
git commit -m "feat(admin): add QuickActionMenu dropdown with submenu support and tests"
```

---

### Task 8: FilterBar Component

**Files:**

- Create: `src/components/admin/ui/FilterBar.tsx`
- Create: `src/components/admin/ui/__tests__/FilterBar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/ui/__tests__/FilterBar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar, type FilterConfig } from '../FilterBar';

const filters: FilterConfig[] = [
  {
    key: 'plan',
    label: 'Plan',
    options: [
      { value: 'basic', label: 'Basic' },
      { value: 'pro', label: 'Pro' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'trial', label: 'Trial' },
    ],
  },
];

describe('FilterBar', () => {
  it('renders filter dropdowns', () => {
    render(<FilterBar filters={filters} values={{}} onChange={() => {}} />);
    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('calls onChange when filter selected', () => {
    const onChange = vi.fn();
    render(<FilterBar filters={filters} values={{}} onChange={onChange} />);
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'basic' } });
    expect(onChange).toHaveBeenCalledWith({ plan: 'basic' });
  });

  it('shows clear all when filters are active', () => {
    render(<FilterBar filters={filters} values={{ plan: 'basic' }} onChange={() => {}} />);
    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  it('clears all filters on clear click', () => {
    const onChange = vi.fn();
    render(<FilterBar filters={filters} values={{ plan: 'basic' }} onChange={onChange} />);
    fireEvent.click(screen.getByText('Clear all'));
    expect(onChange).toHaveBeenCalledWith({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/components/admin/ui/__tests__/FilterBar.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/admin/ui/FilterBar.tsx
'use client';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

interface FilterBarProps {
  filters: FilterConfig[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}

export function FilterBar({ filters, values, onChange }: FilterBarProps) {
  const hasActive = Object.keys(values).length > 0;

  const handleChange = (key: string, value: string) => {
    const next = { ...values };
    if (value) {
      next[key] = value;
    } else {
      delete next[key];
    }
    onChange(next);
  };

  return (
    <div className="flex items-center gap-3">
      {filters.map((f) => (
        <select
          key={f.key}
          value={values[f.key] ?? ''}
          onChange={(e) => handleChange(f.key, e.target.value)}
          className="rounded-lg border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-primary)] px-3 py-2 text-sm text-[var(--admin-text-primary)] focus:border-[var(--admin-accent-blue)] focus:outline-none"
        >
          <option value="">{f.label}</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
      {hasActive && (
        <button onClick={() => onChange({})} className="text-sm text-[var(--admin-accent-blue)] hover:underline">
          Clear all
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/components/admin/ui/__tests__/FilterBar.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ui/FilterBar.tsx src/components/admin/ui/__tests__/FilterBar.test.tsx
git commit -m "feat(admin): add FilterBar component with tests"
```

---

### Task 9: DataTable Component

**Files:**

- Create: `src/components/admin/ui/DataTable.tsx`
- Create: `src/components/admin/ui/__tests__/DataTable.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/ui/__tests__/DataTable.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, type Column } from '../DataTable';

interface Row {
  id: string;
  name: string;
  email: string;
}

const columns: Column<Row>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email' },
];

const data: Row[] = [
  { id: '1', name: 'Alice', email: 'alice@test.com' },
  { id: '2', name: 'Bob', email: 'bob@test.com' },
  { id: '3', name: 'Charlie', email: 'charlie@test.com' },
];

describe('DataTable', () => {
  it('renders column headers', () => {
    render(<DataTable columns={columns} data={data} rowKey="id" />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders all rows', () => {
    render(<DataTable columns={columns} data={data} rowKey="id" />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('sorts by column on header click', () => {
    render(<DataTable columns={columns} data={data} rowKey="id" />);
    fireEvent.click(screen.getByText('Name'));
    const cells = screen.getAllByRole('cell');
    // Default sort ascending — Alice first
    expect(cells[0].textContent).toBe('Alice');
    // Click again for descending
    fireEvent.click(screen.getByText('Name'));
    const cellsDesc = screen.getAllByRole('cell');
    expect(cellsDesc[0].textContent).toBe('Charlie');
  });

  it('renders empty state when no data', () => {
    render(<DataTable columns={columns} data={[]} rowKey="id" emptyMessage="No users found" />);
    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('renders loading skeleton', () => {
    const { container } = render(<DataTable columns={columns} data={[]} rowKey="id" loading />);
    expect(container.querySelectorAll('.admin-skeleton').length).toBeGreaterThan(0);
  });

  it('calls onRowClick when row clicked', () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} data={data} rowKey="id" onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText('Alice'));
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });

  it('supports row selection with checkboxes', () => {
    const onSelectionChange = vi.fn();
    render(<DataTable columns={columns} data={data} rowKey="id" selectable onSelectionChange={onSelectionChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is "select all", rest are per-row
    expect(checkboxes).toHaveLength(4);
    fireEvent.click(checkboxes[1]); // select first row
    expect(onSelectionChange).toHaveBeenCalledWith(['1']);
  });

  it('paginates when pageSize is set', () => {
    render(<DataTable columns={columns} data={data} rowKey="id" pageSize={2} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText('Charlie')).not.toBeInTheDocument();
    // Go to page 2
    fireEvent.click(screen.getByLabelText('Next page'));
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/components/admin/ui/__tests__/DataTable.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/admin/ui/DataTable.tsx
'use client';

import { useState, useMemo, type ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: keyof T;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  onSelectionChange?: (selectedKeys: string[]) => void;
  pageSize?: number;
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  onRowClick,
  selectable,
  onSelectionChange,
  pageSize,
  loading,
  emptyMessage = 'No data',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = String(a[sortKey] ?? '');
      const bv = String(b[sortKey] ?? '');
      const cmp = av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = pageSize ? Math.ceil(sorted.length / pageSize) : 1;
  const paginated = pageSize ? sorted.slice(page * pageSize, (page + 1) * pageSize) : sorted;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleSelect = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
    onSelectionChange?.([...next]);
  };

  const toggleAll = () => {
    if (selected.size === data.length) {
      setSelected(new Set());
      onSelectionChange?.([]);
    } else {
      const all = data.map((r) => String(r[rowKey]));
      setSelected(new Set(all));
      onSelectionChange?.(all);
    }
  };

  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--admin-border-subtle)]">
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 text-left">
                  <div className="admin-skeleton h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-[var(--admin-border-subtle)]">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3">
                    <div className="admin-skeleton h-4 w-24" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)]">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--admin-border-subtle)]">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === data.length && data.length > 0}
                    onChange={toggleAll}
                    className="rounded border-[var(--admin-border-emphasis)]"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  className={`px-4 py-3 text-left text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase ${col.sortable ? 'cursor-pointer select-none hover:text-[var(--admin-text-secondary)]' : ''}`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  <span className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && <span>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center text-sm text-[var(--admin-text-muted)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginated.map((row) => {
                const key = String(row[rowKey]);
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={`border-b border-[var(--admin-border-subtle)] transition-colors duration-150 ${onRowClick ? 'cursor-pointer hover:bg-[var(--admin-bg-hover)]' : ''}`}
                  >
                    {selectable && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(key)}
                          onChange={() => toggleSelect(key)}
                          className="rounded border-[var(--admin-border-emphasis)]"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-sm text-[var(--admin-text-primary)]" role="cell">
                        {col.render ? col.render(row) : String(row[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {pageSize && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--admin-border-subtle)] px-4 py-3">
          <span className="text-xs text-[var(--admin-text-muted)]">
            Page {page + 1} of {totalPages} ({data.length} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous page"
              className="rounded-md px-3 py-1 text-sm text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-hover)] disabled:opacity-30"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              aria-label="Next page"
              className="rounded-md px-3 py-1 text-sm text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-hover)] disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/components/admin/ui/__tests__/DataTable.test.tsx`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ui/DataTable.tsx src/components/admin/ui/__tests__/DataTable.test.tsx
git commit -m "feat(admin): add DataTable component with sort, pagination, selection, and tests"
```

---

### Task 10: CSV Export Utility

**Files:**

- Create: `src/lib/exportCsv.ts`
- Create: `src/lib/__tests__/exportCsv.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/exportCsv.test.ts
import { generateCsv } from '../exportCsv';

describe('generateCsv', () => {
  it('generates CSV string from data', () => {
    const data = [
      { name: 'Alice', email: 'alice@test.com' },
      { name: 'Bob', email: 'bob@test.com' },
    ];
    const csv = generateCsv(data, ['name', 'email']);
    expect(csv).toBe('name,email\nAlice,alice@test.com\nBob,bob@test.com');
  });

  it('escapes commas in values', () => {
    const data = [{ name: 'Doe, John', email: 'john@test.com' }];
    const csv = generateCsv(data, ['name', 'email']);
    expect(csv).toBe('name,email\n"Doe, John",john@test.com');
  });

  it('escapes quotes in values', () => {
    const data = [{ name: 'O"Brien', email: 'ob@test.com' }];
    const csv = generateCsv(data, ['name', 'email']);
    expect(csv).toBe('name,email\n"O""Brien",ob@test.com');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/lib/__tests__/exportCsv.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/exportCsv.ts
function escapeCell(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCsv<T extends Record<string, unknown>>(data: T[], columns: string[]): string {
  const header = columns.join(',');
  const rows = data.map((row) => columns.map((col) => escapeCell(row[col])).join(','));
  return [header, ...rows].join('\n');
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/lib/__tests__/exportCsv.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/exportCsv.ts src/lib/__tests__/exportCsv.test.ts
git commit -m "feat(admin): add CSV export utility with tests"
```

---

### Task 11: Admin Layout with Sidebar

**Files:**

- Create: `src/app/admin/layout.tsx`
- Create: `src/components/admin/Sidebar.tsx`
- Create: `src/components/admin/ui/__tests__/Sidebar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/ui/__tests__/Sidebar.test.tsx
import { render, screen } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
  useRouter: () => ({ push: vi.fn() }),
}));

import { Sidebar } from '../../Sidebar';

describe('Sidebar', () => {
  it('renders logo text', () => {
    render(<Sidebar />);
    expect(screen.getByText('WinBix AI')).toBeInTheDocument();
  });

  it('renders all navigation links', () => {
    render(<Sidebar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('renders Cmd+K shortcut hint', () => {
    render(<Sidebar />);
    expect(screen.getByText('⌘K')).toBeInTheDocument();
  });

  it('highlights active link based on pathname', () => {
    render(<Sidebar />);
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink?.className).toContain('text-[var(--admin-accent-blue)]');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/components/admin/ui/__tests__/Sidebar.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write Sidebar component**

```tsx
// src/components/admin/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1',
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  },
  {
    href: '/admin/clients',
    label: 'Clients',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  },
  {
    href: '/admin/subscriptions',
    label: 'Subscriptions',
    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed top-0 left-0 z-40 flex h-screen w-[var(--admin-sidebar-width)] flex-col border-r border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)]">
      {/* Logo */}
      <div className="flex h-[var(--admin-header-height)] items-center px-5">
        <span className="text-lg font-semibold text-[var(--admin-text-primary)]">WinBix AI</span>
      </div>

      {/* Search trigger */}
      <div className="px-3 pb-4">
        <button
          className="flex w-full items-center gap-2 rounded-lg border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-primary)] px-3 py-2 text-sm text-[var(--admin-text-muted)] hover:border-[var(--admin-border-emphasis)]"
          onClick={() => document.dispatchEvent(new CustomEvent('open-command-palette'))}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span>Search...</span>
          <span className="ml-auto rounded bg-[var(--admin-bg-hover)] px-1.5 py-0.5 text-[10px] font-medium">⌘K</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
                    active
                      ? 'border-l-2 border-[var(--admin-accent-blue)] bg-[var(--admin-bg-active)] text-[var(--admin-accent-blue)]'
                      : 'text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-hover)] hover:text-[var(--admin-text-primary)]'
                  }`}
                >
                  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                  </svg>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
```

- [ ] **Step 4: Write admin layout**

```tsx
// src/app/admin/layout.tsx
'use client';

import { Sidebar } from '@/components/admin/Sidebar';
import { type ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--admin-bg-primary)]">
      <Sidebar />
      <div className="ml-[var(--admin-sidebar-width)]">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-[var(--admin-header-height)] items-center justify-end border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-primary)]/80 px-6 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            {/* NotificationCenter will be added in Task 13 */}
            <div id="notification-center-slot" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--admin-accent-blue)] text-xs font-medium text-white">
                A
              </div>
              <span className="text-sm text-[var(--admin-text-secondary)]">Admin</span>
            </div>
          </div>
        </header>
        {/* Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/components/admin/ui/__tests__/Sidebar.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/layout.tsx src/components/admin/Sidebar.tsx src/components/admin/ui/__tests__/Sidebar.test.tsx
git commit -m "feat(admin): add admin layout with sidebar navigation"
```

---

### Task 12: CommandPalette (Cmd+K)

**Files:**

- Create: `src/components/admin/CommandPalette.tsx`
- Create: `src/components/admin/ui/__tests__/CommandPalette.test.tsx`
- Modify: `src/app/admin/layout.tsx` (add CommandPalette)

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/ui/__tests__/CommandPalette.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock fetch
global.fetch = vi.fn();

import { CommandPalette } from '../../CommandPalette';

describe('CommandPalette', () => {
  it('does not render when closed', () => {
    render(<CommandPalette />);
    expect(screen.queryByPlaceholderText('Search users, clients...')).not.toBeInTheDocument();
  });

  it('opens on Cmd+K', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByPlaceholderText('Search users, clients...')).toBeInTheDocument();
  });

  it('opens on custom event', () => {
    render(<CommandPalette />);
    document.dispatchEvent(new CustomEvent('open-command-palette'));
    expect(screen.getByPlaceholderText('Search users, clients...')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByPlaceholderText('Search users, clients...')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByPlaceholderText('Search users, clients...')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/components/admin/ui/__tests__/CommandPalette.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write CommandPalette component**

```tsx
// src/components/admin/CommandPalette.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from './ui/StatusBadge';

interface SearchResults {
  users: Array<{ _id: string; email: string; name: string; plan: string; status: string }>;
  clients: Array<{ _id: string; name: string; domain: string; status: string; ownerEmail: string }>;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const router = useRouter();

  const allItems = [
    ...(results?.users.map((u) => ({
      type: 'user' as const,
      id: u._id,
      label: u.email,
      sub: u.name,
      status: u.status,
    })) ?? []),
    ...(results?.clients.map((c) => ({
      type: 'client' as const,
      id: c._id,
      label: c.name,
      sub: c.domain,
      status: c.status,
    })) ?? []),
  ];

  const handleOpen = useCallback(() => {
    setOpen(true);
    setQuery('');
    setResults(null);
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleOpen();
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    const handleCustom = () => handleOpen();
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('open-command-palette', handleCustom);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('open-command-palette', handleCustom);
    };
  }, [open, handleOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.data ?? data);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  const handleSelect = (item: (typeof allItems)[0]) => {
    setOpen(false);
    if (item.type === 'user') router.push(`/admin/users/${item.id}`);
    else router.push(`/admin/clients/${item.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' && allItems[selectedIndex]) {
      handleSelect(allItems[selectedIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-[var(--admin-border-emphasis)] bg-[var(--admin-bg-card)] shadow-2xl">
        <div className="flex items-center border-b border-[var(--admin-border-subtle)] px-4">
          <svg className="h-5 w-5 text-[var(--admin-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search users, clients..."
            className="flex-1 bg-transparent px-3 py-4 text-sm text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-muted)] focus:outline-none"
          />
          {loading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--admin-accent-blue)] border-t-transparent" />
          )}
        </div>
        {results && (
          <div className="max-h-80 overflow-y-auto py-2">
            {allItems.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[var(--admin-text-muted)]">No results found</p>
            ) : (
              <>
                {results.users.length > 0 && (
                  <div className="px-3 py-1.5">
                    <span className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">
                      Users
                    </span>
                  </div>
                )}
                {results.users.map((u, i) => (
                  <button
                    key={u._id}
                    onClick={() =>
                      handleSelect({ type: 'user', id: u._id, label: u.email, sub: u.name, status: u.status })
                    }
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left ${selectedIndex === i ? 'bg-[var(--admin-bg-hover)]' : ''}`}
                  >
                    <div className="flex-1">
                      <p className="text-sm text-[var(--admin-text-primary)]">{u.email}</p>
                      <p className="text-xs text-[var(--admin-text-muted)]">{u.name}</p>
                    </div>
                    <StatusBadge status={u.status} />
                  </button>
                ))}
                {results.clients.length > 0 && (
                  <div className="px-3 py-1.5">
                    <span className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">
                      Clients
                    </span>
                  </div>
                )}
                {results.clients.map((c, ci) => (
                  <button
                    key={c._id}
                    onClick={() =>
                      handleSelect({ type: 'client', id: c._id, label: c.name, sub: c.domain, status: c.status })
                    }
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left ${selectedIndex === results.users.length + ci ? 'bg-[var(--admin-bg-hover)]' : ''}`}
                  >
                    <div className="flex-1">
                      <p className="text-sm text-[var(--admin-text-primary)]">{c.name}</p>
                      <p className="text-xs text-[var(--admin-text-muted)]">{c.domain}</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </button>
                ))}
              </>
            )}
          </div>
        )}
        <div className="border-t border-[var(--admin-border-subtle)] px-4 py-2">
          <div className="flex items-center gap-4 text-[11px] text-[var(--admin-text-muted)]">
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
            <span>Esc Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add CommandPalette to admin layout**

In `src/app/admin/layout.tsx`, add `import { CommandPalette } from '@/components/admin/CommandPalette';` and render `<CommandPalette />` as the last child inside the outer `<div>`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/components/admin/ui/__tests__/CommandPalette.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/CommandPalette.tsx src/components/admin/ui/__tests__/CommandPalette.test.tsx src/app/admin/layout.tsx
git commit -m "feat(admin): add CommandPalette global search with Cmd+K"
```

---

### Task 13: NotificationCenter

**Files:**

- Create: `src/components/admin/NotificationCenter.tsx`
- Create: `src/components/admin/ui/__tests__/NotificationCenter.test.tsx`
- Modify: `src/app/admin/layout.tsx` (add NotificationCenter to header)

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/admin/ui/__tests__/NotificationCenter.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockAlerts = [
  {
    id: '1',
    type: 'past_due',
    title: 'Past Due Payment',
    message: 'alice@test.com — overdue',
    link: '/admin/users/1',
    severity: 'danger',
  },
  {
    id: '2',
    type: 'trial_expiring',
    title: 'Trial Expiring',
    message: 'bob@test.com — 2 days left',
    link: '/admin/users/2',
    severity: 'warning',
  },
];

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: mockAlerts }),
});

import { NotificationCenter } from '../../NotificationCenter';

describe('NotificationCenter', () => {
  it('renders bell icon', () => {
    render(<NotificationCenter />);
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
  });

  it('shows unread badge with count', async () => {
    render(<NotificationCenter />);
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('toggles dropdown on click', async () => {
    render(<NotificationCenter />);
    await waitFor(() => screen.getByText('2'));
    fireEvent.click(screen.getByLabelText('Notifications'));
    expect(screen.getByText('Past Due Payment')).toBeInTheDocument();
    expect(screen.getByText('Trial Expiring')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/components/admin/ui/__tests__/NotificationCenter.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write NotificationCenter component**

```tsx
// src/components/admin/NotificationCenter.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  severity: 'danger' | 'warning' | 'info';
}

const severityColors: Record<string, string> = {
  danger: 'border-l-red-500',
  warning: 'border-l-amber-500',
  info: 'border-l-blue-500',
};

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.data ?? []);
      }
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        className="relative rounded-md p-2 text-[var(--admin-text-muted)] hover:bg-[var(--admin-bg-hover)] hover:text-[var(--admin-text-secondary)]"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {alerts.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {alerts.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-[var(--admin-border-emphasis)] bg-[var(--admin-bg-card)] shadow-xl">
          <div className="border-b border-[var(--admin-border-subtle)] px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[var(--admin-text-muted)]">All clear</p>
            ) : (
              alerts.map((alert) => (
                <button
                  key={alert.id}
                  onClick={() => {
                    router.push(alert.link);
                    setOpen(false);
                  }}
                  className={`w-full border-l-2 px-4 py-3 text-left hover:bg-[var(--admin-bg-hover)] ${severityColors[alert.severity] ?? ''}`}
                >
                  <p className="text-sm font-medium text-[var(--admin-text-primary)]">{alert.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">{alert.message}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add NotificationCenter to admin layout header**

In `src/app/admin/layout.tsx`, replace the `<div id="notification-center-slot" />` placeholder with `<NotificationCenter />`. Add import: `import { NotificationCenter } from '@/components/admin/NotificationCenter';`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/components/admin/ui/__tests__/NotificationCenter.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/NotificationCenter.tsx src/components/admin/ui/__tests__/NotificationCenter.test.tsx src/app/admin/layout.tsx
git commit -m "feat(admin): add NotificationCenter with 60s polling"
```

---

## Chunk 2: API Routes

### Task 14: Admin Stats API (Dashboard Data)

**Files:**

- Create: `src/app/api/admin/stats/route.ts`
- Create: `src/app/api/admin/stats/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/admin/stats/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyAdmin: vi.fn().mockResolvedValue({ authenticated: true, role: 'admin' }),
}));

const mockUserAggregate = vi.fn();
const mockUserCountDocuments = vi.fn();
const mockClientCountDocuments = vi.fn();
const mockChatLogAggregate = vi.fn();
const mockUserFind = vi.fn();
const mockClientFind = vi.fn();

vi.mock('@/models/User', () => ({
  default: {
    aggregate: mockUserAggregate,
    countDocuments: mockUserCountDocuments,
    find: mockUserFind,
  },
}));
vi.mock('@/models/Client', () => ({
  default: {
    countDocuments: mockClientCountDocuments,
    find: mockClientFind,
  },
}));
vi.mock('@/models/ChatLog', () => ({
  default: { aggregate: mockChatLogAggregate },
}));

import { GET } from '../route';
import { NextRequest } from 'next/server';

describe('GET /api/admin/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserCountDocuments.mockResolvedValue(100);
    mockClientCountDocuments.mockResolvedValue(50);
    mockUserAggregate.mockResolvedValue([{ basic: 10, pro: 5 }]);
    mockChatLogAggregate.mockResolvedValue([{ count: 200 }]);
    mockUserFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }),
    });
    mockClientFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }),
    });
  });

  it('returns 200 with dashboard stats', async () => {
    const req = new NextRequest('http://localhost/api/admin/stats');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.kpi).toBeDefined();
    expect(body.data.kpi.totalUsers).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/app/api/admin/stats/__tests__/route.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the API route**

```ts
// src/app/api/admin/stats/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import User from '@/models/User';
import Client from '@/models/Client';
import ChatLog from '@/models/ChatLog';

const PLAN_PRICES = { basic: 29, pro: 79 } as const;

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const [
    totalUsers,
    totalClients,
    planCounts,
    activeChatsToday,
    usersLastMonth,
    clientsLastMonth,
    recentUsers,
    recentClients,
    pastDueCount,
  ] = await Promise.all([
    User.countDocuments(),
    Client.countDocuments(),
    User.aggregate([
      {
        $group: {
          _id: null,
          basic: { $sum: { $cond: [{ $eq: ['$plan', 'basic'] }, 1, 0] } },
          pro: { $sum: { $cond: [{ $eq: ['$plan', 'pro'] }, 1, 0] } },
        },
      },
    ]),
    ChatLog.aggregate([{ $match: { createdAt: { $gte: todayStart } } }, { $group: { _id: null, count: { $sum: 1 } } }]),
    User.countDocuments({ createdAt: { $lt: monthAgo } }),
    Client.countDocuments({ createdAt: { $lt: monthAgo } }),
    User.find().sort({ createdAt: -1 }).limit(10).lean(),
    Client.find().sort({ createdAt: -1 }).limit(10).lean(),
    User.countDocuments({ subscriptionStatus: 'past_due' }),
  ]);

  const counts = planCounts[0] ?? { basic: 0, pro: 0 };
  const mrr = counts.basic * PLAN_PRICES.basic + counts.pro * PLAN_PRICES.pro;
  const chatsToday = activeChatsToday[0]?.count ?? 0;

  const usersTrend = usersLastMonth > 0 ? Math.round(((totalUsers - usersLastMonth) / usersLastMonth) * 100) : 0;
  const clientsTrend =
    clientsLastMonth > 0 ? Math.round(((totalClients - clientsLastMonth) / clientsLastMonth) * 100) : 0;

  // Alerts: past_due + trial expiring in 3 days
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const [pastDueUsers, expiringTrials] = await Promise.all([
    User.find({ subscriptionStatus: 'past_due' }).limit(10).lean(),
    User.find({
      subscriptionStatus: 'trial',
      trialEndsAt: { $lte: threeDaysFromNow, $gte: now },
    })
      .limit(10)
      .lean(),
  ]);

  const alerts = [
    ...pastDueUsers.map((u) => ({
      id: String(u._id),
      type: 'past_due',
      title: 'Past Due Payment',
      message: `${u.email} — payment overdue`,
      link: `/admin/users/${u._id}`,
      severity: 'danger' as const,
    })),
    ...expiringTrials.map((u) => ({
      id: String(u._id),
      type: 'trial_expiring',
      title: 'Trial Expiring',
      message: `${u.email} — expires ${u.trialEndsAt ? new Date(u.trialEndsAt).toLocaleDateString() : 'soon'}`,
      link: `/admin/users/${u._id}`,
      severity: 'warning' as const,
    })),
  ];

  return successResponse({
    kpi: {
      totalUsers,
      totalClients,
      mrr,
      activeChatsToday: chatsToday,
      pastDueCount,
      trends: {
        users: usersTrend,
        clients: clientsTrend,
      },
    },
    alerts,
    recentUsers: recentUsers.map((u) => ({
      _id: String(u._id),
      email: u.email,
      name: u.name,
      plan: u.plan,
      subscriptionStatus: u.subscriptionStatus,
      createdAt: u.createdAt,
    })),
    recentClients: recentClients.map((c) => ({
      _id: String(c._id),
      clientId: c.clientId,
      name: c.name || c.clientId,
      domain: c.domain || '',
      subscriptionStatus: c.subscriptionStatus,
      createdAt: c.createdAt,
    })),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/app/api/admin/stats/__tests__/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/stats/route.ts src/app/api/admin/stats/__tests__/route.test.ts
git commit -m "feat(admin): add /api/admin/stats dashboard stats API"
```

---

**Note on API tests (Tasks 15–21):** These routes use heavy MongoDB mocking that provides limited value for admin-only endpoints used by 2 admins. Task 14 demonstrates the TDD pattern. Implementers should add integration tests as needed, but unit tests for these CRUD routes are optional. Focus testing effort on the shared UI components (Tasks 2–9) which have full TDD coverage.

**Note on Toast:** The existing `src/components/ui/Toast.tsx` provides `useToast()`, `toastSuccess()`, `toastError()`. All admin pages reuse it — no new admin Toast needed. Import path: `@/components/ui/Toast`.

### Task 15: Admin Search API

**Files:**

- Create: `src/app/api/admin/search/route.ts`

- [ ] **Step 1: Write the route**

```ts
// src/app/api/admin/search/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import User from '@/models/User';
import Client from '@/models/Client';

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) return successResponse({ users: [], clients: [] });

  await connectDB();

  const regex = new RegExp(q, 'i');

  const [users, clients] = await Promise.all([
    User.find({ $or: [{ email: regex }, { name: regex }] })
      .select('email name plan subscriptionStatus')
      .limit(10)
      .lean(),
    Client.find({ $or: [{ name: regex }, { domain: regex }, { clientId: regex }] })
      .select('clientId name domain subscriptionStatus userId')
      .limit(10)
      .lean(),
  ]);

  // Resolve owner emails for clients
  const userIds = [...new Set(clients.map((c) => c.userId).filter(Boolean))];
  const owners =
    userIds.length > 0
      ? await User.find({ _id: { $in: userIds } })
          .select('email')
          .lean()
      : [];
  const ownerMap = new Map(owners.map((o) => [String(o._id), o.email]));

  return successResponse({
    users: users.map((u) => ({
      _id: String(u._id),
      email: u.email,
      name: u.name,
      plan: u.plan,
      status: u.subscriptionStatus,
    })),
    clients: clients.map((c) => ({
      _id: String(c._id),
      name: c.name || c.clientId,
      domain: c.domain || '',
      status: c.subscriptionStatus,
      ownerEmail: c.userId ? (ownerMap.get(String(c.userId)) ?? '') : '',
    })),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/search/route.ts
git commit -m "feat(admin): add /api/admin/search global search API"
```

---

### Task 16: Admin Notifications API

**Files:**

- Create: `src/app/api/admin/notifications/route.ts`

- [ ] **Step 1: Write the route**

```ts
// src/app/api/admin/notifications/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { successResponse } from '@/lib/apiResponse';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();

  const now = new Date();
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const [pastDueUsers, expiringTrials] = await Promise.all([
    User.find({ subscriptionStatus: 'past_due' }).select('email name').limit(20).lean(),
    User.find({
      subscriptionStatus: 'trial',
      trialEndsAt: { $lte: threeDaysFromNow, $gte: now },
    })
      .select('email name trialEndsAt')
      .limit(20)
      .lean(),
  ]);

  const alerts = [
    ...pastDueUsers.map((u) => ({
      id: String(u._id),
      type: 'past_due',
      title: 'Past Due Payment',
      message: `${u.email} — payment overdue`,
      link: `/admin/users/${u._id}`,
      severity: 'danger' as const,
    })),
    ...expiringTrials.map((u) => ({
      id: String(u._id),
      type: 'trial_expiring',
      title: 'Trial Expiring',
      message: `${u.email} — expires ${u.trialEndsAt ? new Date(u.trialEndsAt).toLocaleDateString() : 'soon'}`,
      link: `/admin/users/${u._id}`,
      severity: 'warning' as const,
    })),
  ];

  return successResponse(alerts);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/notifications/route.ts
git commit -m "feat(admin): add /api/admin/notifications alerts API"
```

---

### Task 17: Admin Users API (List + Profile + Update + Delete)

**Files:**

- Create: `src/app/api/admin/users/route.ts`
- Create: `src/app/api/admin/users/[id]/route.ts`

- [ ] **Step 1: Write users list route**

```ts
// src/app/api/admin/users/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { successResponse } from '@/lib/apiResponse';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();

  const params = request.nextUrl.searchParams;
  const page = parseInt(params.get('page') ?? '1');
  const limit = parseInt(params.get('limit') ?? '20');
  const search = params.get('search')?.trim();
  const plan = params.get('plan');
  const status = params.get('status');
  const sortBy = params.get('sortBy') ?? 'createdAt';
  const sortDir = params.get('sortDir') === 'asc' ? 1 : -1;

  const filter: Record<string, unknown> = {};
  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [{ email: regex }, { name: regex }];
  }
  if (plan) filter.plan = plan;
  if (status) filter.subscriptionStatus = status;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash -refreshTokens -passwordResetToken -passwordResetExpires -emailVerificationToken')
      .sort({ [sortBy]: sortDir })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return successResponse({
    users: users.map((u) => ({ ...u, _id: String(u._id) })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
```

- [ ] **Step 2: Write user profile / update / delete route**

```ts
// src/app/api/admin/users/[id]/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import User from '@/models/User';
import Client from '@/models/Client';
import ChatLog from '@/models/ChatLog';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  await connectDB();

  const user = await User.findById(id)
    .select('-passwordHash -refreshTokens -passwordResetToken -passwordResetExpires -emailVerificationToken')
    .lean();
  if (!user) return Errors.notFound('User not found');

  const clients = await Client.find({ userId: id }).select('clientId name domain subscriptionStatus createdAt').lean();

  // Usage stats
  const totalMessages = await ChatLog.aggregate([
    { $match: { clientId: { $in: clients.map((c) => c.clientId) } } },
    { $unwind: '$messages' },
    { $match: { 'messages.role': 'user' } },
    { $count: 'total' },
  ]);

  return successResponse({
    user: { ...user, _id: String(user._id) },
    clients: clients.map((c) => ({ ...c, _id: String(c._id) })),
    stats: {
      totalMessages: totalMessages[0]?.total ?? 0,
      clientsCount: clients.length,
    },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  const body = await request.json();
  await connectDB();

  const allowedFields = ['plan', 'subscriptionStatus', 'trialEndsAt', 'billingPeriod'];
  const update: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) update[field] = body[field];
  }

  if (Object.keys(update).length === 0) return Errors.badRequest('No valid fields to update');

  const user = await User.findByIdAndUpdate(id, { $set: update }, { new: true })
    .select('-passwordHash -refreshTokens -passwordResetToken -passwordResetExpires -emailVerificationToken')
    .lean();

  if (!user) return Errors.notFound('User not found');

  return successResponse({ user: { ...user, _id: String(user._id) } });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  await connectDB();

  const user = await User.findById(id);
  if (!user) return Errors.notFound('User not found');

  // Delete user's clients and associated data
  const clients = await Client.find({ userId: id });
  for (const client of clients) {
    await ChatLog.deleteMany({ clientId: client.clientId });
    await client.deleteOne();
  }

  await user.deleteOne();

  return successResponse(null, 'User deleted');
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/users/route.ts src/app/api/admin/users/[id]/route.ts
git commit -m "feat(admin): add Users CRUD API routes (list, profile, update, delete)"
```

---

### Task 18: Admin Users Impersonate API

**Files:**

- Create: `src/app/api/admin/users/[id]/impersonate/route.ts`

- [ ] **Step 1: Write the route**

```ts
// src/app/api/admin/users/[id]/impersonate/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  await connectDB();

  const user = await User.findById(id).select('email name').lean();
  if (!user) return Errors.notFound('User not found');

  const secret = process.env.JWT_SECRET;
  if (!secret) return Errors.internal('JWT secret not configured');

  const token = jwt.sign({ userId: String(user._id), email: user.email, impersonated: true }, secret, {
    expiresIn: '1h',
  });

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  return successResponse({ token, expiresAt, email: user.email });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/users/[id]/impersonate/route.ts
git commit -m "feat(admin): add user impersonation API (1h JWT)"
```

---

### Task 19: Admin Clients API (List + Profile + Update + Delete)

**Files:**

- Create: `src/app/api/admin/clients/route.ts` (new list endpoint)
- Create: `src/app/api/admin/clients/[id]/route.ts` (profile + update + delete)

Note: Some client API routes already exist under `/api/admin/clients/[id]/`. Check existing routes and only create ones that don't exist. The new routes should provide list/filter capabilities and a unified profile response.

- [ ] **Step 1: Write clients list route**

```ts
// src/app/api/admin/clients/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { successResponse } from '@/lib/apiResponse';
import Client from '@/models/Client';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();

  const params = request.nextUrl.searchParams;
  const page = parseInt(params.get('page') ?? '1');
  const limit = parseInt(params.get('limit') ?? '20');
  const search = params.get('search')?.trim();
  const clientType = params.get('clientType');
  const status = params.get('status');

  const filter: Record<string, unknown> = {};
  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [{ name: regex }, { domain: regex }, { clientId: regex }];
  }
  if (clientType) filter.clientType = clientType;
  if (status) filter.subscriptionStatus = status;

  const [clients, total] = await Promise.all([
    Client.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Client.countDocuments(filter),
  ]);

  // Resolve owner emails
  const userIds = [...new Set(clients.map((c) => c.userId).filter(Boolean))];
  const owners =
    userIds.length > 0
      ? await User.find({ _id: { $in: userIds } })
          .select('email')
          .lean()
      : [];
  const ownerMap = new Map(owners.map((o) => [String(o._id), o.email]));

  return successResponse({
    clients: clients.map((c) => ({
      ...c,
      _id: String(c._id),
      ownerEmail: c.userId ? (ownerMap.get(String(c.userId)) ?? '') : '',
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
```

- [ ] **Step 2: Write client profile / update / delete route**

Check if `src/app/api/admin/clients/[id]/route.ts` already exists. If it does, extend it. If not, create it:

```ts
// src/app/api/admin/clients/[id]/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import Client from '@/models/Client';
import ChatLog from '@/models/ChatLog';
import User from '@/models/User';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  await connectDB();

  const client = await Client.findOne({ $or: [{ _id: id }, { clientId: id }] }).lean();
  if (!client) return Errors.notFound('Client not found');

  // Get owner info
  let owner = null;
  if (client.userId) {
    owner = await User.findById(client.userId).select('email name plan subscriptionStatus').lean();
  }

  // Get recent chat sessions count
  const totalSessions = await ChatLog.countDocuments({ clientId: client.clientId });

  return successResponse({
    client: { ...client, _id: String(client._id) },
    owner: owner ? { ...owner, _id: String(owner._id) } : null,
    stats: { totalSessions },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  const body = await request.json();
  await connectDB();

  // Whitelist allowed fields to prevent arbitrary updates
  const allowedFields = ['name', 'domain', 'subscriptionStatus', 'extraCreditsUsd', 'widgetPosition', 'primaryColor'];
  const update: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) update[field] = body[field];
  }
  if (Object.keys(update).length === 0) return Errors.badRequest('No valid fields to update');

  const client = await Client.findOneAndUpdate(
    { $or: [{ _id: id }, { clientId: id }] },
    { $set: update },
    { new: true }
  ).lean();

  if (!client) return Errors.notFound('Client not found');

  return successResponse({ client: { ...client, _id: String(client._id) } });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  await connectDB();

  const client = await Client.findOne({ $or: [{ _id: id }, { clientId: id }] });
  if (!client) return Errors.notFound('Client not found');

  await ChatLog.deleteMany({ clientId: client.clientId });
  await client.deleteOne();

  return successResponse(null, 'Client deleted');
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/clients/route.ts src/app/api/admin/clients/[id]/route.ts
git commit -m "feat(admin): add Clients list/profile/update/delete API routes"
```

---

### Task 20: Admin Subscriptions API

**Files:**

- Create: `src/app/api/admin/subscriptions/route.ts`
- Create: `src/app/api/admin/subscriptions/batch/route.ts`

- [ ] **Step 1: Write subscriptions list route**

```ts
// src/app/api/admin/subscriptions/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { successResponse } from '@/lib/apiResponse';
import User from '@/models/User';
import Client from '@/models/Client';

const PLAN_PRICES: Record<string, number> = { basic: 29, pro: 79 };

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();

  const params = request.nextUrl.searchParams;
  const plan = params.get('plan');
  const status = params.get('status');
  const expiringWithin = params.get('expiringWithin'); // '7d' or '30d'

  const filter: Record<string, unknown> = {};
  if (plan) filter.plan = plan;
  if (status) filter.subscriptionStatus = status;
  if (expiringWithin) {
    const days = parseInt(expiringWithin);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    filter.trialEndsAt = { $lte: cutoff, $gte: new Date() };
    filter.subscriptionStatus = 'trial';
  }

  const users = await User.find(filter)
    .select('-passwordHash -refreshTokens -passwordResetToken -passwordResetExpires -emailVerificationToken')
    .sort({ createdAt: -1 })
    .lean();

  // Count clients per user
  const userIds = users.map((u) => u._id);
  const clientCounts = await Client.aggregate([
    { $match: { userId: { $in: userIds } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(clientCounts.map((c) => [String(c._id), c.count]));

  // Summary cards
  const activeCount = await User.countDocuments({ subscriptionStatus: 'active' });
  const now = new Date();
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const trialsExpiringThisWeek = await User.countDocuments({
    subscriptionStatus: 'trial',
    trialEndsAt: { $lte: weekFromNow, $gte: now },
  });
  const pastDueCount = await User.countDocuments({ subscriptionStatus: 'past_due' });

  const totalMRR = users.reduce((sum, u) => sum + (PLAN_PRICES[u.plan] ?? 0), 0);

  return successResponse({
    summary: {
      activeSubscriptions: activeCount,
      trialsExpiringThisWeek,
      pastDue: pastDueCount,
      mrr: totalMRR,
    },
    users: users.map((u) => ({
      ...u,
      _id: String(u._id),
      clientsCount: countMap.get(String(u._id)) ?? 0,
      mrrAmount: PLAN_PRICES[u.plan] ?? 0,
    })),
  });
}
```

- [ ] **Step 2: Write batch operations route**

```ts
// src/app/api/admin/subscriptions/batch/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  const { action, userIds, value } = await request.json();

  if (!action || !Array.isArray(userIds) || userIds.length === 0) {
    return Errors.badRequest('Missing action or userIds');
  }

  await connectDB();

  let result;

  switch (action) {
    case 'extend_trial': {
      const days = parseInt(value) || 7;
      result = await User.updateMany({ _id: { $in: userIds } }, [
        {
          $set: {
            trialEndsAt: { $dateAdd: { startDate: { $ifNull: ['$trialEndsAt', '$$NOW'] }, unit: 'day', amount: days } },
          },
        },
      ]);
      break;
    }
    case 'change_plan': {
      if (!['none', 'basic', 'pro'].includes(value)) return Errors.badRequest('Invalid plan');
      result = await User.updateMany({ _id: { $in: userIds } }, { $set: { plan: value } });
      break;
    }
    default:
      return Errors.badRequest(`Unknown action: ${action}`);
  }

  return successResponse({ modifiedCount: result.modifiedCount });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/subscriptions/route.ts src/app/api/admin/subscriptions/batch/route.ts
git commit -m "feat(admin): add Subscriptions list and batch actions API"
```

---

### Task 21: Admin Analytics API

**Files:**

- Create: `src/app/api/admin/analytics/route.ts`

- [ ] **Step 1: Write the route**

```ts
// src/app/api/admin/analytics/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { successResponse } from '@/lib/apiResponse';
import ChatLog from '@/models/ChatLog';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();

  const days = parseInt(request.nextUrl.searchParams.get('days') ?? '30');
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Messages per day
  const messagesPerDay = await ChatLog.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $unwind: '$messages' },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Messages by channel
  const messagesByChannel = await ChatLog.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $ifNull: ['$metadata.channel', 'website'] },
        count: { $sum: { $size: '$messages' } },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // Top 10 active clients
  const topClients = await ChatLog.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: '$clientId', messageCount: { $sum: { $size: '$messages' } } } },
    { $sort: { messageCount: -1 } },
    { $limit: 10 },
  ]);

  // User growth (registrations per day)
  const userGrowth = await User.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Chat quality metrics
  const chatQuality = await ChatLog.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: null,
        avgMessages: { $avg: { $size: '$messages' } },
        totalSessions: { $sum: 1 },
      },
    },
  ]);

  return successResponse({
    messagesPerDay: messagesPerDay.map((d) => ({ date: d._id, count: d.count })),
    messagesByChannel: messagesByChannel.map((d) => ({ channel: d._id, count: d.count })),
    topClients: topClients.map((d) => ({ clientId: d._id, messageCount: d.messageCount })),
    userGrowth: userGrowth.map((d) => ({ date: d._id, count: d.count })),
    chatQuality: {
      avgConversationLength: Math.round(chatQuality[0]?.avgMessages ?? 0),
      totalSessions: chatQuality[0]?.totalSessions ?? 0,
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/analytics/route.ts
git commit -m "feat(admin): add /api/admin/analytics with usage metrics"
```

---

## Chunk 3: Dashboard Page

### Task 22: Dashboard KPI Cards

**Files:**

- Create: `src/components/admin/dashboard/KPICards.tsx`

- [ ] **Step 1: Write KPICards component**

```tsx
// src/components/admin/dashboard/KPICards.tsx
'use client';

import { StatCard } from '@/components/admin/ui/StatCard';

interface KPIData {
  totalUsers: number;
  totalClients: number;
  mrr: number;
  activeChatsToday: number;
  pastDueCount: number;
  trends: { users: number; clients: number };
}

interface KPICardsProps {
  data: KPIData | null;
  loading: boolean;
}

export function KPICards({ data, loading }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Users"
        value={data ? data.totalUsers.toLocaleString() : '—'}
        trend={data ? { value: Math.abs(data.trends.users), positive: data.trends.users >= 0 } : undefined}
        loading={loading}
      />
      <StatCard
        label="Total Clients"
        value={data ? data.totalClients.toLocaleString() : '—'}
        trend={data ? { value: Math.abs(data.trends.clients), positive: data.trends.clients >= 0 } : undefined}
        loading={loading}
      />
      <StatCard
        label="MRR"
        value={data ? `$${data.mrr.toLocaleString()}` : '—'}
        subtext={data && data.pastDueCount > 0 ? `${data.pastDueCount} past due` : undefined}
        loading={loading}
      />
      <StatCard
        label="Active Chats Today"
        value={data ? data.activeChatsToday.toLocaleString() : '—'}
        loading={loading}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/dashboard/KPICards.tsx
git commit -m "feat(admin): add dashboard KPI cards component"
```

---

### Task 23: Dashboard Activity Chart

**Files:**

- Create: `src/components/admin/dashboard/ActivityChart.tsx`

- [ ] **Step 1: Write ActivityChart component**

```tsx
// src/components/admin/dashboard/ActivityChart.tsx
'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ActivityChartProps {
  data: Array<{ date: string; registrations?: number; activeUsers?: number; messages?: number }>;
  loading: boolean;
}

const periods = ['7d', '30d', '90d'] as const;

export function ActivityChart({ data, loading }: ActivityChartProps) {
  const [period, setPeriod] = useState<(typeof periods)[number]>('30d');

  const filteredData = (() => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    return data.slice(-days);
  })();

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
        <div className="admin-skeleton mb-4 h-4 w-32" />
        <div className="admin-skeleton h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">Activity</h3>
        <div className="flex gap-1 rounded-lg bg-[var(--admin-bg-primary)] p-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-[var(--admin-accent-blue)] text-white'
                  : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={filteredData}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--admin-bg-card)',
              border: '1px solid var(--admin-border-emphasis)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Line
            type="monotone"
            dataKey="registrations"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
            name="Registrations"
          />
          <Line
            type="monotone"
            dataKey="activeUsers"
            stroke="#34D399"
            strokeWidth={2}
            dot={false}
            name="Active Users"
          />
          <Line type="monotone" dataKey="messages" stroke="#818CF8" strokeWidth={2} dot={false} name="Messages" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/dashboard/ActivityChart.tsx
git commit -m "feat(admin): add dashboard activity chart with recharts"
```

---

### Task 24: Dashboard Alerts List

**Files:**

- Create: `src/components/admin/dashboard/AlertsList.tsx`

- [ ] **Step 1: Write AlertsList component**

```tsx
// src/components/admin/dashboard/AlertsList.tsx
'use client';

import { useRouter } from 'next/navigation';

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  severity: 'danger' | 'warning' | 'info';
}

interface AlertsListProps {
  alerts: Alert[];
  loading: boolean;
}

const severityBorder: Record<string, string> = {
  danger: 'border-l-red-500',
  warning: 'border-l-amber-500',
  info: 'border-l-blue-500',
};

export function AlertsList({ alerts, loading }: AlertsListProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
        <div className="admin-skeleton mb-4 h-4 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="admin-skeleton mb-3 h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
      <h3 className="mb-4 text-base font-semibold text-[var(--admin-text-primary)]">Alerts & Actions</h3>
      {alerts.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--admin-text-muted)]">All clear — no alerts</p>
      ) : (
        <div className="space-y-2">
          {alerts.slice(0, 10).map((alert) => (
            <button
              key={alert.id}
              onClick={() => router.push(alert.link)}
              className={`w-full rounded-lg border-l-2 bg-[var(--admin-bg-primary)] px-4 py-3 text-left transition-colors hover:bg-[var(--admin-bg-hover)] ${severityBorder[alert.severity] ?? ''}`}
            >
              <p className="text-sm font-medium text-[var(--admin-text-primary)]">{alert.title}</p>
              <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">{alert.message}</p>
            </button>
          ))}
          {alerts.length > 10 && (
            <button
              onClick={() => router.push('/admin/subscriptions?status=past_due')}
              className="mt-2 text-sm text-[var(--admin-accent-blue)] hover:underline"
            >
              View all ({alerts.length})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/dashboard/AlertsList.tsx
git commit -m "feat(admin): add dashboard alerts list component"
```

---

### Task 25: Dashboard Recent Tables

**Files:**

- Create: `src/components/admin/dashboard/RecentTables.tsx`

- [ ] **Step 1: Write RecentTables component**

```tsx
// src/components/admin/dashboard/RecentTables.tsx
'use client';

import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';

interface RecentUser {
  _id: string;
  email: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
  createdAt: string;
}

interface RecentClient {
  _id: string;
  clientId: string;
  name: string;
  domain: string;
  subscriptionStatus: string;
  createdAt: string;
}

interface RecentTablesProps {
  recentUsers: RecentUser[];
  recentClients: RecentClient[];
  loading: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function RecentTables({ recentUsers, recentClients, loading }: RecentTablesProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
            <div className="admin-skeleton mb-4 h-4 w-32" />
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="admin-skeleton mb-2 h-10 w-full" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Recent Users */}
      <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)]">
        <div className="border-b border-[var(--admin-border-subtle)] px-5 py-4">
          <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">Recent Users</h3>
        </div>
        <div className="divide-y divide-[var(--admin-border-subtle)]">
          {recentUsers.map((u) => (
            <button
              key={u._id}
              onClick={() => router.push(`/admin/users/${u._id}`)}
              className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-[var(--admin-bg-hover)]"
            >
              <div>
                <p className="text-sm text-[var(--admin-text-primary)]">{u.email}</p>
                <p className="text-xs text-[var(--admin-text-muted)]">{timeAgo(u.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={u.plan} />
                <StatusBadge status={u.subscriptionStatus} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Clients */}
      <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)]">
        <div className="border-b border-[var(--admin-border-subtle)] px-5 py-4">
          <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">Recent Clients</h3>
        </div>
        <div className="divide-y divide-[var(--admin-border-subtle)]">
          {recentClients.map((c) => (
            <button
              key={c._id}
              onClick={() => router.push(`/admin/clients/${c._id}`)}
              className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-[var(--admin-bg-hover)]"
            >
              <div>
                <p className="text-sm text-[var(--admin-text-primary)]">{c.name}</p>
                <p className="text-xs text-[var(--admin-text-muted)]">{c.domain || c.clientId}</p>
              </div>
              <StatusBadge status={c.subscriptionStatus} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/dashboard/RecentTables.tsx
git commit -m "feat(admin): add dashboard recent users/clients tables"
```

---

### Task 26: Dashboard Page (Wire Everything Together)

**Files:**

- Create: `src/app/admin/page.tsx` (replace existing)

- [ ] **Step 1: Write the dashboard page**

```tsx
// src/app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { KPICards } from '@/components/admin/dashboard/KPICards';
import { ActivityChart } from '@/components/admin/dashboard/ActivityChart';
import { AlertsList } from '@/components/admin/dashboard/AlertsList';
import { RecentTables } from '@/components/admin/dashboard/RecentTables';

interface DashboardData {
  kpi: {
    totalUsers: number;
    totalClients: number;
    mrr: number;
    activeChatsToday: number;
    pastDueCount: number;
    trends: { users: number; clients: number };
  };
  alerts: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    link: string;
    severity: 'danger' | 'warning' | 'info';
  }>;
  recentUsers: Array<{
    _id: string;
    email: string;
    name: string;
    plan: string;
    subscriptionStatus: string;
    createdAt: string;
  }>;
  recentClients: Array<{
    _id: string;
    clientId: string;
    name: string;
    domain: string;
    subscriptionStatus: string;
    createdAt: string;
  }>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[var(--admin-text-primary)]">Dashboard</h1>

      <KPICards data={data?.kpi ?? null} loading={loading} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ActivityChart data={[]} loading={loading} />
        <AlertsList alerts={data?.alerts ?? []} loading={loading} />
      </div>

      <RecentTables recentUsers={data?.recentUsers ?? []} recentClients={data?.recentClients ?? []} loading={loading} />
    </div>
  );
}
```

**Important:** The implementer must wire ActivityChart to call `/api/admin/analytics?days=30` on mount and map the response data (`messagesPerDay`, `userGrowth`) into the format `ActivityChart` expects (`{ date, registrations, activeUsers, messages }`). Do NOT leave the empty array — the chart must show real data on the dashboard.

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat(admin): add dashboard page wiring KPI, alerts, recent tables"
```

---

## Chunk 4: Users Pages

### Task 27: Users List Page

**Files:**

- Create: `src/app/admin/users/page.tsx`
- Create: `src/components/admin/users/UsersTable.tsx`

- [ ] **Step 1: Write UsersTable component**

```tsx
// src/components/admin/users/UsersTable.tsx
'use client';

import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { QuickActionMenu, type MenuItem } from '@/components/admin/ui/QuickActionMenu';

interface UserRow {
  _id: string;
  email: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
  createdAt: string;
}

interface UsersTableProps {
  users: UserRow[];
  loading: boolean;
  onAction: (userId: string, action: string, value?: string) => void;
  onSelectionChange?: (ids: string[]) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function UsersTable({ users, loading, onAction, onSelectionChange }: UsersTableProps) {
  const router = useRouter();

  const columns: Column<UserRow>[] = [
    { key: 'email', header: 'Email', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    {
      key: 'plan',
      header: 'Plan',
      sortable: true,
      render: (row) => <StatusBadge status={row.plan} />,
    },
    {
      key: 'subscriptionStatus',
      header: 'Status',
      sortable: true,
      render: (row) => <StatusBadge status={row.subscriptionStatus} />,
    },
    {
      key: 'createdAt',
      header: 'Registered',
      sortable: true,
      render: (row) => <span className="text-xs text-[var(--admin-text-muted)]">{timeAgo(row.createdAt)}</span>,
    },
    {
      key: '_actions',
      header: '',
      width: '48px',
      render: (row) => {
        const items: MenuItem[] = [
          {
            label: 'Change Plan',
            submenu: [
              { label: 'None', onClick: () => onAction(row._id, 'change_plan', 'none') },
              { label: 'Basic', onClick: () => onAction(row._id, 'change_plan', 'basic') },
              { label: 'Pro', onClick: () => onAction(row._id, 'change_plan', 'pro') },
            ],
          },
          {
            label: 'Extend Trial',
            submenu: [
              { label: '+7 days', onClick: () => onAction(row._id, 'extend_trial', '7') },
              { label: '+14 days', onClick: () => onAction(row._id, 'extend_trial', '14') },
              { label: '+30 days', onClick: () => onAction(row._id, 'extend_trial', '30') },
            ],
          },
          { label: 'Impersonate', onClick: () => onAction(row._id, 'impersonate') },
          { type: 'divider' },
          { label: 'Delete', onClick: () => onAction(row._id, 'delete'), variant: 'danger' },
        ];
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <QuickActionMenu items={items} />
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      rowKey="_id"
      onRowClick={(row) => router.push(`/admin/users/${row._id}`)}
      selectable
      onSelectionChange={onSelectionChange}
      pageSize={20}
      loading={loading}
      emptyMessage="No users found"
    />
  );
}
```

- [ ] **Step 2: Write users list page**

```tsx
// src/app/admin/users/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { SearchInput } from '@/components/admin/ui/SearchInput';
import { FilterBar, type FilterConfig } from '@/components/admin/ui/FilterBar';
import { UsersTable } from '@/components/admin/users/UsersTable';
import { Modal } from '@/components/admin/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { generateCsv, downloadCsv } from '@/lib/exportCsv';

const filters: FilterConfig[] = [
  {
    key: 'plan',
    label: 'Plan',
    options: [
      { value: 'none', label: 'None' },
      { value: 'basic', label: 'Basic' },
      { value: 'pro', label: 'Pro' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'trial', label: 'Trial' },
      { value: 'active', label: 'Active' },
      { value: 'past_due', label: 'Past Due' },
      { value: 'canceled', label: 'Canceled' },
    ],
  },
];

interface UserRow {
  _id: string;
  email: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; userId: string; email: string }>({
    open: false,
    userId: '',
    email: '',
  });
  const { toastSuccess, toastError } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterValues.plan) params.set('plan', filterValues.plan);
      if (filterValues.status) params.set('status', filterValues.status);

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const json = await res.json();
        setUsers(json.data.users);
      }
    } finally {
      setLoading(false);
    }
  }, [search, filterValues]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAction = async (userId: string, action: string, value?: string) => {
    if (action === 'delete') {
      const user = users.find((u) => u._id === userId);
      setDeleteModal({ open: true, userId, email: user?.email ?? '' });
      return;
    }

    if (action === 'impersonate') {
      try {
        const res = await fetch(`/api/admin/users/${userId}/impersonate`, { method: 'POST' });
        if (res.ok) {
          const json = await res.json();
          window.open(`/dashboard?impersonate_token=${json.data.token}`, '_blank');
          toastSuccess(`Impersonating ${json.data.email}`);
        }
      } catch {
        toastError('Failed to impersonate');
      }
      return;
    }

    if (action === 'change_plan') {
      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: value }),
        });
        if (res.ok) {
          toastSuccess(`Plan changed to ${value}`);
          fetchUsers();
        }
      } catch {
        toastError('Failed to change plan');
      }
      return;
    }

    if (action === 'extend_trial') {
      try {
        const days = parseInt(value ?? '7');
        const user = users.find((u) => u._id === userId);
        const currentEnd = user?.subscriptionStatus === 'trial' ? new Date() : new Date();
        currentEnd.setDate(currentEnd.getDate() + days);

        const res = await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trialEndsAt: currentEnd.toISOString(), subscriptionStatus: 'trial' }),
        });
        if (res.ok) {
          toastSuccess(`Trial extended by ${days} days`);
          fetchUsers();
        }
      } catch {
        toastError('Failed to extend trial');
      }
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/admin/users/${deleteModal.userId}`, { method: 'DELETE' });
      if (res.ok) {
        toastSuccess('User deleted');
        setDeleteModal({ open: false, userId: '', email: '' });
        fetchUsers();
      }
    } catch {
      toastError('Failed to delete user');
    }
  };

  const handleExport = () => {
    const csv = generateCsv(users, ['email', 'name', 'plan', 'subscriptionStatus', 'createdAt']);
    downloadCsv(csv, `users-export-${new Date().toISOString().slice(0, 10)}.csv`);
    toastSuccess('CSV exported');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text-primary)]">Users</h1>
        <button
          onClick={handleExport}
          className="rounded-lg border border-[var(--admin-border-subtle)] px-4 py-2 text-sm text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-hover)]"
        >
          Export CSV
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by email or name..." />
        </div>
        <FilterBar filters={filters} values={filterValues} onChange={setFilterValues} />
      </div>

      <UsersTable users={users} loading={loading} onAction={handleAction} onSelectionChange={setSelectedIds} />

      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, userId: '', email: '' })}
        title="Delete User"
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="danger"
      >
        <p>
          Are you sure you want to delete <strong>{deleteModal.email}</strong>? This will also delete all their clients
          and data. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 3: Create users directory**

```bash
mkdir -p src/app/admin/users
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/users/page.tsx src/components/admin/users/UsersTable.tsx
git commit -m "feat(admin): add Users list page with search, filters, quick actions"
```

---

### Task 28: User Profile Page

**Files:**

- Create: `src/app/admin/users/[id]/page.tsx`
- Create: `src/components/admin/users/UserProfile.tsx`

- [ ] **Step 1: Write UserProfile component**

```tsx
// src/components/admin/users/UserProfile.tsx
'use client';

import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { useRouter } from 'next/navigation';

interface UserData {
  _id: string;
  email: string;
  name: string;
  plan: string;
  billingPeriod: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ClientData {
  _id: string;
  clientId: string;
  name: string;
  domain: string;
  subscriptionStatus: string;
  createdAt: string;
}

interface UserProfileProps {
  user: UserData;
  clients: ClientData[];
  stats: { totalMessages: number; clientsCount: number };
  onAction: (action: string, value?: string) => void;
}

export function UserProfile({ user, clients, stats, onAction }: UserProfileProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--admin-text-primary)]">{user.email}</h1>
          <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">{user.name}</p>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={user.plan} />
            <StatusBadge status={user.subscriptionStatus} />
            {user.emailVerified && <span className="text-xs text-emerald-400">Verified</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onAction('change_plan')}
            className="rounded-lg bg-[var(--admin-accent-blue)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--admin-accent-blue-light)]"
          >
            Change Plan
          </button>
          <button
            onClick={() => onAction('impersonate')}
            className="rounded-lg border border-[var(--admin-border-subtle)] px-4 py-2 text-sm text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-hover)]"
          >
            Impersonate
          </button>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left — Subscription */}
        <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
          <h3 className="mb-4 text-base font-semibold text-[var(--admin-text-primary)]">Subscription Details</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-[var(--admin-text-muted)]">Plan</dt>
              <dd className="text-sm text-[var(--admin-text-primary)]">{user.plan}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-[var(--admin-text-muted)]">Status</dt>
              <dd>
                <StatusBadge status={user.subscriptionStatus} />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-[var(--admin-text-muted)]">Billing Period</dt>
              <dd className="text-sm text-[var(--admin-text-primary)]">{user.billingPeriod}</dd>
            </div>
            {user.trialEndsAt && (
              <div className="flex justify-between">
                <dt className="text-sm text-[var(--admin-text-muted)]">Trial Ends</dt>
                <dd className="text-sm text-[var(--admin-text-primary)]">
                  {new Date(user.trialEndsAt).toLocaleDateString()}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-sm text-[var(--admin-text-muted)]">Stripe Customer</dt>
              <dd className="text-sm text-[var(--admin-accent-blue)]">{user.stripeCustomerId}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-[var(--admin-text-muted)]">Registered</dt>
              <dd className="text-sm text-[var(--admin-text-primary)]">
                {new Date(user.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => onAction('extend_trial')}
              className="rounded-lg border border-[var(--admin-border-subtle)] px-3 py-1.5 text-sm text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-hover)]"
            >
              Extend Trial
            </button>
            <button
              onClick={() => onAction('cancel')}
              className="rounded-lg border border-red-500/20 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Right — Usage */}
        <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
          <h3 className="mb-4 text-base font-semibold text-[var(--admin-text-primary)]">Usage Stats</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-[var(--admin-text-muted)]">Total Messages</dt>
              <dd className="text-sm text-[var(--admin-text-primary)]">{stats.totalMessages.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-[var(--admin-text-muted)]">Active Clients</dt>
              <dd className="text-sm text-[var(--admin-text-primary)]">{stats.clientsCount}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Bottom — Client List */}
      <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)]">
        <div className="border-b border-[var(--admin-border-subtle)] px-5 py-4">
          <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">Clients ({clients.length})</h3>
        </div>
        {clients.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[var(--admin-text-muted)]">No clients</p>
        ) : (
          <div className="divide-y divide-[var(--admin-border-subtle)]">
            {clients.map((c) => (
              <button
                key={c._id}
                onClick={() => router.push(`/admin/clients/${c._id}`)}
                className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-[var(--admin-bg-hover)]"
              >
                <div>
                  <p className="text-sm text-[var(--admin-text-primary)]">{c.name || c.clientId}</p>
                  <p className="text-xs text-[var(--admin-text-muted)]">{c.domain}</p>
                </div>
                <StatusBadge status={c.subscriptionStatus} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write user profile page**

```tsx
// src/app/admin/users/[id]/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/components/admin/users/UserProfile';
import { Modal } from '@/components/admin/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{ user: any; clients: any[]; stats: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [planModal, setPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const router = useRouter();
  const { toastSuccess, toastError } = useToast();

  const fetchUser = async () => {
    try {
      const res = await fetch(`/api/admin/users/${id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [id]);

  const handleAction = async (action: string, value?: string) => {
    if (action === 'change_plan') {
      setSelectedPlan(data?.user?.plan ?? 'none');
      setPlanModal(true);
      return;
    }

    if (action === 'impersonate') {
      const res = await fetch(`/api/admin/users/${id}/impersonate`, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        window.open(`/dashboard?impersonate_token=${json.data.token}`, '_blank');
        toastSuccess(`Impersonating ${json.data.email}`);
      }
      return;
    }

    if (action === 'extend_trial') {
      const days = parseInt(value ?? '7');
      const newEnd = new Date();
      newEnd.setDate(newEnd.getDate() + days);
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trialEndsAt: newEnd.toISOString(), subscriptionStatus: 'trial' }),
      });
      if (res.ok) {
        toastSuccess(`Trial extended by ${days} days`);
        fetchUser();
      }
      return;
    }

    if (action === 'cancel') {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionStatus: 'canceled' }),
      });
      if (res.ok) {
        toastSuccess('Subscription canceled');
        fetchUser();
      }
    }
  };

  const handleChangePlan = async () => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: selectedPlan }),
    });
    if (res.ok) {
      toastSuccess(`Plan changed to ${selectedPlan}`);
      setPlanModal(false);
      fetchUser();
    } else {
      toastError('Failed to change plan');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="admin-skeleton h-8 w-64" />
        <div className="grid grid-cols-2 gap-6">
          <div className="admin-skeleton h-64" />
          <div className="admin-skeleton h-64" />
        </div>
      </div>
    );
  }

  if (!data) {
    return <p className="text-[var(--admin-text-muted)]">User not found</p>;
  }

  return (
    <>
      <button
        onClick={() => router.push('/admin/users')}
        className="mb-4 text-sm text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)]"
      >
        ← Back to Users
      </button>
      <UserProfile user={data.user} clients={data.clients} stats={data.stats} onAction={handleAction} />

      <Modal
        open={planModal}
        onClose={() => setPlanModal(false)}
        title="Change Plan"
        onConfirm={handleChangePlan}
        confirmLabel="Save"
      >
        <div className="space-y-2">
          {['none', 'basic', 'pro'].map((p) => (
            <label
              key={p}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--admin-border-subtle)] px-4 py-3 hover:bg-[var(--admin-bg-hover)]"
            >
              <input
                type="radio"
                name="plan"
                value={p}
                checked={selectedPlan === p}
                onChange={() => setSelectedPlan(p)}
              />
              <span className="text-sm text-[var(--admin-text-primary)] capitalize">{p}</span>
              {p === 'basic' && <span className="text-xs text-[var(--admin-text-muted)]">$29/mo</span>}
              {p === 'pro' && <span className="text-xs text-[var(--admin-text-muted)]">$79/mo</span>}
            </label>
          ))}
        </div>
      </Modal>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/users/[id]/page.tsx src/components/admin/users/UserProfile.tsx
git commit -m "feat(admin): add User profile page with subscription details and actions"
```

---

## Chunk 5: Clients Pages

### Task 29: Clients List Page

**Files:**

- Create: `src/app/admin/clients/page.tsx`
- Create: `src/components/admin/clients/ClientsTable.tsx`

- [ ] **Step 1: Write ClientsTable component**

```tsx
// src/components/admin/clients/ClientsTable.tsx
'use client';

import { useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';

interface ClientRow {
  _id: string;
  clientId: string;
  name: string;
  domain: string;
  clientType: string;
  subscriptionStatus: string;
  ownerEmail: string;
  createdAt: string;
}

interface ClientsTableProps {
  clients: ClientRow[];
  loading: boolean;
  onSelectionChange?: (ids: string[]) => void;
}

export function ClientsTable({ clients, loading, onSelectionChange }: ClientsTableProps) {
  const router = useRouter();

  const columns: Column<ClientRow>[] = [
    { key: 'name', header: 'Name', sortable: true, render: (row) => <span>{row.name || row.clientId}</span> },
    { key: 'domain', header: 'Domain', sortable: true },
    {
      key: 'ownerEmail',
      header: 'Owner',
      sortable: true,
      render: (row) => <span className="text-[var(--admin-accent-blue)]">{row.ownerEmail || '—'}</span>,
    },
    { key: 'clientType', header: 'Type', render: (row) => <StatusBadge status={row.clientType} /> },
    { key: 'subscriptionStatus', header: 'Status', render: (row) => <StatusBadge status={row.subscriptionStatus} /> },
  ];

  return (
    <DataTable
      columns={columns}
      data={clients}
      rowKey="_id"
      onRowClick={(row) => router.push(`/admin/clients/${row._id}`)}
      selectable
      onSelectionChange={onSelectionChange}
      pageSize={20}
      loading={loading}
      emptyMessage="No clients found"
    />
  );
}
```

- [ ] **Step 2: Write clients list page**

```tsx
// src/app/admin/clients/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { SearchInput } from '@/components/admin/ui/SearchInput';
import { FilterBar, type FilterConfig } from '@/components/admin/ui/FilterBar';
import { ClientsTable } from '@/components/admin/clients/ClientsTable';
import { generateCsv, downloadCsv } from '@/lib/exportCsv';
import { useToast } from '@/components/ui/Toast';

const filters: FilterConfig[] = [
  {
    key: 'clientType',
    label: 'Type',
    options: [
      { value: 'full', label: 'Full' },
      { value: 'quick', label: 'Quick' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'trial', label: 'Trial' },
      { value: 'pending', label: 'Pending' },
    ],
  },
];

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const { toastSuccess } = useToast();

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterValues.clientType) params.set('clientType', filterValues.clientType);
      if (filterValues.status) params.set('status', filterValues.status);

      const res = await fetch(`/api/admin/clients?${params}`);
      if (res.ok) {
        const json = await res.json();
        setClients(json.data.clients);
      }
    } finally {
      setLoading(false);
    }
  }, [search, filterValues]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text-primary)]">Clients</h1>
        <button
          onClick={() => {
            const csv = generateCsv(clients, [
              'clientId',
              'name',
              'domain',
              'clientType',
              'subscriptionStatus',
              'ownerEmail',
            ]);
            downloadCsv(csv, `clients-export-${new Date().toISOString().slice(0, 10)}.csv`);
            toastSuccess('CSV exported');
          }}
          className="rounded-lg border border-[var(--admin-border-subtle)] px-4 py-2 text-sm text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-hover)]"
        >
          Export CSV
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name or domain..." />
        </div>
        <FilterBar filters={filters} values={filterValues} onChange={setFilterValues} />
      </div>

      <ClientsTable clients={clients} loading={loading} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/clients/page.tsx src/components/admin/clients/ClientsTable.tsx
git commit -m "feat(admin): add Clients list page with search and filters"
```

---

### Task 30: Client Profile Page (Accordion Sections)

**Files:**

- Create: `src/app/admin/clients/[id]/page.tsx`
- Create: `src/components/admin/clients/sections/OverviewSection.tsx`
- Create: `src/components/admin/clients/sections/AISettingsSection.tsx`
- Create: `src/components/admin/clients/sections/KnowledgeSection.tsx`
- Create: `src/components/admin/clients/sections/ChannelsSection.tsx`
- Create: `src/components/admin/clients/sections/ChatLogsSection.tsx`
- Create: `src/components/admin/clients/sections/BillingSection.tsx`

- [ ] **Step 1: Write OverviewSection**

```tsx
// src/components/admin/clients/sections/OverviewSection.tsx
'use client';

import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import Link from 'next/link';

interface OverviewSectionProps {
  client: any;
  owner: any;
  stats: { totalSessions: number };
}

export function OverviewSection({ client, owner, stats }: OverviewSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div>
          <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">
            Client ID
          </p>
          <p className="mt-1 text-sm text-[var(--admin-text-primary)]">{client.clientId}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">Domain</p>
          <p className="mt-1 text-sm text-[var(--admin-text-primary)]">{client.domain || '—'}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">Type</p>
          <StatusBadge status={client.clientType} />
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">Status</p>
          <StatusBadge status={client.subscriptionStatus} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div>
          <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">Owner</p>
          {owner ? (
            <Link
              href={`/admin/users/${owner._id}`}
              className="mt-1 text-sm text-[var(--admin-accent-blue)] hover:underline"
            >
              {owner.email}
            </Link>
          ) : (
            <p className="mt-1 text-sm text-[var(--admin-text-muted)]">No owner</p>
          )}
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">
            Total Sessions
          </p>
          <p className="mt-1 text-sm text-[var(--admin-text-primary)]">{stats.totalSessions}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">Created</p>
          <p className="mt-1 text-sm text-[var(--admin-text-primary)]">
            {new Date(client.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write placeholder sections (AI Settings, Knowledge, Channels, ChatLogs, Billing)**

Each section follows the same pattern — a component that fetches its own data when expanded. For the plan, provide skeleton implementations that the implementer will flesh out using existing API routes.

```tsx
// src/components/admin/clients/sections/AISettingsSection.tsx
'use client';

import { useState, useEffect } from 'react';

export function AISettingsSection({ clientId }: { clientId: string }) {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/ai-settings/${clientId}`);
        if (res.ok) {
          const json = await res.json();
          setSettings(json.data || json);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  if (loading) return <div className="admin-skeleton h-40 w-full" />;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">
          System Prompt
        </label>
        <textarea
          value={settings?.systemPrompt ?? ''}
          readOnly
          className="mt-1 w-full rounded-lg border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-primary)] p-3 text-sm text-[var(--admin-text-primary)] focus:outline-none"
          rows={6}
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">Model</p>
          <p className="mt-1 text-sm text-[var(--admin-text-primary)]">{settings?.model ?? '—'}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">
            Temperature
          </p>
          <p className="mt-1 text-sm text-[var(--admin-text-primary)]">{settings?.temperature ?? '—'}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">
            Max Tokens
          </p>
          <p className="mt-1 text-sm text-[var(--admin-text-primary)]">{settings?.maxTokens ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}
```

```tsx
// src/components/admin/clients/sections/KnowledgeSection.tsx
'use client';

import { useState, useEffect } from 'react';

export function KnowledgeSection({ clientId }: { clientId: string }) {
  const [chunks, setChunks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/knowledge?clientId=${clientId}`);
        if (res.ok) {
          const json = await res.json();
          setChunks(json.data || json.chunks || []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  if (loading) return <div className="admin-skeleton h-40 w-full" />;

  return (
    <div>
      <p className="mb-3 text-sm text-[var(--admin-text-secondary)]">{chunks.length} knowledge chunks</p>
      <div className="divide-y divide-[var(--admin-border-subtle)]">
        {chunks.map((chunk: any, i: number) => (
          <div key={chunk._id || i} className="py-2">
            <p className="text-sm text-[var(--admin-text-primary)]">
              {chunk.title || chunk.source || `Chunk ${i + 1}`}
            </p>
            <p className="text-xs text-[var(--admin-text-muted)]">{chunk.content?.slice(0, 100)}...</p>
          </div>
        ))}
        {chunks.length === 0 && <p className="py-4 text-sm text-[var(--admin-text-muted)]">No knowledge chunks</p>}
      </div>
    </div>
  );
}
```

```tsx
// src/components/admin/clients/sections/ChannelsSection.tsx
'use client';

export function ChannelsSection({ client }: { client: any }) {
  const channels = [
    { name: 'Website', connected: true, icon: '🌐' },
    { name: 'Telegram', connected: !!client.telegramBotToken, icon: '📱', detail: client.telegramBotUsername },
    { name: 'WhatsApp', connected: !!client.whatsappPhoneNumber, icon: '💬', detail: client.whatsappPhoneNumber },
    { name: 'Instagram', connected: !!client.instagramToken, icon: '📷', detail: client.instagramAccountName },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {channels.map((ch) => (
        <div
          key={ch.name}
          className={`rounded-lg border px-4 py-3 ${ch.connected ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-[var(--admin-border-subtle)] bg-[var(--admin-bg-primary)]'}`}
        >
          <div className="flex items-center gap-2">
            <span>{ch.icon}</span>
            <span className="text-sm font-medium text-[var(--admin-text-primary)]">{ch.name}</span>
          </div>
          <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
            {ch.connected ? ch.detail || 'Connected' : 'Not connected'}
          </p>
        </div>
      ))}
    </div>
  );
}
```

```tsx
// src/components/admin/clients/sections/ChatLogsSection.tsx
'use client';

import { useState, useEffect } from 'react';

export function ChatLogsSection({ clientId }: { clientId: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Use the existing chatlogs API with clientId filter
        const res = await fetch(`/api/chatlogs?clientId=${clientId}&limit=50`);
        if (!res.ok) {
          // Fallback: some endpoints may not exist yet
          setLogs([]);
          return;
        }
        const json = await res.json();
        setLogs(json.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  if (loading) return <div className="admin-skeleton h-40 w-full" />;

  return (
    <div>
      <p className="mb-3 text-sm text-[var(--admin-text-secondary)]">{logs.length} recent conversations</p>
      {logs.length === 0 ? (
        <p className="py-4 text-sm text-[var(--admin-text-muted)]">No chat logs</p>
      ) : (
        <div className="divide-y divide-[var(--admin-border-subtle)]">
          {logs.map((log: any) => (
            <div key={log._id} className="py-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--admin-text-primary)]">Session {log.sessionId?.slice(0, 8)}...</p>
                <span className="text-xs text-[var(--admin-text-muted)]">{log.messages?.length ?? 0} messages</span>
              </div>
              <p className="text-xs text-[var(--admin-text-muted)]">{new Date(log.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

```tsx
// src/components/admin/clients/sections/BillingSection.tsx
'use client';

import Link from 'next/link';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';

export function BillingSection({ client, owner }: { client: any; owner: any }) {
  return (
    <div className="space-y-4">
      {owner ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">
                Owner Plan
              </p>
              <StatusBadge status={owner.plan} />
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">
                Subscription Status
              </p>
              <StatusBadge status={owner.subscriptionStatus} />
            </div>
          </div>
          <Link href={`/admin/users/${owner._id}`} className="text-sm text-[var(--admin-accent-blue)] hover:underline">
            View owner billing details →
          </Link>
        </>
      ) : (
        <p className="text-sm text-[var(--admin-text-muted)]">No owner linked — billing not applicable</p>
      )}
      {client.extraCreditsUsd > 0 && (
        <div>
          <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">
            Extra Credits
          </p>
          <p className="mt-1 text-sm text-[var(--admin-text-primary)]">${client.extraCreditsUsd}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write client profile page**

```tsx
// src/app/admin/clients/[id]/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Accordion } from '@/components/admin/ui/Accordion';
import { OverviewSection } from '@/components/admin/clients/sections/OverviewSection';
import { AISettingsSection } from '@/components/admin/clients/sections/AISettingsSection';
import { KnowledgeSection } from '@/components/admin/clients/sections/KnowledgeSection';
import { ChannelsSection } from '@/components/admin/clients/sections/ChannelsSection';
import { ChatLogsSection } from '@/components/admin/clients/sections/ChatLogsSection';
import { BillingSection } from '@/components/admin/clients/sections/BillingSection';
import { WidgetSection } from '@/components/admin/clients/sections/WidgetSection';
import { TriggersSection } from '@/components/admin/clients/sections/TriggersSection';

export default function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{ client: any; owner: any; stats: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/clients/${id}`);
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="admin-skeleton h-8 w-64" />
        <div className="admin-skeleton h-40" />
        <div className="admin-skeleton h-12" />
        <div className="admin-skeleton h-12" />
      </div>
    );
  }

  if (!data) return <p className="text-[var(--admin-text-muted)]">Client not found</p>;

  const { client, owner, stats } = data;

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.push('/admin/clients')}
        className="text-sm text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)]"
      >
        ← Back to Clients
      </button>

      <h1 className="text-2xl font-semibold text-[var(--admin-text-primary)]">{client.name || client.clientId}</h1>

      {/* Overview always open */}
      <Accordion title="Overview" defaultOpen>
        <OverviewSection client={client} owner={owner} stats={stats} />
      </Accordion>

      <Accordion title="AI Settings">
        <AISettingsSection clientId={client.clientId} />
      </Accordion>

      <Accordion title="Knowledge Base">
        <KnowledgeSection clientId={client.clientId} />
      </Accordion>

      <Accordion title="Channels">
        <ChannelsSection client={client} />
      </Accordion>

      <Accordion title="Chat Logs">
        <ChatLogsSection clientId={client.clientId} />
      </Accordion>

      <Accordion title="Widget Config">
        <WidgetSection client={client} />
      </Accordion>

      <Accordion title="Billing">
        <BillingSection client={client} owner={owner} />
      </Accordion>

      <Accordion title="Proactive Triggers">
        <TriggersSection clientId={client.clientId} />
      </Accordion>
    </div>
  );
}
```

- [ ] **Step 4: Write WidgetSection and TriggersSection**

```tsx
// src/components/admin/clients/sections/WidgetSection.tsx
'use client';

export function WidgetSection({ client }: { client: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div>
          <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">Position</p>
          <p className="mt-1 text-sm text-[var(--admin-text-primary)]">{client.widgetPosition || 'bottom-right'}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">
            Primary Color
          </p>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-5 w-5 rounded" style={{ backgroundColor: client.primaryColor || '#3B82F6' }} />
            <span className="text-sm text-[var(--admin-text-primary)]">{client.primaryColor || '#3B82F6'}</span>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">
            Widget Type
          </p>
          <p className="mt-1 text-sm text-[var(--admin-text-primary)]">{client.clientType}</p>
        </div>
      </div>
      <p className="text-xs text-[var(--admin-text-muted)]">
        Full widget configuration is managed through the widget builder pipeline.
      </p>
    </div>
  );
}
```

```tsx
// src/components/admin/clients/sections/TriggersSection.tsx
'use client';

import { useState, useEffect } from 'react';

export function TriggersSection({ clientId }: { clientId: string }) {
  const [triggers, setTriggers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/proactive-triggers?clientId=${clientId}`);
        if (res.ok) {
          const json = await res.json();
          setTriggers(json.data || json.triggers || []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  if (loading) return <div className="admin-skeleton h-32 w-full" />;

  return (
    <div>
      <p className="mb-3 text-sm text-[var(--admin-text-secondary)]">{triggers.length} triggers configured</p>
      {triggers.length === 0 ? (
        <p className="py-4 text-sm text-[var(--admin-text-muted)]">No proactive triggers configured</p>
      ) : (
        <div className="divide-y divide-[var(--admin-border-subtle)]">
          {triggers.map((t: any, i: number) => (
            <div key={t._id || i} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm text-[var(--admin-text-primary)]">{t.type || t.triggerType}</p>
                <p className="text-xs text-[var(--admin-text-muted)]">{t.message?.slice(0, 80)}...</p>
              </div>
              <span
                className={`text-xs ${t.enabled !== false ? 'text-emerald-400' : 'text-[var(--admin-text-muted)]'}`}
              >
                {t.enabled !== false ? 'Active' : 'Disabled'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/clients/[id]/page.tsx src/components/admin/clients/sections/
git commit -m "feat(admin): add Client profile page with accordion sections"
```

---

## Chunk 6: Subscriptions, Analytics, Cleanup

### Task 31: Subscriptions Page

**Files:**

- Create: `src/app/admin/subscriptions/page.tsx`
- Create: `src/components/admin/subscriptions/SubscriptionsTable.tsx`

- [ ] **Step 1: Write SubscriptionsTable component**

```tsx
// src/components/admin/subscriptions/SubscriptionsTable.tsx
'use client';

import { DataTable, type Column } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { QuickActionMenu, type MenuItem } from '@/components/admin/ui/QuickActionMenu';

interface SubRow {
  _id: string;
  email: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
  clientsCount: number;
  mrrAmount: number;
  trialEndsAt: string | null;
}

interface SubscriptionsTableProps {
  users: SubRow[];
  loading: boolean;
  onAction: (userId: string, action: string, value?: string) => void;
  onSelectionChange?: (ids: string[]) => void;
}

export function SubscriptionsTable({ users, loading, onAction, onSelectionChange }: SubscriptionsTableProps) {
  const columns: Column<SubRow>[] = [
    { key: 'email', header: 'Email', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'plan', header: 'Plan', render: (row) => <StatusBadge status={row.plan} /> },
    { key: 'subscriptionStatus', header: 'Status', render: (row) => <StatusBadge status={row.subscriptionStatus} /> },
    { key: 'clientsCount', header: 'Clients', sortable: true },
    {
      key: 'trialEndsAt',
      header: 'Expires / Next Payment',
      render: (row) => {
        if (!row.trialEndsAt) return <span className="text-xs text-[var(--admin-text-muted)]">—</span>;
        const d = new Date(row.trialEndsAt);
        const isPast = d < new Date();
        return (
          <span className={`text-xs ${isPast ? 'text-red-400' : 'text-[var(--admin-text-secondary)]'}`}>
            {d.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      key: 'mrrAmount',
      header: 'MRR',
      render: (row) => <span className="text-sm">${row.mrrAmount}</span>,
    },
    {
      key: '_actions',
      header: '',
      width: '48px',
      render: (row) => {
        const items: MenuItem[] = [
          {
            label: 'Extend Trial',
            submenu: [
              { label: '+7 days', onClick: () => onAction(row._id, 'extend_trial', '7') },
              { label: '+14 days', onClick: () => onAction(row._id, 'extend_trial', '14') },
              { label: '+30 days', onClick: () => onAction(row._id, 'extend_trial', '30') },
            ],
          },
          {
            label: 'Change Plan',
            submenu: [
              { label: 'None', onClick: () => onAction(row._id, 'change_plan', 'none') },
              { label: 'Basic', onClick: () => onAction(row._id, 'change_plan', 'basic') },
              { label: 'Pro', onClick: () => onAction(row._id, 'change_plan', 'pro') },
            ],
          },
          { type: 'divider' },
          { label: 'Cancel', onClick: () => onAction(row._id, 'cancel'), variant: 'danger' },
        ];
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <QuickActionMenu items={items} />
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      rowKey="_id"
      selectable
      onSelectionChange={onSelectionChange}
      pageSize={20}
      loading={loading}
      emptyMessage="No subscriptions found"
    />
  );
}
```

- [ ] **Step 2: Write subscriptions page**

```tsx
// src/app/admin/subscriptions/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { StatCard } from '@/components/admin/ui/StatCard';
import { FilterBar, type FilterConfig } from '@/components/admin/ui/FilterBar';
import { SubscriptionsTable } from '@/components/admin/subscriptions/SubscriptionsTable';
import { useToast } from '@/components/ui/Toast';

const filters: FilterConfig[] = [
  {
    key: 'plan',
    label: 'Plan',
    options: [
      { value: 'none', label: 'None' },
      { value: 'basic', label: 'Basic' },
      { value: 'pro', label: 'Pro' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'trial', label: 'Trial' },
      { value: 'active', label: 'Active' },
      { value: 'past_due', label: 'Past Due' },
      { value: 'canceled', label: 'Canceled' },
    ],
  },
  {
    key: 'expiringWithin',
    label: 'Expiring',
    options: [
      { value: '7', label: 'Within 7 days' },
      { value: '30', label: 'Within 30 days' },
    ],
  },
];

export default function SubscriptionsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { toastSuccess, toastError } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterValues.plan) params.set('plan', filterValues.plan);
      if (filterValues.status) params.set('status', filterValues.status);
      if (filterValues.expiringWithin) params.set('expiringWithin', filterValues.expiringWithin);

      const res = await fetch(`/api/admin/subscriptions?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } finally {
      setLoading(false);
    }
  }, [filterValues]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (userId: string, action: string, value?: string) => {
    try {
      if (action === 'change_plan' || action === 'cancel') {
        const body = action === 'cancel' ? { subscriptionStatus: 'canceled' } : { plan: value };
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          toastSuccess(action === 'cancel' ? 'Subscription canceled' : `Plan changed to ${value}`);
          fetchData();
        }
      } else if (action === 'extend_trial') {
        const days = parseInt(value ?? '7');
        const newEnd = new Date();
        newEnd.setDate(newEnd.getDate() + days);
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trialEndsAt: newEnd.toISOString(), subscriptionStatus: 'trial' }),
        });
        if (res.ok) {
          toastSuccess(`Trial extended by ${days} days`);
          fetchData();
        }
      }
    } catch {
      toastError('Action failed');
    }
  };

  const handleBatchAction = async (action: string, value: string) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch('/api/admin/subscriptions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userIds: selectedIds, value }),
      });
      if (res.ok) {
        const json = await res.json();
        toastSuccess(`Updated ${json.data.modifiedCount} users`);
        setSelectedIds([]);
        fetchData();
      }
    } catch {
      toastError('Batch action failed');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[var(--admin-text-primary)]">Subscriptions</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Subscriptions"
          value={data?.summary?.activeSubscriptions?.toString() ?? '—'}
          loading={loading}
        />
        <StatCard
          label="Trials Expiring This Week"
          value={data?.summary?.trialsExpiringThisWeek?.toString() ?? '—'}
          loading={loading}
        />
        <StatCard label="Past Due" value={data?.summary?.pastDue?.toString() ?? '—'} loading={loading} />
        <StatCard label="Total MRR" value={data ? `$${data.summary.mrr.toLocaleString()}` : '—'} loading={loading} />
      </div>

      <FilterBar filters={filters} values={filterValues} onChange={setFilterValues} />

      {/* Batch actions bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-[var(--admin-accent-blue)]/10 px-4 py-3">
          <span className="text-sm text-[var(--admin-text-primary)]">{selectedIds.length} selected</span>
          <button
            onClick={() => handleBatchAction('extend_trial', '7')}
            className="rounded bg-[var(--admin-accent-blue)] px-3 py-1 text-xs text-white"
          >
            Extend Trial +7d
          </button>
          <button
            onClick={() => handleBatchAction('change_plan', 'basic')}
            className="rounded border border-[var(--admin-border-subtle)] px-3 py-1 text-xs text-[var(--admin-text-secondary)]"
          >
            Set Basic
          </button>
          <button
            onClick={() => handleBatchAction('change_plan', 'pro')}
            className="rounded border border-[var(--admin-border-subtle)] px-3 py-1 text-xs text-[var(--admin-text-secondary)]"
          >
            Set Pro
          </button>
        </div>
      )}

      <SubscriptionsTable
        users={data?.users ?? []}
        loading={loading}
        onAction={handleAction}
        onSelectionChange={setSelectedIds}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/subscriptions/page.tsx src/components/admin/subscriptions/SubscriptionsTable.tsx
git commit -m "feat(admin): add Subscriptions page with summary cards, filters, batch actions"
```

---

### Task 32: Analytics Page

**Files:**

- Create: `src/app/admin/analytics/page.tsx`
- Create: `src/components/admin/analytics/Charts.tsx`

- [ ] **Step 1: Write Charts component**

```tsx
// src/components/admin/analytics/Charts.tsx
'use client';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const chartStyle = {
  backgroundColor: 'var(--admin-bg-card)',
  border: '1px solid var(--admin-border-emphasis)',
  borderRadius: '8px',
  fontSize: '12px',
};

interface ChartsProps {
  messagesPerDay: Array<{ date: string; count: number }>;
  messagesByChannel: Array<{ channel: string; count: number }>;
  topClients: Array<{ clientId: string; messageCount: number }>;
  userGrowth: Array<{ date: string; count: number }>;
  chatQuality: { avgConversationLength: number; totalSessions: number };
}

export function Charts({ messagesPerDay, messagesByChannel, topClients, userGrowth, chatQuality }: ChartsProps) {
  return (
    <div className="space-y-6">
      {/* Row 1: Messages per day + User growth */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
          <h3 className="mb-4 text-base font-semibold text-[var(--admin-text-primary)]">Messages Per Day</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={messagesPerDay}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip contentStyle={chartStyle} />
              <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} dot={false} name="Messages" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
          <h3 className="mb-4 text-base font-semibold text-[var(--admin-text-primary)]">User Growth</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={userGrowth}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip contentStyle={chartStyle} />
              <Line type="monotone" dataKey="count" stroke="#34D399" strokeWidth={2} dot={false} name="Registrations" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: By channel + Top clients */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
          <h3 className="mb-4 text-base font-semibold text-[var(--admin-text-primary)]">Messages by Channel</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={messagesByChannel} layout="vertical">
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="channel"
                tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip contentStyle={chartStyle} />
              <Bar dataKey="count" fill="#818CF8" radius={[0, 4, 4, 0]} name="Messages" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
          <h3 className="mb-4 text-base font-semibold text-[var(--admin-text-primary)]">Top 10 Active Clients</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topClients} layout="vertical">
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: 'var(--admin-text-muted)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="clientId"
                tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }}
                tickLine={false}
                axisLine={false}
                width={90}
              />
              <Tooltip contentStyle={chartStyle} />
              <Bar dataKey="messageCount" fill="#F59E0B" radius={[0, 4, 4, 0]} name="Messages" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Chat quality */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
          <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">
            Avg Conversation Length
          </p>
          <p className="mt-1 text-2xl font-bold text-[var(--admin-text-primary)]">
            {chatQuality.avgConversationLength} msgs
          </p>
        </div>
        <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
          <p className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">
            Total Sessions
          </p>
          <p className="mt-1 text-2xl font-bold text-[var(--admin-text-primary)]">
            {chatQuality.totalSessions.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write analytics page**

```tsx
// src/app/admin/analytics/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Charts } from '@/components/admin/analytics/Charts';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/analytics?days=${days}`);
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [days]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text-primary)]">Analytics</h1>
        <div className="flex gap-1 rounded-lg bg-[var(--admin-bg-card)] p-1">
          {[30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-md px-3 py-1.5 text-sm ${days === d ? 'bg-[var(--admin-accent-blue)] text-white' : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)]'}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="admin-skeleton h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : data ? (
        <Charts
          messagesPerDay={data.messagesPerDay}
          messagesByChannel={data.messagesByChannel}
          topClients={data.topClients}
          userGrowth={data.userGrowth}
          chatQuality={data.chatQuality}
        />
      ) : (
        <p className="text-[var(--admin-text-muted)]">Failed to load analytics</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/analytics/page.tsx src/components/admin/analytics/Charts.tsx
git commit -m "feat(admin): add Analytics page with recharts"
```

---

### Task 33: Settings Placeholder Page

**Files:**

- Create: `src/app/admin/settings/page.tsx`

- [ ] **Step 1: Write placeholder page**

```tsx
// src/app/admin/settings/page.tsx
'use client';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[var(--admin-text-primary)]">Settings</h1>
      <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-8 text-center">
        <p className="text-sm text-[var(--admin-text-muted)]">System settings will be available in a future update.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/settings/page.tsx
git commit -m "feat(admin): add Settings placeholder page"
```

---

### Task 34: Cleanup Old Admin Components

**Files:**

- Delete old admin tab components (if they exist in worktree)
- Verify all new pages render correctly

- [ ] **Step 1: Identify old admin files to remove**

Check for old admin components that are no longer used:

- `src/components/admin/tabs/` (if exists) — all tab components from old design
- Old `src/components/ClientList.tsx` (was used in old admin page)

```bash
# Check what old components exist
ls src/components/admin/tabs/ 2>/dev/null
ls src/components/admin/*Tab*.tsx 2>/dev/null
```

- [ ] **Step 2: Remove old components (only if not referenced by other pages)**

Only delete files that are exclusively used by the old admin panel. Check imports before deleting.

```bash
# Example — only after confirming no other imports
git rm src/components/admin/tabs/ -r 2>/dev/null || true
```

- [ ] **Step 3: Run all tests**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run
```

Expected: All tests pass (including new admin UI component tests)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(admin): remove old admin components, cleanup complete"
```

---

### Task 35: Final Build Verification

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run
```

Expected: All tests pass

- [ ] **Step 2: Run Next.js build**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx next build --no-lint 2>&1 | tail -30
```

Expected: Build succeeds with no errors

- [ ] **Step 3: Manual smoke test (if dev server available)**

Start dev server and verify:

1. `/admin` — Dashboard with KPI cards, alerts, recent tables
2. `/admin/users` — Users list with search and filters
3. `/admin/users/[id]` — User profile with subscription details
4. `/admin/clients` — Clients list
5. `/admin/clients/[id]` — Client profile with accordion sections
6. `/admin/subscriptions` — Subscriptions with batch actions
7. `/admin/analytics` — Charts render
8. Cmd+K — Command palette opens and searches
9. Bell icon — Notification center shows alerts

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(admin): address build and smoke test issues"
```
