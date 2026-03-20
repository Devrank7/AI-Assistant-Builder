'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  Sparkles,
  Plug,
  BarChart3,
  FlaskConical,
  Users,
  CreditCard,
  Settings,
  Download,
  Menu,
  LogOut,
  Mail,
  Workflow,
  Gift,
  Book,
  Key,
  Store,
  GraduationCap,
  Globe,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

const navGroups = [
  {
    label: 'MAIN',
    items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Inbox', href: '/dashboard/inbox', icon: Mail },
      { label: 'Contacts', href: '/dashboard/contacts', icon: Users },
      { label: 'My Widgets', href: '/dashboard/widgets', icon: MessageSquare },
      { label: 'My Chats', href: '/dashboard/chats', icon: Bot },
    ],
  },
  {
    label: 'BUILD',
    items: [
      { label: 'AI Builder', href: '/dashboard/builder', icon: Sparkles },
      { label: 'Flows', href: '/dashboard/flows', icon: Workflow },
      { label: 'Marketplace', href: '/dashboard/marketplace', icon: Store },
      { label: 'Integrations', href: '/dashboard/integrations', icon: Plug },
      { label: 'Installation', href: '/dashboard/installation', icon: Download },
      { label: 'API Docs', href: '/dashboard/developer/docs', icon: Book },
      { label: 'API', href: '/dashboard/settings/api-keys', icon: Key },
      { label: 'Training Studio', href: '/dashboard/training', icon: GraduationCap },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [
      { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
      { label: 'Advanced Analytics', href: '/dashboard/analytics/advanced', icon: TrendingUp },
      { label: 'A/B Tests', href: '/dashboard/ab-tests', icon: FlaskConical },
      { label: 'Knowledge Evolution', href: '/dashboard/knowledge-evolution', icon: RefreshCw },
    ],
  },
  {
    label: 'WORKSPACE',
    items: [
      { label: 'Team', href: '/dashboard/team', icon: Users },
      { label: 'Billing', href: '/dashboard/billing', icon: CreditCard },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings },
      { label: 'Domains', href: '/dashboard/settings/domains', icon: Globe },
      { label: 'Referrals', href: '/dashboard/referrals', icon: Gift },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const hasPaidPlan = user && user.plan !== 'none';

  useEffect(() => {
    if (user && !user.onboardingCompleted && !pathname.startsWith('/dashboard/onboarding')) {
      router.push('/dashboard/onboarding');
    }
  }, [user, pathname, router]);

  const isOnboarding = pathname.startsWith('/dashboard/onboarding');

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  // During onboarding — render children full-screen, no sidebar/topbar
  if (isOnboarding) {
    return <>{children}</>;
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="border-border flex items-center gap-2.5 border-b px-5 py-4">
        <div className="bg-accent flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white">
          W
        </div>
        <span className="text-text-primary text-[15px] font-semibold">WinBix AI</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="text-text-tertiary mt-5 mb-1 px-4 text-[11px] font-medium tracking-wider uppercase">
              {group.label}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    setSidebarOpen(false);
                    if (item.href === '/dashboard/builder' && !hasPaidPlan) {
                      e.preventDefault();
                      router.push('/plans');
                    }
                  }}
                  className={`mx-2 flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition-colors ${
                    active
                      ? 'bg-accent-subtle text-accent'
                      : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom user email */}
      <div className="border-border border-t px-4 py-3">
        <div className="text-text-tertiary truncate text-xs">{user?.email}</div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - mobile */}
      <aside
        className={`border-border bg-bg-secondary fixed inset-y-0 left-0 z-50 flex w-60 transform flex-col border-r transition-transform duration-200 lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Sidebar - desktop */}
      <aside className="border-border bg-bg-secondary hidden border-r lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col">
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        {/* Top bar */}
        <header className="border-border bg-bg-primary/80 sticky top-0 z-30 flex h-12 flex-shrink-0 items-center justify-between border-b px-4 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-text-secondary hover:text-text-primary -ml-2 rounded-md p-1.5 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <div className="flex flex-shrink-0 items-center gap-3">
            <ThemeToggle />
            <NotificationBell />
            <span className="text-text-secondary hidden max-w-[200px] truncate text-[13px] sm:inline">
              {user?.email}
            </span>
            <button
              onClick={logout}
              className="text-text-secondary hover:text-text-primary flex flex-shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log out
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className={pathname.startsWith('/dashboard/builder') ? '' : 'p-4 sm:p-6 lg:p-8'}>{children}</main>
      </div>
    </div>
  );
}
