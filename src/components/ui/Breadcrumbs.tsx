'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
      <Link href={homeHref} className="text-gray-500 transition-colors hover:text-gray-300">
        {homeLabel}
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="text-gray-700">/</span>
          {i === crumbs.length - 1 || !crumb.href ? (
            <span className="font-medium text-gray-300">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="text-gray-500 transition-colors hover:text-gray-300">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
