import type {
  FingerName,
  FingerState,
  FingerStates,
  GestureResult,
  HandLandmark,
} from '../types';

export interface GestureClassifierConfig {
  stabilityMs: number;       // Time in ms to confirm gesture change (default 140ms)
  trackingLossGraceMs: number; // Grace period before resetting on loss (default 800ms)
}

/**
 * Geometric, orientation-invariant finger state and gesture classifier.
 * Employs scale-invariant knuckle distances, curvature analysis, and temporal hysteresis.
 */
export class GestureClassifier {
  private config: GestureClassifierConfig;

  // Hysteresis & temporal stability tracking
  private stableFingerCount: number = 1; // Default to 1 (C Major)
  private candidateFingerCount: number = 1;
  private candidateStartTime: number = 0;
  private lastHandPresentTime: number = 0;

  constructor(config: Partial<GestureClassifierConfig> = {}) {
    this.config = {
      stabilityMs: config.stabilityMs ?? 140,
      trackingLossGraceMs: config.trackingLossGraceMs ?? 800,
    };
  }

  public updateConfig(partial: Partial<GestureClassifierConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  public getStableFingerCount(): number {
    return this.stableFingerCount;
  }

  public reset(): void {
    this.candidateFingerCount = this.stableFingerCount;
    this.candidateStartTime = 0;
    this.lastHandPresentTime = 0;
  }

  /**
   * Evaluates hand landmarks and returns finger states and stabilized gesture.
   */
  public classify(landmarks: HandLandmark[] | null, timestamp: number): GestureResult {

    if (!landmarks || landmarks.length < 21) {
      const timeSinceLoss = timestamp - this.lastHandPresentTime;
      const isWithinGrace = this.lastHandPresentTime > 0 && timeSinceLoss < this.config.trackingLossGraceMs;

      return {
        fingerCount: isWithinGrace ? this.stableFingerCount : 0,
        rawFingerCount: 0,
        fingerStates: this.createEmptyFingerStates(),
        confidence: 0,
        matchedGestureId: isWithinGrace ? `gesture-${this.stableFingerCount}` : null,
        isStable: isWithinGrace,
      };
    }

    this.lastHandPresentTime = timestamp;

    // 1. Calculate invariant scale (wrist to middle MCP)
    const wrist = landmarks[0];
    const middleMcp = landmarks[9];
    const palmLength = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y);

    if (palmLength < 0.01) {
      // Degenerated geometry
      return {
        fingerCount: this.stableFingerCount,
        rawFingerCount: 0,
        fingerStates: this.createEmptyFingerStates(),
        confidence: 0,
        matchedGestureId: null,
        isStable: false,
      };
    }

    // 2. Classify individual fingers using scale-invariant relative geometry
    const fingerStates: FingerStates = {
      thumb: this.evaluateThumb(landmarks, palmLength),
      index: this.evaluateFinger(landmarks, 5, 6, 7, 8, palmLength),
      middle: this.evaluateFinger(landmarks, 9, 10, 11, 12, palmLength),
      ring: this.evaluateFinger(landmarks, 13, 14, 15, 16, palmLength),
      pinky: this.evaluateFinger(landmarks, 17, 18, 19, 20, palmLength),
    };

    // 3. Count extended fingers
    let rawCount = 0;
    let confidenceSum = 0;
    const fingers: FingerName[] = ['thumb', 'index', 'middle', 'ring', 'pinky'];

    for (const f of fingers) {
      if (fingerStates[f].extended) {
        rawCount++;
      }
      confidenceSum += fingerStates[f].confidence;
    }
    const avgConfidence = confidenceSum / 5;

    // 4. Temporal Hysteresis & Stability Window
    let isStable = false;

    if (rawCount !== this.candidateFingerCount) {
      this.candidateFingerCount = rawCount;
      this.candidateStartTime = timestamp;
    } else {
      const heldDuration = timestamp - this.candidateStartTime;
      if (heldDuration >= this.config.stabilityMs) {
        if (this.stableFingerCount !== this.candidateFingerCount && this.candidateFingerCount > 0) {
          this.stableFingerCount = this.candidateFingerCount;
        }
        isStable = true;
      }
    }

    return {
      fingerCount: this.stableFingerCount,
      rawFingerCount: rawCount,
      fingerStates,
      confidence: avgConfidence,
      matchedGestureId: `gesture-${this.stableFingerCount}`,
      isStable,
    };
  }

  /**
   * Evaluates non-thumb fingers (index, middle, ring, pinky)
   */
  private evaluateFinger(
    lm: HandLandmark[],
    mcpIdx: number,
    pipIdx: number,
    dipIdx: number,
    tipIdx: number,
    palmLength: number
  ): FingerState {
    const wrist = lm[0];
    const mcp = lm[mcpIdx];
    const pip = lm[pipIdx];
    const dip = lm[dipIdx];
    const tip = lm[tipIdx];

    const dWristTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
    const dWristPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
    const dMcpTip = Math.hypot(tip.x - mcp.x, tip.y - mcp.y);

    // Theoretical maximum extension along segments
    const segmentLength =
      Math.hypot(pip.x - mcp.x, pip.y - mcp.y) +
      Math.hypot(dip.x - pip.x, dip.y - pip.y) +
      Math.hypot(tip.x - dip.x, tip.y - dip.y);

    const straightnessRatio = segmentLength > 0.001 ? dMcpTip / segmentLength : 0;
    const extensionRatio = dWristPip > 0.001 ? dWristTip / dWristPip : 0;

    // Finger is considered extended if:
    // 1) tip is significantly further from wrist than PIP is
    // 2) straightness ratio is high (not curled into a fist)
    const isExtended = extensionRatio > 1.15 && straightnessRatio > 0.72;

    const confidence = Math.min(1.0, Math.max(0.1, straightnessRatio));

    return {
      extended: isExtended,
      confidence,
      tipDistance: dMcpTip / palmLength,
    };
  }

  /**
   * Evaluates thumb abduction/extension relative to palm
   */
  private evaluateThumb(lm: HandLandmark[], palmLength: number): FingerState {
    const wrist = lm[0];
    const thumbCmc = lm[1];
    const thumbMcp = lm[2];
    const thumbIp = lm[3];
    const thumbTip = lm[4];
    const indexMcp = lm[5];
    const pinkyMcp = lm[17];

    // Distance from thumb tip to pinky MCP (abduction across palm)
    const dTipPinkyMcp = Math.hypot(thumbTip.x - pinkyMcp.x, thumbTip.y - pinkyMcp.y);
    // Distance from thumb tip to index MCP (tuck against index)
    const dTipIndexMcp = Math.hypot(thumbTip.x - indexMcp.x, thumbTip.y - indexMcp.y);
    // Distance from thumb tip to wrist
    const dWristTip = Math.hypot(thumbTip.x - wrist.x, thumbTip.y - wrist.y);
    const dWristMcp = Math.hypot(thumbMcp.x - wrist.x, thumbMcp.y - wrist.y);

    // Straightness of thumb
    const thumbSegments =
      Math.hypot(thumbMcp.x - thumbCmc.x, thumbMcp.y - thumbCmc.y) +
      Math.hypot(thumbIp.x - thumbMcp.x, thumbIp.y - thumbMcp.y) +
      Math.hypot(thumbTip.x - thumbIp.x, thumbTip.y - thumbIp.y);

    const thumbStraightness =
      thumbSegments > 0.001
        ? Math.hypot(thumbTip.x - thumbCmc.x, thumbTip.y - thumbCmc.y) / thumbSegments
        : 0;

    // Normalized against palm
    const normTipPinky = dTipPinkyMcp / palmLength;
    const normTipIndex = dTipIndexMcp / palmLength;

    // When thumb is extended/spread open, it moves away from both index MCP and pinky MCP
    const isExtended =
      (normTipPinky > 0.65 || normTipIndex > 0.42) &&
      dWristTip > dWristMcp * 1.08 &&
      thumbStraightness > 0.70;

    return {
      extended: isExtended,
      confidence: Math.min(1.0, Math.max(0.1, thumbStraightness)),
      tipDistance: normTipIndex,
    };
  }

  private createEmptyFingerStates(): FingerStates {
    return {
      thumb: { extended: false, confidence: 0, tipDistance: 0 },
      index: { extended: false, confidence: 0, tipDistance: 0 },
      middle: { extended: false, confidence: 0, tipDistance: 0 },
      ring: { extended: false, confidence: 0, tipDistance: 0 },
      pinky: { extended: false, confidence: 0, tipDistance: 0 },
    };
  }
}
