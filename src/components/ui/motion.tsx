'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

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
