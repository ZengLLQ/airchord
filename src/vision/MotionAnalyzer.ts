import type { HandLandmark } from '../types';

export interface MotionSample {
  y: number;
  timestamp: number;
}

export interface MotionAnalysis {
  currentY: number;
  velocityY: number; // Normalized vertical units per second (positive = downwards, negative = upwards)
  displacement: number;
  dt: number;
  isValid: boolean;
}

/**
 * Tracks vertical movement and computes smoothed velocity and displacement.
 */
export class MotionAnalyzer {
  private history: MotionSample[] = [];
  private maxHistoryMs = 120; // 120ms sliding window
  private lastSampleTime = 0;

  public reset(): void {
    this.history = [];
    this.lastSampleTime = 0;
  }

  /**
   * Updates motion with new hand landmarks.
   * Uses wrist (0) and middle MCP (9) midpoint for stable center-of-hand tracking.
   */
  public update(landmarks: HandLandmark[] | null, timestamp: number): MotionAnalysis {
    if (!landmarks || landmarks.length < 10) {
      this.reset();
      return {
        currentY: 0,
        velocityY: 0,
        displacement: 0,
        dt: 0,
        isValid: false,
      };
    }

    // Gap check: if tracking lost for > 250ms, discard history to prevent speed spikes
    if (this.lastSampleTime > 0 && timestamp - this.lastSampleTime > 250) {
      this.reset();
    }
    this.lastSampleTime = timestamp;

    // Hand center: weighted combination of wrist (0) and middle MCP (9)
    const wrist = landmarks[0];
    const middleMcp = landmarks[9];
    const currentY = wrist.y * 0.6 + middleMcp.y * 0.4;

    this.history.push({ y: currentY, timestamp });

    // Prune old history outside window
    const cutoff = timestamp - this.maxHistoryMs;
    while (this.history.length > 2 && this.history[0].timestamp < cutoff) {
      this.history.shift();
    }

    if (this.history.length < 2) {
      return {
        currentY,
        velocityY: 0,
        displacement: 0,
        dt: 0,
        isValid: true,
      };
    }

    const oldest = this.history[0];
    const dt = (timestamp - oldest.timestamp) / 1000; // in seconds

    if (dt <= 0.005) {
      return {
        currentY,
        velocityY: 0,
        displacement: 0,
        dt: 0,
        isValid: true,
      };
    }

    const displacement = currentY - oldest.y;
    const velocityY = displacement / dt;

    return {
      currentY,
      velocityY,
      displacement,
      dt,
      isValid: true,
    };
  }
}
