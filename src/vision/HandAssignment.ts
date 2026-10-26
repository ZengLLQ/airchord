import type { HandAssignment, Handedness, TrackedHand } from '../types';

export interface HandAssignmentConfig {
  chordHandRole: Handedness; // Which physical hand plays chords ('Left' default)
  strumHandRole: Handedness; // Which physical hand strums ('Right' default)
  mirrorVideo: boolean;      // Whether video is mirrored (true default)
}

/**
 * Assigns tracked hands to instrument roles (Chord hand vs Strumming hand).
 * Takes video mirroring and spatial heuristics into account to prevent role flipping.
 */
export class HandAssigner {
  private config: HandAssignmentConfig;

  constructor(config: HandAssignmentConfig) {
    this.config = { ...config };
  }

  public updateConfig(partial: Partial<HandAssignmentConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  /**
   * Assigns detected hands to Chord and Strum roles.
   * In a mirrored selfie camera:
   * - Physical Left hand appears on user's left (screen x < 0.5)
   * - Physical Right hand appears on user's right (screen x > 0.5)
   */
  public assignHands(detectedHands: TrackedHand[]): HandAssignment {
    const chordRole = this.config.chordHandRole;
    const strumRole = this.config.strumHandRole;

    if (!detectedHands || detectedHands.length === 0) {
      return {
        chordHand: null,
        strumHand: null,
        chordRoleHandedness: chordRole,
        strumRoleHandedness: strumRole,
        isAmbiguous: false,
      };
    }

    const estimatePhysicalHand = (hand: TrackedHand): Handedness => {
      const wristX = hand.landmarks[0]?.x ?? 0.5;
      // In camera coordinates (camera facing user):
      // When mirrored: Camera right (wristX > 0.5) corresponds to user's physical Left
      // When natural/unmirrored: Camera left (wristX < 0.5) corresponds to user's physical Left
      const spatialEstimate: Handedness = this.config.mirrorVideo
        ? (wristX > 0.5 ? 'Left' : 'Right')
        : (wristX < 0.5 ? 'Left' : 'Right');

      // If hand has high detection score and reliable anatomical handedness:
      if (hand.score >= 0.7 && hand.handedness) {
        // Near center boundary (0.42 - 0.58), trust anatomical handedness
        if (wristX >= 0.42 && wristX <= 0.58) {
          return hand.handedness;
        }
      }
      return spatialEstimate;
    };

    if (detectedHands.length === 1) {
      const singleHand = detectedHands[0];
      const estimatedHand = estimatePhysicalHand(singleHand);

      if (estimatedHand === chordRole) {
        return {
          chordHand: singleHand,
          strumHand: null,
          chordRoleHandedness: chordRole,
          strumRoleHandedness: strumRole,
          isAmbiguous: false,
        };
      } else {
        return {
          chordHand: null,
          strumHand: singleHand,
          chordRoleHandedness: chordRole,
          strumRoleHandedness: strumRole,
          isAmbiguous: false,
        };
      }
    }

    // Two or more hands
    const hand1 = detectedHands[0];
    const hand2 = detectedHands[1];

    const x1 = hand1.landmarks[0]?.x ?? 0.5;
    const x2 = hand2.landmarks[0]?.x ?? 0.5;

    // Physical Left vs Right determined by mirroring configuration
    const physicalLeftHand = this.config.mirrorVideo
      ? (x1 >= x2 ? hand1 : hand2)
      : (x1 <= x2 ? hand1 : hand2);
    const physicalRightHand = this.config.mirrorVideo
      ? (x1 >= x2 ? hand2 : hand1)
      : (x1 <= x2 ? hand2 : hand1);

    const isAmbiguous = Math.abs(x1 - x2) < 0.12; // Hands overlapping

    const chordHand = chordRole === 'Left' ? physicalLeftHand : physicalRightHand;
    const strumHand = strumRole === 'Right' ? physicalRightHand : physicalLeftHand;

    return {
      chordHand,
      strumHand,
      chordRoleHandedness: chordRole,
      strumRoleHandedness: strumRole,
      isAmbiguous,
    };
  }
}

/**
 * Convenience functional wrapper for hand assignment.
 */
export function assignHands(
  detectedHands: TrackedHand[],
  config: HandAssignmentConfig
): HandAssignment {
  return new HandAssigner(config).assignHands(detectedHands);
}
