'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

interface SidebarProps {
  items: NavItem[];
  logo?: string;
  title?: string;
  footer?: React.ReactNode;
}

export default function Sidebar({ items, logo, title = 'WinBix AI', footer }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`flex h-screen flex-col border-r border-white/5 bg-[#0d0d15] transition-all duration-300 ${
        collapsed ? 'w-[68px]' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-white/5 px-4">
        {logo ? (
          <span className="flex-shrink-0 text-2xl">{logo}</span>
        ) : (
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 text-xs font-bold">
            AI
          </div>
        )}
        {!collapsed && <span className="truncate font-semibold text-white">{title}</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`ml-auto flex-shrink-0 text-gray-500 transition-colors hover:text-gray-300 ${collapsed ? 'mx-auto ml-0' : ''}`}
          aria-label={collapsed ? 'Развернуть' : 'Свернуть'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'border border-white/5 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0 text-lg">{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/20 px-1.5 text-xs font-medium text-cyan-400">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-white">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
              {isActive && (
                <span className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-cyan-400 to-purple-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {footer && (
        <div className={`border-t border-white/5 p-3 ${collapsed ? 'flex justify-center' : ''}`}>{footer}</div>
      )}
    </aside>
  );
}
