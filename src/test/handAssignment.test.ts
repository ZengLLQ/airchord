import { describe, expect, it } from 'vitest';
import { assignHands, type HandAssignmentConfig } from '../vision/HandAssignment';
import type { TrackedHand } from '../types';
import { createHandLandmarks } from './fixtures/handLandmarks';

describe('HandAssignment - Dual-Hand Spatial Separation & Role Assignment', () => {
  const defaultConfig: HandAssignmentConfig = {
    chordHandRole: 'Left',
    strumHandRole: 'Right',
    mirrorVideo: true,
  };

  const createMockHand = (wristX: number, handedness: 'Left' | 'Right'): TrackedHand => ({
    landmarks: createHandLandmarks({ wristX, wristY: 0.6 }),
    handedness,
    score: 0.95,
  });

  describe('Two Hands Tracking - Mirrored View (Default Selfie Mode)', () => {
    it('correctly assigns user physical Left hand (camera right, x > 0.5) to Chord Hand and physical Right hand (camera left, x < 0.5) to Strum Hand', () => {
      // User's Left hand appears on the right side of the camera frame (e.g. x = 0.75)
      // User's Right hand appears on the left side of the camera frame (e.g. x = 0.25)
      const handOnCameraRight = createMockHand(0.75, 'Left');
      const handOnCameraLeft = createMockHand(0.25, 'Right');

      const assignment = assignHands([handOnCameraLeft, handOnCameraRight], defaultConfig);

      expect(assignment.chordHand).toBeDefined();
      expect(assignment.strumHand).toBeDefined();
      expect(assignment.chordHand?.landmarks[0].x).toBe(0.75); // Camera right = Physical Left = Chord Hand
      expect(assignment.strumHand?.landmarks[0].x).toBe(0.25); // Camera left = Physical Right = Strum Hand
      expect(assignment.isAmbiguous).toBe(false);
    });

    it('supports left-handed guitar players (chordHandRole = Right, strumHandRole = Left)', () => {
      const leftHandedConfig: HandAssignmentConfig = {
        chordHandRole: 'Right',
        strumHandRole: 'Left',
        mirrorVideo: true,
      };

      const handOnCameraRight = createMockHand(0.75, 'Left');
      const handOnCameraLeft = createMockHand(0.25, 'Right');

      const assignment = assignHands([handOnCameraLeft, handOnCameraRight], leftHandedConfig);

      // Now Chord Hand is Physical Right (Camera Left, x = 0.25)
      expect(assignment.chordHand?.landmarks[0].x).toBe(0.25);
      // Strum Hand is Physical Left (Camera Right, x = 0.75)
      expect(assignment.strumHand?.landmarks[0].x).toBe(0.75);
    });

    it('detects ambiguous overlapping hands when wrists are closer than 0.12 horizontally', () => {
      const handA = createMockHand(0.52, 'Left');
      const handB = createMockHand(0.48, 'Right'); // delta = 0.04 < 0.12

      const assignment = assignHands([handA, handB], defaultConfig);

      expect(assignment.isAmbiguous).toBe(true);
    });

    it('does not flag ambiguity when hands are well separated', () => {
      const handA = createMockHand(0.75, 'Left');
      const handB = createMockHand(0.25, 'Right'); // delta = 0.50 >> 0.12

      const assignment = assignHands([handA, handB], defaultConfig);

      expect(assignment.isAmbiguous).toBe(false);
    });
  });

  describe('Two Hands Tracking - Natural / Unmirrored Mode', () => {
    const unmirroredConfig: HandAssignmentConfig = {
      chordHandRole: 'Left',
      strumHandRole: 'Right',
      mirrorVideo: false,
    };

    it('inverts spatial assignment when mirrorVideo is false', () => {
      // In unmirrored mode, physical Left corresponds to camera Left (x < 0.5)
      const handOnLeft = createMockHand(0.25, 'Left');
      const handOnRight = createMockHand(0.75, 'Right');

      const assignment = assignHands([handOnLeft, handOnRight], unmirroredConfig);

      expect(assignment.chordHand?.landmarks[0].x).toBe(0.25);
      expect(assignment.strumHand?.landmarks[0].x).toBe(0.75);
      expect(assignment.isAmbiguous).toBe(false);
    });
  });

  describe('Single Hand Tracking', () => {
    it('assigns single hand on camera right (x > 0.5) to Chord Hand in mirrored mode', () => {
      const singleHand = createMockHand(0.72, 'Left');

      const assignment = assignHands([singleHand], defaultConfig);

      expect(assignment.chordHand?.landmarks[0].x).toBe(0.72);
      expect(assignment.strumHand).toBeNull();
      expect(assignment.isAmbiguous).toBe(false);
    });

    it('assigns single hand on camera left (x < 0.5) to Strum Hand in mirrored mode', () => {
      const singleHand = createMockHand(0.28, 'Right');

      const assignment = assignHands([singleHand], defaultConfig);

      expect(assignment.strumHand?.landmarks[0].x).toBe(0.28);
      expect(assignment.chordHand).toBeNull();
      expect(assignment.isAmbiguous).toBe(false);
    });
  });

  describe('Zero Hands Tracking', () => {
    it('returns empty assignment with null hands and false ambiguity', () => {
      const assignment = assignHands([], defaultConfig);

      expect(assignment.chordHand).toBeNull();
      expect(assignment.strumHand).toBeNull();
      expect(assignment.isAmbiguous).toBe(false);
    });
  });
});
