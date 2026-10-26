/**
 * AirChord strongly typed domain contracts
 */

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export type Handedness = 'Left' | 'Right';

export interface TrackedHand {
  landmarks: HandLandmark[];
  handedness: Handedness;
  score: number;
}

export type InstrumentRole = 'chord' | 'strum';

export interface HandAssignment {
  chordHand: TrackedHand | null;
  strumHand: TrackedHand | null;
  chordRoleHandedness: Handedness;
  strumRoleHandedness: Handedness;
  isAmbiguous: boolean;
}

export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

export interface FingerState {
  extended: boolean;
  confidence: number;
  tipDistance: number;
}

export type FingerStates = Record<FingerName, FingerState>;

export interface GestureResult {
  fingerCount: number;
  fingerStates: FingerStates;
  confidence: number;
  matchedGestureId: string | null;
  rawFingerCount: number;
  isStable: boolean;
}

export interface ChordDefinition {
  id: string;
  name: string;
  shortName: string;
  root: string;
  quality: 'major' | 'minor';
  frets: number[]; // 6 strings from low E to high E, -1 = muted, 0 = open
  strings: string[]; // e.g. ['x', 'C3', 'E3', 'G3', 'C4', 'E4']
  description: string;
  defaultGestureFingerCount: number;
  audioAssets: {
    down: string;
    up: string;
  };
}

export interface ChordMapping {
  gestureFingerCount: number;
  chordId: string;
}

export type StrumDirection = 'down' | 'up';

export interface StrumEvent {
  id: string;
  direction: StrumDirection;
  timestamp: number;
  speed: number; // normalized units / sec
  displacement: number; // normalized vertical units
  confidence: number;
  chordId: string;
}

export type CameraStatus =
  | 'idle'
  | 'requesting-permission'
  | 'initializing'
  | 'ready'
  | 'tracking'
  | 'camera-error'
  | 'stopped';

export interface TrackingStatus {
  handsDetected: number;
  chordHandPresent: boolean;
  strumHandPresent: boolean;
  trackingLostWarning: boolean;
  fps: number;
}

export interface AudioStatus {
  initialized: boolean;
  loading: boolean;
  samplesLoadedCount: number;
  totalSamplesCount: number;
  error: string | null;
}

export interface InstrumentSettings {
  chordHand: Handedness;
  strumHand: Handedness;
  mirrorVideo: boolean;
  strumSensitivity: number; // 0.1 to 1.0 (default 0.5)
  minStrumSpeed: number; // normalized units / sec
  minStrumDisplacement: number; // normalized units
  strumCooldownMs: number; // ms between strums (default 120ms)
  gestureStabilityMs: number; // ms to hold gesture (default 140ms)
  landmarkSmoothingAlpha: number; // EMA alpha 0.0 - 1.0 (default 0.65)
  trackingLossGraceMs: number; // ms before clearing chord on hand loss (default 800ms)
  masterVolume: number; // 0.0 to 1.0 (default 0.8)
  selectedCameraId: string;
  chordMappings: ChordMapping[];
  debugMode: boolean;
}
