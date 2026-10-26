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

    // Helper: determine estimated physical handedness of a hand
    // MediaPipe reports handedness from camera POV:
    // Physical right hand facing camera appears on camera's left, so MediaPipe often labels it 'Left'.
    // Furthermore, screen x position is very reliable in practice:
    // If mirrored: physical left hand is on screen left (x < 0.5), physical right hand is on screen right (x >= 0.5).
    // If not mirrored: physical left hand is on screen right (x >= 0.5), physical right hand is on screen left (x < 0.5).
    const estimateHandSide = (hand: TrackedHand): Handedness => {
      const wristX = hand.landmarks[0]?.x ?? 0.5;
      if (this.config.mirrorVideo) {
        // Mirrored: left side of screen corresponds to user's physical left
        return wristX < 0.5 ? 'Left' : 'Right';
      } else {
        return wristX >= 0.5 ? 'Left' : 'Right';
      }
    };

    if (detectedHands.length === 1) {
      const singleHand = detectedHands[0];
      const estimatedHand = estimateHandSide(singleHand);

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

    const side1 = estimateHandSide(hand1);
    const side2 = estimateHandSide(hand2);

    let chordHand: TrackedHand | null = null;
    let strumHand: TrackedHand | null = null;
    let isAmbiguous = false;

    if (side1 !== side2) {
      // Clear spatial separation
      chordHand = side1 === chordRole ? hand1 : hand2;
      strumHand = side1 === strumRole ? hand1 : hand2;
    } else {
      // Both hands detected on same side: evaluate horizontal order
      const x1 = hand1.landmarks[0]?.x ?? 0;
      const x2 = hand2.landmarks[0]?.x ?? 0;

      if (this.config.mirrorVideo) {
        // More to the left = Left hand, more to the right = Right hand
        const leftHand = x1 < x2 ? hand1 : hand2;
        const rightHand = x1 < x2 ? hand2 : hand1;
        chordHand = chordRole === 'Left' ? leftHand : rightHand;
        strumHand = strumRole === 'Right' ? rightHand : leftHand;
      } else {
        const leftHand = x1 > x2 ? hand1 : hand2;
        const rightHand = x1 > x2 ? hand2 : hand1;
        chordHand = chordRole === 'Left' ? leftHand : rightHand;
        strumHand = strumRole === 'Right' ? rightHand : leftHand;
      }
      isAmbiguous = Math.abs(x1 - x2) < 0.12; // Overlapping
    }

    return {
      chordHand,
      strumHand,
      chordRoleHandedness: chordRole,
      strumRoleHandedness: strumRole,
      isAmbiguous,
    };
  }
}
