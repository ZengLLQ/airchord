import { describe, expect, it, beforeEach } from 'vitest';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  resetSettings,
  saveSettings,
} from '../storage/settingsStorage';

describe('settingsStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default settings when localStorage is empty', () => {
    const settings = loadSettings();
    expect(settings.chordHand).toBe('Left');
    expect(settings.strumHand).toBe('Right');
    expect(settings.mirrorVideo).toBe(true);
    expect(settings.masterVolume).toBe(0.8);
    expect(settings.chordMappings).toHaveLength(5);
  });

  it('persists and retrieves modified settings', () => {
    const current = loadSettings();
    current.chordHand = 'Right';
    current.strumHand = 'Left';
    current.masterVolume = 0.65;
    current.strumCooldownMs = 180;

    saveSettings(current);

    const reloaded = loadSettings();
    expect(reloaded.chordHand).toBe('Right');
    expect(reloaded.strumHand).toBe('Left');
    expect(reloaded.masterVolume).toBe(0.65);
    expect(reloaded.strumCooldownMs).toBe(180);
  });

  it('handles corrupted JSON in localStorage gracefully without throwing', () => {
    localStorage.setItem('airchord_user_settings_v1', '{ invalid json ...');
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('clamps numerical values out of bounds', () => {
    const badData = {
      masterVolume: 99.0, // Should clamp to 1.0
      minStrumSpeed: 0.001, // Should clamp to min 0.2
      strumCooldownMs: 10, // Should clamp to min 50
    };
    localStorage.setItem('airchord_user_settings_v1', JSON.stringify(badData));

    const settings = loadSettings();
    expect(settings.masterVolume).toBe(1.0);
    expect(settings.minStrumSpeed).toBe(0.2);
    expect(settings.strumCooldownMs).toBe(50);
  });

  it('clears localStorage and restores defaults on resetSettings', () => {
    saveSettings({ ...DEFAULT_SETTINGS, masterVolume: 0.1 });
    expect(loadSettings().masterVolume).toBe(0.1);

    const restored = resetSettings();
    expect(restored.masterVolume).toBe(0.8);
    expect(localStorage.getItem('airchord_user_settings_v1')).toBeNull();
  });
});
