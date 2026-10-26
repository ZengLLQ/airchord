import { DEFAULT_CHORD_MAPPINGS } from '../audio/chordRegistry';
import type { Handedness, InstrumentSettings } from '../types';

const STORAGE_KEY = 'airchord_user_settings_v1';

export const DEFAULT_SETTINGS: InstrumentSettings = {
  chordHand: 'Left',
  strumHand: 'Right',
  mirrorVideo: true,
  strumSensitivity: 0.5,
  minStrumSpeed: 0.75,
  minStrumDisplacement: 0.04,
  strumCooldownMs: 120,
  gestureStabilityMs: 140,
  landmarkSmoothingAlpha: 0.65,
  trackingLossGraceMs: 800,
  masterVolume: 0.8,
  selectedCameraId: '',
  chordMappings: [...DEFAULT_CHORD_MAPPINGS],
  debugMode: false,
};

export function loadSettings(): InstrumentSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_SETTINGS };

    const chordHand: Handedness = parsed.chordHand === 'Right' ? 'Right' : 'Left';
    let strumHand: Handedness = parsed.strumHand === 'Left' ? 'Left' : 'Right';
    if (chordHand === strumHand) {
      strumHand = chordHand === 'Left' ? 'Right' : 'Left';
    }

    return {
      chordHand,
      strumHand,
      mirrorVideo: typeof parsed.mirrorVideo === 'boolean' ? parsed.mirrorVideo : DEFAULT_SETTINGS.mirrorVideo,
      strumSensitivity:
        typeof parsed.strumSensitivity === 'number'
          ? Math.max(0.1, Math.min(1.0, parsed.strumSensitivity))
          : DEFAULT_SETTINGS.strumSensitivity,
      minStrumSpeed:
        typeof parsed.minStrumSpeed === 'number'
          ? Math.max(0.2, Math.min(2.5, parsed.minStrumSpeed))
          : DEFAULT_SETTINGS.minStrumSpeed,
      minStrumDisplacement:
        typeof parsed.minStrumDisplacement === 'number'
          ? Math.max(0.01, Math.min(0.2, parsed.minStrumDisplacement))
          : DEFAULT_SETTINGS.minStrumDisplacement,
      strumCooldownMs:
        typeof parsed.strumCooldownMs === 'number'
          ? Math.max(50, Math.min(500, parsed.strumCooldownMs))
          : DEFAULT_SETTINGS.strumCooldownMs,
      gestureStabilityMs:
        typeof parsed.gestureStabilityMs === 'number'
          ? Math.max(50, Math.min(400, parsed.gestureStabilityMs))
          : DEFAULT_SETTINGS.gestureStabilityMs,
      landmarkSmoothingAlpha:
        typeof parsed.landmarkSmoothingAlpha === 'number'
          ? Math.max(0.1, Math.min(1.0, parsed.landmarkSmoothingAlpha))
          : DEFAULT_SETTINGS.landmarkSmoothingAlpha,
      trackingLossGraceMs:
        typeof parsed.trackingLossGraceMs === 'number'
          ? Math.max(100, Math.min(3000, parsed.trackingLossGraceMs))
          : DEFAULT_SETTINGS.trackingLossGraceMs,
      masterVolume:
        typeof parsed.masterVolume === 'number'
          ? Math.max(0, Math.min(1.0, parsed.masterVolume))
          : DEFAULT_SETTINGS.masterVolume,
      selectedCameraId: typeof parsed.selectedCameraId === 'string' ? parsed.selectedCameraId : '',
      chordMappings: Array.isArray(parsed.chordMappings) && parsed.chordMappings.length > 0
        ? parsed.chordMappings
        : [...DEFAULT_CHORD_MAPPINGS],
      debugMode: Boolean(parsed.debugMode),
    };
  } catch (err) {
    console.warn('Failed to load settings from localStorage, using defaults', err);
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: InstrumentSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to save settings to localStorage', err);
  }
}

export function resetSettings(): InstrumentSettings {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore error
  }
  return { ...DEFAULT_SETTINGS };
}
