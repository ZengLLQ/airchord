import type { ChordDefinition, ChordMapping } from '../types';

export const CHORD_REGISTRY: Record<string, ChordDefinition> = {
  'c-major': {
    id: 'c-major',
    name: 'C Major',
    shortName: 'C',
    root: 'C',
    quality: 'major',
    frets: [-1, 3, 2, 0, 1, 0],
    strings: ['x', 'C3', 'E3', 'G3', 'C4', 'E4'],
    description: 'Bright and open, fundamental major chord with root on 5th string.',
    defaultGestureFingerCount: 1,
    audioAssets: {
      down: '/audio/chords/c-major-down.wav',
      up: '/audio/chords/c-major-up.wav',
    },
  },
  'g-major': {
    id: 'g-major',
    name: 'G Major',
    shortName: 'G',
    root: 'G',
    quality: 'major',
    frets: [3, 2, 0, 0, 0, 3],
    strings: ['G2', 'B2', 'D3', 'G3', 'B3', 'G4'],
    description: 'Resonant, powerful full six-string acoustic guitar voicing.',
    defaultGestureFingerCount: 2,
    audioAssets: {
      down: '/audio/chords/g-major-down.wav',
      up: '/audio/chords/g-major-up.wav',
    },
  },
  'd-major': {
    id: 'd-major',
    name: 'D Major',
    shortName: 'D',
    root: 'D',
    quality: 'major',
    frets: [-1, -1, 0, 2, 3, 2],
    strings: ['x', 'x', 'D3', 'A3', 'D4', 'F#4'],
    description: 'Crisp and chimey voicing with open D string bass root.',
    defaultGestureFingerCount: 3,
    audioAssets: {
      down: '/audio/chords/d-major-down.wav',
      up: '/audio/chords/d-major-up.wav',
    },
  },
  'e-minor': {
    id: 'e-minor',
    name: 'E Minor',
    shortName: 'Em',
    root: 'E',
    quality: 'minor',
    frets: [0, 2, 2, 0, 0, 0],
    strings: ['E2', 'B2', 'E3', 'G3', 'B3', 'E4'],
    description: 'Deep, melancholic open minor chord with low 6th-string root.',
    defaultGestureFingerCount: 4,
    audioAssets: {
      down: '/audio/chords/e-minor-down.wav',
      up: '/audio/chords/e-minor-up.wav',
    },
  },
  'a-minor': {
    id: 'a-minor',
    name: 'A Minor',
    shortName: 'Am',
    root: 'A',
    quality: 'minor',
    frets: [-1, 0, 2, 2, 1, 0],
    strings: ['x', 'A2', 'E3', 'A3', 'C4', 'E4'],
    description: 'Warm, emotional minor voicing with open A string bass.',
    defaultGestureFingerCount: 5,
    audioAssets: {
      down: '/audio/chords/a-minor-down.wav',
      up: '/audio/chords/a-minor-up.wav',
    },
  },
};

export const DEFAULT_CHORD_MAPPINGS: ChordMapping[] = [
  { gestureFingerCount: 1, chordId: 'c-major' },
  { gestureFingerCount: 2, chordId: 'g-major' },
  { gestureFingerCount: 3, chordId: 'd-major' },
  { gestureFingerCount: 4, chordId: 'e-minor' },
  { gestureFingerCount: 5, chordId: 'a-minor' },
];

export function getChordById(id: string): ChordDefinition {
  const chord = CHORD_REGISTRY[id];
  if (!chord) {
    return CHORD_REGISTRY['c-major'];
  }
  return chord;
}

export function getChordForFingerCount(count: number, mappings: ChordMapping[]): ChordDefinition | null {
  const mapping = mappings.find((m) => m.gestureFingerCount === count);
  if (!mapping) return null;
  return getChordById(mapping.chordId);
}
