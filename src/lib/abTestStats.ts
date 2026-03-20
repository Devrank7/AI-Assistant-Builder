// src/lib/abTestStats.ts

interface VariantData {
  visitors: number;
  conversions: number;
}

interface ChiSquaredResult {
  significant: boolean;
  pValue: number;
  chiSquared: number;
  winnerIndex: number | null;
  confidence: number;
}

interface ConfidenceInterval {
  rate: number;
  lower: number;
  upper: number;
}

/**
 * Chi-squared test for comparing conversion rates across variants.
 * Returns significance at 95% confidence level (p < 0.05).
 */
export function chiSquaredTest(variants: VariantData[]): ChiSquaredResult {
  const totalVisitors = variants.reduce((s, v) => s + v.visitors, 0);
  const totalConversions = variants.reduce((s, v) => s + v.conversions, 0);

  if (totalVisitors === 0) {
    return { significant: false, pValue: 1, chiSquared: 0, winnerIndex: null, confidence: 0 };
  }

  const overallRate = totalConversions / totalVisitors;

  // Calculate chi-squared statistic
  let chiSq = 0;
  for (const v of variants) {
    if (v.visitors === 0) continue;
    const expectedConversions = v.visitors * overallRate;
    const expectedNonConversions = v.visitors * (1 - overallRate);

    if (expectedConversions > 0) {
      chiSq += Math.pow(v.conversions - expectedConversions, 2) / expectedConversions;
    }
    if (expectedNonConversions > 0) {
      const nonConversions = v.visitors - v.conversions;
      chiSq += Math.pow(nonConversions - expectedNonConversions, 2) / expectedNonConversions;
    }
  }

  // Degrees of freedom = (rows - 1) * (cols - 1) = (2 - 1) * (k - 1) = k - 1
  const df = variants.length - 1;

  // Approximate p-value using chi-squared CDF (Wilson-Hilferty approximation)
  const pValue = 1 - chiSquaredCDF(chiSq, df);

  // Find winner (highest conversion rate)
  let winnerIndex: number | null = null;
  let bestRate = -1;
  for (let i = 0; i < variants.length; i++) {
    const rate = variants[i].visitors > 0 ? variants[i].conversions / variants[i].visitors : 0;
    if (rate > bestRate) {
      bestRate = rate;
      winnerIndex = i;
    }
  }

  const significant = pValue < 0.05;

  return {
    significant,
    pValue: Math.max(0, Math.min(1, pValue)),
    chiSquared: chiSq,
    winnerIndex: significant ? winnerIndex : null,
    confidence: Math.round((1 - pValue) * 100),
  };
}

/**
 * Wilson score interval for conversion rate confidence interval.
 */
export function calculateConfidence(visitors: number, conversions: number): ConfidenceInterval {
  if (visitors === 0) return { rate: 0, lower: 0, upper: 0 };

  const rate = conversions / visitors;
  const z = 1.96; // 95% confidence
  const denominator = 1 + (z * z) / visitors;
  const center = (rate + (z * z) / (2 * visitors)) / denominator;
  const margin = (z * Math.sqrt((rate * (1 - rate) + (z * z) / (4 * visitors)) / visitors)) / denominator;

  return {
    rate,
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
  };
}

/**
 * Chi-squared CDF approximation using the regularized incomplete gamma function.
 * Uses the series expansion for small values and continued fraction for large values.
 */
function chiSquaredCDF(x: number, k: number): number {
  if (x <= 0) return 0;
  return lowerIncompleteGamma(k / 2, x / 2) / gamma(k / 2);
}

function gamma(z: number): number {
  // Lanczos approximation
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  z -= 1;
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

function lowerIncompleteGamma(s: number, x: number): number {
  // Series expansion
  let sum = 0;
  let term = 1 / s;
  for (let n = 0; n < 100; n++) {
    sum += term;
    term *= x / (s + n + 1);
    if (Math.abs(term) < 1e-10) break;
  }
  return Math.pow(x, s) * Math.exp(-x) * sum;
}
