import type { StrumDirection, StrumEvent } from '../types';
import type { MotionAnalysis } from './MotionAnalyzer';

export interface StrumDetectorConfig {
  minSpeed: number;          // Normalized units/second (default 0.75)
  minDisplacement: number;   // Normalized vertical units (default 0.04)
  cooldownMs: number;        // Cooldown between strums in ms (default 120ms)
}

type StrumState = 'ARMED' | 'STROKE_CANDIDATE' | 'COOLDOWN' | 'REARMING';

export class StrumDetector {
  private config: StrumDetectorConfig;
  private state: StrumState = 'ARMED';
  private strokeDirection: StrumDirection | null = null;
  private strokeStartY: number = 0;
  private strokeStartTime: number = 0;
  private peakSpeed: number = 0;
  private lastStrumTime: number = 0;
  private eventCounter: number = 0;

  constructor(config: Partial<StrumDetectorConfig> = {}) {
    this.config = {
      minSpeed: config.minSpeed ?? 0.75,
      minDisplacement: config.minDisplacement ?? 0.04,
      cooldownMs: config.cooldownMs ?? 120,
    };
  }

  public updateConfig(partial: Partial<StrumDetectorConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  public reset(): void {
    this.state = 'ARMED';
    this.strokeDirection = null;
    this.strokeStartY = 0;
    this.strokeStartTime = 0;
    this.peakSpeed = 0;
  }

  /**
   * Evaluates motion analysis for a new frame.
   * If a valid strum occurs, returns the generated StrumEvent; otherwise returns null.
   */
  public processMotion(
    motion: MotionAnalysis,
    activeChordId: string,
    timestamp: number
  ): StrumEvent | null {
    if (!motion.isValid) {
      // Tracking lost or invalid: reset detector state to avoid firing on return
      this.reset();
      return null;
    }

    const { currentY, velocityY } = motion;
    const speed = Math.abs(velocityY);

    // State 1: COOLDOWN
    if (this.state === 'COOLDOWN') {
      if (timestamp - this.lastStrumTime >= this.config.cooldownMs) {
        this.state = 'REARMING';
      } else {
        return null;
      }
    }

    // State 2: REARMING (Hand must slow down or reverse before next stroke can be armed)
    if (this.state === 'REARMING') {
      const isSlow = speed < this.config.minSpeed * 0.45;
      const isReversing =
        (this.strokeDirection === 'down' && velocityY < -0.1) ||
        (this.strokeDirection === 'up' && velocityY > 0.1);

      if (isSlow || isReversing) {
        this.state = 'ARMED';
        this.strokeDirection = null;
      } else {
        return null;
      }
    }

    // State 3: ARMED (Waiting for strum initiation)
    if (this.state === 'ARMED') {
      if (speed >= this.config.minSpeed) {
        const direction: StrumDirection = velocityY > 0 ? 'down' : 'up';
        const startY = currentY - motion.displacement;
        const initialDisplacement = Math.abs(motion.displacement);

        this.strokeDirection = direction;
        this.strokeStartY = startY;
        this.strokeStartTime = timestamp;
        this.peakSpeed = speed;

        // If the movement in this window already satisfies min displacement, trigger immediately!
        if (initialDisplacement >= this.config.minDisplacement) {
          this.eventCounter++;
          this.lastStrumTime = timestamp;
          this.state = 'COOLDOWN';

          const confidence = Math.min(1.0, Math.max(0.5, speed / (this.config.minSpeed * 1.5)));
          return {
            id: `strum-${this.eventCounter}-${timestamp}`,
            direction,
            timestamp,
            speed,
            displacement: initialDisplacement,
            confidence,
            chordId: activeChordId,
          };
        } else {
          this.state = 'STROKE_CANDIDATE';
        }
      }
      return null;
    }

    // State 4: STROKE_CANDIDATE (Verifying minimum displacement & trajectory)
    if (this.state === 'STROKE_CANDIDATE') {
      if (speed > this.peakSpeed) {
        this.peakSpeed = speed;
      }

      const totalDisplacement = currentY - this.strokeStartY;
      const isSameDirection =
        (this.strokeDirection === 'down' && totalDisplacement > 0) ||
        (this.strokeDirection === 'up' && totalDisplacement < 0);

      // If hand abruptly reverses before meeting displacement threshold, abort candidate
      if (!isSameDirection && Math.abs(totalDisplacement) > 0.01) {
        this.reset();
        return null;
      }

      const absDisplacement = Math.abs(totalDisplacement);

      // Candidate exceeds required displacement: TRIGGER VALID STRUM!
      if (absDisplacement >= this.config.minDisplacement) {
        this.eventCounter++;
        this.lastStrumTime = timestamp;
        this.state = 'COOLDOWN';

        const direction = this.strokeDirection!;
        const confidence = Math.min(1.0, Math.max(0.5, this.peakSpeed / (this.config.minSpeed * 1.5)));

        const event: StrumEvent = {
          id: `strum-${this.eventCounter}-${timestamp}`,
          direction,
          timestamp,
          speed: this.peakSpeed,
          displacement: absDisplacement,
          confidence,
          chordId: activeChordId,
        };

        return event;
      }

      // Timeout candidate if it takes too long (> 200ms) without achieving displacement
      if (timestamp - this.strokeStartTime > 200) {
        this.reset();
      }
    }

    return null;
  }
}
