import { describe, expect, it } from 'vitest';
import { createHandLandmarks } from './fixtures/handLandmarks';
import { MotionAnalyzer } from '../vision/MotionAnalyzer';
import { StrumDetector } from '../vision/StrumDetector';

describe('MotionAnalyzer & StrumDetector', () => {
  it('correctly detects a downward strum stroke with velocity and displacement', () => {
    const analyzer = new MotionAnalyzer();
    const detector = new StrumDetector({
      minSpeed: 0.7,
      minDisplacement: 0.04,
      cooldownMs: 120,
    });

    // Initial position: hand high at y = 0.30
    const lmStart = createHandLandmarks({ wristY: 0.30 });
    const m1 = analyzer.update(lmStart, 100);
    const ev1 = detector.processMotion(m1, 'c-major', 100);
    expect(ev1).toBeNull();

    // Fast downward movement: y drops to 0.45 in 60ms (displacement = +0.15, speed = 2.5 units/s)
    const lmDrop = createHandLandmarks({ wristY: 0.45 });
    const m2 = analyzer.update(lmDrop, 160);
    expect(m2.velocityY).toBeGreaterThan(0.7);

    const ev2 = detector.processMotion(m2, 'c-major', 160);
    expect(ev2).not.toBeNull();
    expect(ev2?.direction).toBe('down');
    expect(ev2?.chordId).toBe('c-major');
    expect(ev2?.speed).toBeGreaterThan(0.7);
    expect(ev2?.displacement).toBeGreaterThanOrEqual(0.04);
  });

  it('correctly detects an upward strum stroke', () => {
    const analyzer = new MotionAnalyzer();
    const detector = new StrumDetector({
      minSpeed: 0.7,
      minDisplacement: 0.04,
      cooldownMs: 120,
    });

    // Initial position: hand low at y = 0.65
    const lmLow = createHandLandmarks({ wristY: 0.65 });
    const m1 = analyzer.update(lmLow, 100);
    detector.processMotion(m1, 'g-major', 100);

    // Fast upward movement: y rises to 0.50 in 60ms (velocity negative)
    const lmHigh = createHandLandmarks({ wristY: 0.50 });
    const m2 = analyzer.update(lmHigh, 160);
    expect(m2.velocityY).toBeLessThan(-0.7);

    const ev2 = detector.processMotion(m2, 'g-major', 160);
    expect(ev2).not.toBeNull();
    expect(ev2?.direction).toBe('up');
    expect(ev2?.chordId).toBe('g-major');
  });

  it('rejects movements with insufficient speed (slow hand drift)', () => {
    const analyzer = new MotionAnalyzer();
    const detector = new StrumDetector({
      minSpeed: 0.8,
      minDisplacement: 0.04,
    });

    // Hand moves slowly over 500ms
    const lm1 = createHandLandmarks({ wristY: 0.30 });
    analyzer.update(lm1, 100);

    const lm2 = createHandLandmarks({ wristY: 0.35 });
    const m2 = analyzer.update(lm2, 600); // 0.05 / 0.5s = 0.1 units/s (< 0.8 min)

    const event = detector.processMotion(m2, 'd-major', 600);
    expect(event).toBeNull();
  });

  it('rejects movements with insufficient displacement (tiny jitter/tremor)', () => {
    const analyzer = new MotionAnalyzer();
    const detector = new StrumDetector({
      minSpeed: 0.5,
      minDisplacement: 0.05,
    });

    // Very fast tiny jitter (displacement only 0.01)
    const lm1 = createHandLandmarks({ wristY: 0.40 });
    analyzer.update(lm1, 100);

    const lm2 = createHandLandmarks({ wristY: 0.41 });
    const m2 = analyzer.update(lm2, 110); // Fast, but displacement is only 0.01

    const event = detector.processMotion(m2, 'e-minor', 110);
    expect(event).toBeNull();
  });

  it('suppresses duplicate triggers during cooldown and requires re-arming', () => {
    const analyzer = new MotionAnalyzer();
    const detector = new StrumDetector({
      minSpeed: 0.7,
      minDisplacement: 0.04,
      cooldownMs: 120,
    });

    // First stroke down
    analyzer.update(createHandLandmarks({ wristY: 0.30 }), 100);
    const m1 = analyzer.update(createHandLandmarks({ wristY: 0.45 }), 160);
    const ev1 = detector.processMotion(m1, 'a-minor', 160);
    expect(ev1).not.toBeNull();

    // Still moving downward in the same stroke during cooldown (at 200ms, dt=40ms < 120ms)
    const m2 = analyzer.update(createHandLandmarks({ wristY: 0.55 }), 200);
    const ev2 = detector.processMotion(m2, 'a-minor', 200);
    expect(ev2).toBeNull(); // Suppressed!

    // Past cooldown (at 300ms), but hand has NOT slowed down or reversed yet
    const m3 = analyzer.update(createHandLandmarks({ wristY: 0.65 }), 300);
    const ev3 = detector.processMotion(m3, 'a-minor', 300);
    expect(ev3).toBeNull(); // Must re-arm first!

    // Hand stops moving / settles (velocity ~ 0)
    const m4 = analyzer.update(createHandLandmarks({ wristY: 0.65 }), 400);
    detector.processMotion(m4, 'a-minor', 400); // Re-armed!

    // Now a new upward stroke can trigger cleanly
    const m5 = analyzer.update(createHandLandmarks({ wristY: 0.48 }), 460);
    const ev5 = detector.processMotion(m5, 'a-minor', 460);
    expect(ev5).not.toBeNull();
    expect(ev5?.direction).toBe('up');
  });

  it('resets tracking and does not produce spurious strum on tracking loss', () => {
    const analyzer = new MotionAnalyzer();
    const detector = new StrumDetector();

    // Hand was at y = 0.20
    analyzer.update(createHandLandmarks({ wristY: 0.20 }), 100);

    // Tracking is lost (null landmarks)
    const lostMotion = analyzer.update(null, 500);
    expect(lostMotion.isValid).toBe(false);
    const lostEvent = detector.processMotion(lostMotion, 'c-major', 500);
    expect(lostEvent).toBeNull();

    // Hand reappears at y = 0.80 (huge distance from where it vanished)
    // MotionAnalyzer and StrumDetector should reset and NOT treat this as a 0.6 displacement strum!
    const returnMotion = analyzer.update(createHandLandmarks({ wristY: 0.80 }), 800);
    const returnEvent = detector.processMotion(returnMotion, 'c-major', 800);
    expect(returnEvent).toBeNull();
  });

  it('associates the exact active chord ID captured at the instant of strumming', () => {
    const analyzer = new MotionAnalyzer();
    const detector = new StrumDetector({ minSpeed: 0.7, minDisplacement: 0.04 });

    analyzer.update(createHandLandmarks({ wristY: 0.25 }), 100);
    const m = analyzer.update(createHandLandmarks({ wristY: 0.45 }), 150);

    // Active chord changed to 'e-minor'
    const ev = detector.processMotion(m, 'e-minor', 150);
    expect(ev?.chordId).toBe('e-minor');
  });
});
