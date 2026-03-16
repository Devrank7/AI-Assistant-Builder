import { type HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

const paddingClasses = { sm: 'p-3', md: 'p-5', lg: 'p-6' };

export function Card({ padding = 'md', hoverable, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`border-border bg-bg-secondary rounded-xl border shadow-sm dark:shadow-none ${paddingClasses[padding]} ${hoverable ? 'transition-colors hover:shadow-md dark:hover:border-[rgba(255,255,255,0.12)]' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
