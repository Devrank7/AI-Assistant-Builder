import { describe, it, expect } from 'vitest';
import { calculateExitProbability, SIGNAL_WEIGHTS, generateNudgeMessage } from '@/lib/predictiveEngagement';

describe('predictiveEngagement', () => {
  it('calculates exit probability with correct signal weights', () => {
    const signals = [
      { type: 'scroll_depth' as const, value: 80 },
      { type: 'time_on_page' as const, value: 60 },
      { type: 'mouse_idle' as const, value: 90 },
      { type: 'tab_switch' as const, value: 50 },
      { type: 'rapid_scroll' as const, value: 70 },
    ];

    const result = calculateExitProbability(signals);

    expect(result.exitProbability).toBeGreaterThan(0);
    expect(result.exitProbability).toBeLessThanOrEqual(1);
    expect(result.engagementScore).toBeGreaterThanOrEqual(0);
    expect(result.engagementScore).toBeLessThanOrEqual(100);
    expect(result.signals).toHaveLength(5);
    expect(result.signals[0].weight).toBe(SIGNAL_WEIGHTS.scroll_depth);
    expect(result.signals[2].weight).toBe(SIGNAL_WEIGHTS.mouse_idle);
  });

  it('returns correct recommended action based on exit probability', () => {
    const highExit = calculateExitProbability([
      { type: 'mouse_idle' as const, value: 95 },
      { type: 'tab_switch' as const, value: 90 },
      { type: 'rapid_scroll' as const, value: 85 },
    ]);
    expect(highExit.recommendedAction).toBe('offer');

    const lowExit = calculateExitProbability([
      { type: 'scroll_depth' as const, value: 10 },
      { type: 'time_on_page' as const, value: 15 },
      { type: 'mouse_idle' as const, value: 5 },
    ]);
    expect(lowExit.recommendedAction).toBe('none');
  });

  it('generates appropriate nudge messages based on engagement score', () => {
    const lowEngagement = generateNudgeMessage('c1', 20, 'pricing');
    expect(lowEngagement).toContain('pricing');

    const mediumEngagement = generateNudgeMessage('c1', 50, 'features');
    expect(mediumEngagement).toContain('features');

    const highEngagement = generateNudgeMessage('c1', 80);
    expect(highEngagement).toBeTruthy();
    expect(typeof highEngagement).toBe('string');
  });
});
