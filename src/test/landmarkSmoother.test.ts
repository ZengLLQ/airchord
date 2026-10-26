import { describe, expect, it } from 'vitest';
import { LandmarkSmoother } from '../vision/LandmarkSmoother';
import type { HandLandmark } from '../types';

describe('LandmarkSmoother - Jitter Reduction & Snappy Tracking', () => {
  const createPoint = (x: number, y: number, z = 0): HandLandmark[] => [{ x, y, z }];

  it('clamps alpha parameter to [0.1, 1.0]', () => {
    const smootherLow = new LandmarkSmoother(0.01);
    const smootherHigh = new LandmarkSmoother(2.5);

    // Initial frame
    smootherLow.smooth(createPoint(0, 0), 100);
    // Small delta beneath teleport threshold (distSq = 0.05^2 + 0.05^2 = 0.005 < 0.15)
    const resLow = smootherLow.smooth(createPoint(0.05, 0.05), 130);
    // Alpha was clamped to 0.1: 0.1 * 0.05 + 0.9 * 0 = 0.005
    expect(resLow[0].x).toBeCloseTo(0.005, 4);

    smootherHigh.smooth(createPoint(0, 0), 100);
    const resHigh = smootherHigh.smooth(createPoint(0.05, 0.05), 130);
    // Alpha was clamped to 1.0: 1.0 * 0.05 + 0 = 0.05
    expect(resHigh[0].x).toBeCloseTo(0.05, 4);
  });

  it('returns exact values on the first frame (no lag or initialization delay)', () => {
    const smoother = new LandmarkSmoother(0.5);
    const firstFrame = createPoint(0.42, 0.58, 0.1);

    const smoothed = smoother.smooth(firstFrame, 1000);

    expect(smoothed[0].x).toBe(0.42);
    expect(smoothed[0].y).toBe(0.58);
    expect(smoothed[0].z).toBe(0.1);
  });

  it('correctly applies exponential moving average on small jitter', () => {
    const smoother = new LandmarkSmoother(0.6); // 60% current, 40% previous

    smoother.smooth(createPoint(0.5, 0.5), 100);
    // Slight jitter to (0.52, 0.51)
    const result = smoother.smooth(createPoint(0.52, 0.51), 133);

    // x: 0.6 * 0.52 + 0.4 * 0.5 = 0.312 + 0.2 = 0.512
    expect(result[0].x).toBeCloseTo(0.512, 4);
    // y: 0.6 * 0.51 + 0.4 * 0.5 = 0.306 + 0.2 = 0.506
    expect(result[0].y).toBeCloseTo(0.506, 4);
  });

  it('snaps directly without smoothing on massive teleport jumps (distSq > 0.15)', () => {
    const smoother = new LandmarkSmoother(0.5);

    smoother.smooth(createPoint(0.1, 0.1), 100);
    // Jump across the screen: from (0.1, 0.1) to (0.8, 0.8) -> distSq = 0.7^2 + 0.7^2 = 0.98 > 0.15
    const result = smoother.smooth(createPoint(0.8, 0.8), 133);

    expect(result[0].x).toBe(0.8);
    expect(result[0].y).toBe(0.8);
  });

  it('resets baseline when frame gap exceeds maxGapMs (250ms)', () => {
    const smoother = new LandmarkSmoother(0.5, 250);

    smoother.smooth(createPoint(0.2, 0.2), 1000);
    // 500ms time gap (camera frame drop or tab switch)
    const result = smoother.smooth(createPoint(0.6, 0.6), 1500);

    // Must snap directly to 0.6 without smoothing across dead time
    expect(result[0].x).toBe(0.6);
    expect(result[0].y).toBe(0.6);
  });

  it('resets internal state when empty landmarks array is passed', () => {
    const smoother = new LandmarkSmoother(0.5);

    smoother.smooth(createPoint(0.2, 0.2), 100);
    const empty = smoother.smooth([], 133);
    expect(empty).toEqual([]);

    // Next frame behaves as a fresh initial frame
    const next = smoother.smooth(createPoint(0.9, 0.9), 166);
    expect(next[0].x).toBe(0.9);
  });
});
