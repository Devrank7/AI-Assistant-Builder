import { useMotionValue, useSpring, useTransform } from 'framer-motion';
import { MouseEvent, useCallback } from 'react';

export function use3DTilt(stiffness = 150, damping = 15) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [15, -15]), {
    stiffness,
    damping,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-15, 15]), {
    stiffness,
    damping,
  });

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const xPct = mouseX / width - 0.5;
      const yPct = mouseY / height - 0.5;
      x.set(xPct);
      y.set(yPct);
    },
    [x, y]
  );

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return { rotateX, rotateY, handleMouseMove, handleMouseLeave };
}
