/**
 * Color Utility Library
 *
 * Pure functions for hex color manipulation.
 * Used by themeGenerator to derive 50+ color tokens from a single primary color.
 * No external dependencies.
 */

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Returns "R, G, B" string for CSS rgb() usage */
export function rgbToString(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `${r}, ${g}, ${b}`;
}

/** Darken a hex color by a percentage (0-100) */
export function darken(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = (100 - percent) / 100;
  return rgbToHex(r * factor, g * factor, b * factor);
}

/** Lighten a hex color by a percentage (0-100) */
export function lighten(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = percent / 100;
  return rgbToHex(r + (255 - r) * factor, g + (255 - g) * factor, b + (255 - b) * factor);
}

/** Mix a hex color with white by a percentage (0=original, 100=white) */
export function mixWithWhite(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = percent / 100;
  return rgbToHex(r + (255 - r) * factor, g + (255 - g) * factor, b + (255 - b) * factor);
}

/** Check if a color is "light" (luminance > 128) */
export function isLight(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 128;
}

// --- HSL conversions (for accent color generation) ---

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r: r255, g: g255, b: b255 } = hexToRgb(hex);
  const r = r255 / 255;
  const g = g255 / 255;
  const b = b255 / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h: h * 360, s, l };
}

export function hslToHex(h: number, s: number, l: number): string {
  const hNorm = ((h % 360) + 360) % 360;

  if (s === 0) {
    const v = Math.round(l * 255);
    return rgbToHex(v, v, v);
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hFrac = hNorm / 360;

  return rgbToHex(hue2rgb(p, q, hFrac + 1 / 3) * 255, hue2rgb(p, q, hFrac) * 255, hue2rgb(p, q, hFrac - 1 / 3) * 255);
}

/** Generate an accent color by shifting hue +30 degrees */
export function generateAccentColor(primaryHex: string): string {
  const { h, s, l } = hexToHsl(primaryHex);
  return hslToHex(h + 30, s, l);
}
