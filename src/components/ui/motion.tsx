'use client';

import { motion, useSpring, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode, useEffect, useRef } from 'react';

// STAGGERED LIST CONTAINER
export function MotionList({
  children,
  className,
  delay = 0.05,
  staggerDelay = 0.05,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: delay,
          },
        },
      }}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// FADE IN UP ITEM
export function MotionItem({
  children,
  className,
  layoutId,
}: {
  children: ReactNode;
  className?: string;
  layoutId?: string;
}) {
  return (
    <motion.div
      layout={!!layoutId}
      layoutId={layoutId}
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            type: 'spring',
            stiffness: 100,
            damping: 15,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// 3D TILT CARD WRAPPER
import { use3DTilt } from '@/hooks/use-tilt';

export function MotionCard({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const { rotateX, rotateY, handleMouseMove, handleMouseLeave } = use3DTilt();

  return (
    <motion.div
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      initial={{ scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      className={cn('relative transition-colors', className)}
    >
      {children}
    </motion.div>
  );
}

// PAGE/TAB TRANSITION WRAPPER
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ANIMATED NUMBER COUNTER
export function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { stiffness: 80, damping: 20, mass: 0.5 });
  const display = useTransform(springValue, (v) => {
    if (decimals > 0) return `${prefix}${v.toFixed(decimals)}${suffix}`;
    const rounded = Math.round(v);
    if (rounded >= 1_000_000) return `${prefix}${(rounded / 1_000_000).toFixed(1)}M${suffix}`;
    if (rounded >= 1_000) return `${prefix}${(rounded / 1_000).toFixed(1)}k${suffix}`;
    return `${prefix}${rounded.toLocaleString()}${suffix}`;
  });
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = display.on('change', (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return unsubscribe;
  }, [display]);

  return (
    <span ref={ref} className={className}>
      {prefix}0{suffix}
    </span>
  );
}

// SKELETON CARD LOADER
export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('card-premium animate-pulse space-y-4 p-6', className)}>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gray-200/60 dark:bg-white/[0.06]" />
        <div className="h-4 w-32 rounded-lg bg-gray-200/60 dark:bg-white/[0.06]" />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 rounded-lg bg-gray-100 dark:bg-white/[0.04]" style={{ width: `${85 - i * 15}%` }} />
      ))}
    </div>
  );
}

// ANIMATED TABS WITH SLIDING INDICATOR
interface TabItem {
  id: string;
  label: string;
  icon?: string;
}

export function AnimatedTabs({
  tabs,
  activeTab,
  onChange,
  className,
}: {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('tab-nav overflow-x-auto p-1.5', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn('tab-item relative flex items-center gap-2.5', activeTab === tab.id ? 'active' : '')}
        >
          {activeTab === tab.id && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute inset-0 rounded-xl bg-gray-900/[0.06] dark:bg-white/[0.08]"
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2.5">
            {tab.icon && <span className="text-lg">{tab.icon}</span>}
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// MOTION BUTTON WITH MICRO-INTERACTIONS
export function MotionButton({
  children,
  className,
  disabled,
  onClick,
  type,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.03, y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={className}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </motion.button>
  );
}

// TAB CONTENT TRANSITION
export function TabContent({ tabKey, children }: { tabKey: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
