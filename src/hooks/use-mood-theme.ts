import { useMemo } from 'react';
import { MotionValue, useSpring, useTransform } from 'framer-motion';
import chroma from 'chroma-js';

export interface MoodTheme {
  primaryColor: MotionValue<string>;
  secondaryColor: MotionValue<string>;
  borderRadius: MotionValue<string>;
  blurAmount: MotionValue<string>;
  gradientSpeed: MotionValue<number>;
  moodLabel: string;
  mokkIcon: string;
}

/**
 * Maps AI Temperature (0.0 - 1.0) to a visual theme
 * 0.0 (Strict) -> Cool Blues, Sharp corners
 * 0.5 (Balanced) -> Neon Cyan/Purple, Rounded
 * 1.0 (Creative) -> Hot Pink/Orange, Organic shapes
 */
export function useMoodTheme(temperature: number): MoodTheme {
  // 1. Define scales
  const colorScale = chroma.scale(['#60A5FA', '#00E5FF', '#A855F7', '#ec4899', '#F97316']).mode('lch');

  // 2. Create MotionValues for smooth transitions
  const t = useSpring(temperature, { stiffness: 100, damping: 20 });

  const primaryColor = useTransform(
    t,
    [0, 0.25, 0.5, 0.75, 1],
    [
      '#60A5FA', // Blue (Strict)
      '#00E5FF', // Cyan
      '#A855F7', // Purple (Balanced)
      '#ec4899', // Pink
      '#F97316', // Orange (Creative)
    ]
  );

  const secondaryColor = useTransform(t, (latest) => {
    const color = chroma(colorScale(latest).hex());
    return color.brighten(1).css();
  });

  const borderRadius = useTransform(t, [0, 1], ['8px', '32px']);
  const blurAmount = useTransform(t, [0, 1], ['4px', '20px']);
  const gradientSpeed = useTransform(t, [0, 1], [20, 2]);

  // 3. Determine label
  const moodLabel = useMemo(() => {
    if (temperature < 0.3) return 'Strict & Precise';
    if (temperature < 0.7) return 'Balanced & Helpful';
    return 'Creative & Dynamic';
  }, [temperature]);

  const mokkIcon = useMemo(() => {
    if (temperature < 0.3) return '🧊';
    if (temperature < 0.7) return '⚖️';
    return '🔥';
  }, [temperature]);

  return {
    primaryColor,
    secondaryColor,
    borderRadius,
    blurAmount,
    gradientSpeed,
    moodLabel,
    mokkIcon,
  };
}
