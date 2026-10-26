import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CHORD_MAPPINGS,
  getChordById,
  getChordForFingerCount,
} from '../audio/chordRegistry';
import { GestureClassifier } from '../vision/GestureClassifier';
import { createHandLandmarks } from './fixtures/handLandmarks';

describe('GestureClassifier & Chord Mappings', () => {
  it('correctly classifies individual finger extension and fist', () => {
    const classifier = new GestureClassifier({ stabilityMs: 100 });

    // Fist (all folded)
    const fist = createHandLandmarks({});
    const resFist = classifier.classify(fist, 100);
    expect(resFist.rawFingerCount).toBe(0);
    expect(resFist.fingerStates.index.extended).toBe(false);
    expect(resFist.fingerStates.middle.extended).toBe(false);

    // 1 Finger: Index
    const oneFinger = createHandLandmarks({ indexExtended: true });
    const res1 = classifier.classify(oneFinger, 200);
    expect(res1.rawFingerCount).toBe(1);
    expect(res1.fingerStates.index.extended).toBe(true);
    expect(res1.fingerStates.middle.extended).toBe(false);
  });

  it('classifies all five default finger count gestures', () => {
    const classifier = new GestureClassifier({ stabilityMs: 50 });

    // 1 Finger -> C Major
    const lm1 = createHandLandmarks({ indexExtended: true });
    classifier.classify(lm1, 100);
    const r1 = classifier.classify(lm1, 200);
    expect(r1.fingerCount).toBe(1);
    const chord1 = getChordForFingerCount(r1.fingerCount, DEFAULT_CHORD_MAPPINGS);
    expect(chord1?.id).toBe('c-major');

    // 2 Fingers -> G Major
    const lm2 = createHandLandmarks({ indexExtended: true, middleExtended: true });
    classifier.classify(lm2, 300);
    const r2 = classifier.classify(lm2, 400);
    expect(r2.fingerCount).toBe(2);
    const chord2 = getChordForFingerCount(r2.fingerCount, DEFAULT_CHORD_MAPPINGS);
    expect(chord2?.id).toBe('g-major');

    // 3 Fingers -> D Major
    const lm3 = createHandLandmarks({
      indexExtended: true,
      middleExtended: true,
      ringExtended: true,
    });
    classifier.classify(lm3, 500);
    const r3 = classifier.classify(lm3, 600);
    expect(r3.fingerCount).toBe(3);
    const chord3 = getChordForFingerCount(r3.fingerCount, DEFAULT_CHORD_MAPPINGS);
    expect(chord3?.id).toBe('d-major');

    // 4 Fingers -> E Minor
    const lm4 = createHandLandmarks({
      indexExtended: true,
      middleExtended: true,
      ringExtended: true,
      pinkyExtended: true,
    });
    classifier.classify(lm4, 700);
    const r4 = classifier.classify(lm4, 800);
    expect(r4.fingerCount).toBe(4);
    const chord4 = getChordForFingerCount(r4.fingerCount, DEFAULT_CHORD_MAPPINGS);
    expect(chord4?.id).toBe('e-minor');

    // 5 Fingers -> A Minor
    const lm5 = createHandLandmarks({
      thumbExtended: true,
      indexExtended: true,
      middleExtended: true,
      ringExtended: true,
      pinkyExtended: true,
    });
    classifier.classify(lm5, 900);
    const r5 = classifier.classify(lm5, 1000);
    expect(r5.fingerCount).toBe(5);
    const chord5 = getChordForFingerCount(r5.fingerCount, DEFAULT_CHORD_MAPPINGS);
    expect(chord5?.id).toBe('a-minor');
  });

  it('enforces stability hysteresis window before switching chords', () => {
    const classifier = new GestureClassifier({ stabilityMs: 150 });

    // Establish stable 1 finger (C Major)
    const lm1 = createHandLandmarks({ indexExtended: true });
    classifier.classify(lm1, 100);
    classifier.classify(lm1, 300);
    expect(classifier.getStableFingerCount()).toBe(1);

    // Briefly show 2 fingers for 50ms (< 150ms stability requirement)
    const lm2 = createHandLandmarks({ indexExtended: true, middleExtended: true });
    classifier.classify(lm2, 350);
    const rTemp = classifier.classify(lm2, 400); // 50ms held
    expect(rTemp.isStable).toBe(false);
    expect(classifier.getStableFingerCount()).toBe(1); // Stays at 1!

    // Hold 2 fingers past stability threshold (400 -> 550ms: 150ms held)
    const rStable = classifier.classify(lm2, 560);
    expect(rStable.isStable).toBe(true);
    expect(classifier.getStableFingerCount()).toBe(2); // Switches to 2!
  });

  it('preserves current chord during brief tracking loss within grace period', () => {
    const classifier = new GestureClassifier({ stabilityMs: 100, trackingLossGraceMs: 800 });

    // Establish 2 fingers (G Major)
    const lm2 = createHandLandmarks({ indexExtended: true, middleExtended: true });
    classifier.classify(lm2, 100);
    classifier.classify(lm2, 250);
    expect(classifier.getStableFingerCount()).toBe(2);

    // Hand disappears (null landmarks) for 300ms (< 800ms grace)
    const lossResult = classifier.classify(null, 550);
    expect(lossResult.isStable).toBe(true);
    expect(lossResult.fingerCount).toBe(2); // Preserved!

    // Hand absent past grace period (> 800ms)
    const expiredResult = classifier.classify(null, 1500);
    expect(expiredResult.isStable).toBe(false);
    expect(expiredResult.fingerCount).toBe(0);
  });

  it('supports custom chord mappings', () => {
    const customMappings = [
      { gestureFingerCount: 1, chordId: 'e-minor' },
      { gestureFingerCount: 2, chordId: 'c-major' },
    ];

    const chord1 = getChordForFingerCount(1, customMappings);
    expect(chord1?.id).toBe('e-minor');

    const chord2 = getChordForFingerCount(2, customMappings);
    expect(chord2?.id).toBe('c-major');

    const unmapped = getChordForFingerCount(4, customMappings);
    expect(unmapped).toBeNull();
  });

  it('provides complete metadata for every chord in registry', () => {
    const chordIds = ['c-major', 'g-major', 'd-major', 'e-minor', 'a-minor'];
    for (const id of chordIds) {
      const def = getChordById(id);
      expect(def).toBeDefined();
      expect(def.frets).toHaveLength(6);
      expect(def.strings).toHaveLength(6);
      expect(def.audioAssets.down).toContain(id);
      expect(def.audioAssets.up).toContain(id);
    }
  });
});
