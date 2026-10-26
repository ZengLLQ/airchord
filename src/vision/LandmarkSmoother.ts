import type { HandLandmark } from '../types';

/**
 * Exponential Moving Average (EMA) landmark smoother.
 * Prevents jitter while maintaining snappy responsiveness for strumming.
 */
export class LandmarkSmoother {
  private alpha: number;
  private previousLandmarks: HandLandmark[] | null = null;
  private lastTimestamp: number = 0;
  private maxGapMs: number;

  /**
   * @param alpha - Weight for current frame (0 < alpha <= 1). Default 0.65 balances responsiveness and stability.
   * @param maxGapMs - Maximum gap between frames before resetting smoother state (default 250ms).
   */
  constructor(alpha: number = 0.65, maxGapMs: number = 250) {
    this.alpha = Math.max(0.1, Math.min(1.0, alpha));
    this.maxGapMs = maxGapMs;
  }

  public setAlpha(alpha: number): void {
    this.alpha = Math.max(0.1, Math.min(1.0, alpha));
  }

  public reset(): void {
    this.previousLandmarks = null;
    this.lastTimestamp = 0;
  }

  public smooth(landmarks: HandLandmark[], timestamp: number): HandLandmark[] {
    if (!landmarks || landmarks.length === 0) {
      this.reset();
      return [];
    }

    const dt = timestamp - this.lastTimestamp;
    if (this.previousLandmarks === null || dt > this.maxGapMs || this.previousLandmarks.length !== landmarks.length) {
      this.previousLandmarks = landmarks.map((l) => ({ ...l }));
      this.lastTimestamp = timestamp;
      return this.previousLandmarks;
    }

    const smoothed: HandLandmark[] = new Array(landmarks.length);
    const alpha = this.alpha;
    const oneMinusAlpha = 1 - alpha;

    for (let i = 0; i < landmarks.length; i++) {
      const cur = landmarks[i];
      const prev = this.previousLandmarks[i];

      // Prevent smoothing across sudden massive teleport jumps (e.g. tracking reacquisition)
      const distSq = (cur.x - prev.x) ** 2 + (cur.y - prev.y) ** 2;
      if (distSq > 0.15) {
        // Large jump: snap directly to current
        smoothed[i] = { x: cur.x, y: cur.y, z: cur.z };
      } else {
        smoothed[i] = {
          x: alpha * cur.x + oneMinusAlpha * prev.x,
          y: alpha * cur.y + oneMinusAlpha * prev.y,
          z: alpha * cur.z + oneMinusAlpha * prev.z,
        };
      }
    }

    this.previousLandmarks = smoothed;
    this.lastTimestamp = timestamp;
    return smoothed;
  }
}
