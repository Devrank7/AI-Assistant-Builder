'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  homeLabel?: string;
  homeHref?: string;
}

const pathLabels: Record<string, string> = {
  admin: 'Админ-панель',
  cabinet: 'Кабинет',
  clients: 'Клиенты',
  analytics: 'Аналитика',
  settings: 'Настройки',
  widgets: 'Виджеты',
  integrations: 'Интеграции',
  billing: 'Оплата',
  knowledge: 'База знаний',
  profile: 'Профиль',
};

export default function Breadcrumbs({ items, homeLabel = 'Главная', homeHref = '/' }: BreadcrumbsProps) {
  const pathname = usePathname();

  const crumbs: BreadcrumbItem[] =
    items ??
    (() => {
      const segments = pathname.split('/').filter(Boolean);
      let href = '';
      return segments.map((seg) => {
        href += `/${seg}`;
        return { label: pathLabels[seg] || seg.charAt(0).toUpperCase() + seg.slice(1), href };
      });
    })();

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link href={homeHref} className="text-text-secondary hover:text-text-primary transition-colors">
        {homeLabel}
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="text-text-tertiary h-3.5 w-3.5" />
          {i === crumbs.length - 1 || !crumb.href ? (
            <span className="text-text-primary font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="text-text-secondary hover:text-text-primary transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
