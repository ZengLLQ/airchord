import type { StrumEvent } from '../types';
import { AudioEngine } from './AudioEngine';
import { CHORD_REGISTRY } from './chordRegistry';

export class GuitarSampler {
  private audioEngine: AudioEngine;

  constructor(audioEngine: AudioEngine) {
    this.audioEngine = audioEngine;
  }

  public triggerStrum(event: StrumEvent): boolean {
    const chord = CHORD_REGISTRY[event.chordId];
    if (!chord) {
      console.warn(`GuitarSampler: Unknown chordId ${event.chordId}`);
      return false;
    }
    return this.audioEngine.playStrum(event);
  }

  public preload(): Promise<void> {
    return this.audioEngine.loadAllSamples();
  }
}
