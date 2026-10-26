import type { AudioStatus, StrumDirection, StrumEvent } from '../types';
import { CHORD_REGISTRY } from './chordRegistry';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sampleBuffers: Map<string, AudioBuffer> = new Map();
  private activeVoices: Set<{ source: AudioBufferSourceNode; gain: GainNode }> = new Set();
  private maxPolyphony = 16;
  private currentVolume = 0.8;
  private status: AudioStatus = {
    initialized: false,
    loading: false,
    samplesLoadedCount: 0,
    totalSamplesCount: 10,
    error: null,
  };
  private onStatusChange?: (status: AudioStatus) => void;

  constructor(onStatusChange?: (status: AudioStatus) => void) {
    this.onStatusChange = onStatusChange;
  }

  public getStatus(): AudioStatus {
    return { ...this.status };
  }

  private updateStatus(partial: Partial<AudioStatus>): void {
    this.status = { ...this.status, ...partial };
    this.onStatusChange?.(this.getStatus());
  }

  /**
   * Initializes or unlocks the AudioContext upon user gesture.
   */
  public async initAudio(): Promise<boolean> {
    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error('Web Audio API is not supported in this browser.');
        }
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.currentVolume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.updateStatus({ initialized: true, error: null });

      // Start preloading samples if not already loaded
      if (this.sampleBuffers.size < this.status.totalSamplesCount && !this.status.loading) {
        await this.loadAllSamples();
      }

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to initialize audio engine';
      this.updateStatus({ error: message, initialized: false });
      return false;
    }
  }

  /**
   * Loads all audio samples from manifest / assets.
   */
  public async loadAllSamples(): Promise<void> {
    if (!this.ctx) return;

    this.updateStatus({ loading: true, error: null });
    const chords = Object.values(CHORD_REGISTRY);
    const directions: StrumDirection[] = ['down', 'up'];
    let loadedCount = 0;

    for (const chord of chords) {
      for (const dir of directions) {
        const key = `${chord.id}-${dir}`;
        if (this.sampleBuffers.has(key)) {
          loadedCount++;
          continue;
        }

        const url = chord.audioAssets[dir];
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status} fetching ${url}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
          this.sampleBuffers.set(key, audioBuffer);
          loadedCount++;
          this.updateStatus({ samplesLoadedCount: loadedCount });
        } catch {
          // If network / fetch / decode fails, generate synthetic high-quality fallback buffer
          try {
            const fallbackBuffer = this.generateSyntheticChordBuffer(chord.frets, dir);
            this.sampleBuffers.set(key, fallbackBuffer);
            loadedCount++;
            this.updateStatus({ samplesLoadedCount: loadedCount });
          } catch {
            // Log and continue
          }
        }
      }
    }

    this.updateStatus({
      loading: false,
      samplesLoadedCount: loadedCount,
      error: loadedCount === 0 ? 'Failed to load or synthesize guitar chord samples' : null,
    });
  }

  /**
   * Sets master volume with anti-pop parameter smoothing.
   */
  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.currentVolume = clamped;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.015);
    }
  }

  public getVolume(): number {
    return this.currentVolume;
  }

  /**
   * Plays a chord for a verified strum event.
   */
  public playStrum(event: StrumEvent): boolean {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') {
      return false;
    }

    const key = `${event.chordId}-${event.direction}`;
    let buffer = this.sampleBuffers.get(key);

    // If direction specific is missing, try alternate direction
    if (!buffer) {
      const altDir: StrumDirection = event.direction === 'down' ? 'up' : 'down';
      buffer = this.sampleBuffers.get(`${event.chordId}-${altDir}`);
    }

    // If still missing, generate buffer dynamically
    if (!buffer) {
      const chord = CHORD_REGISTRY[event.chordId];
      if (chord) {
        buffer = this.generateSyntheticChordBuffer(chord.frets, event.direction);
        this.sampleBuffers.set(key, buffer);
      }
    }

    if (!buffer) return false;

    // Manage polyphony: if too many voices, gently fade the oldest
    if (this.activeVoices.size >= this.maxPolyphony) {
      const oldest = this.activeVoices.values().next().value;
      if (oldest) {
        try {
          oldest.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
          oldest.source.stop(this.ctx.currentTime + 0.05);
        } catch {
          // Ignore if already stopped
        }
        this.activeVoices.delete(oldest);
      }
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    // Velocity-sensitive playback volume
    // Speed is normalized (typically 0.4 to 3.0). Map speed to dynamics: 0.75 - 1.15
    const velocityGain = Math.min(1.2, Math.max(0.65, 0.7 + event.speed * 0.25));

    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(velocityGain, this.ctx.currentTime);

    source.connect(voiceGain);
    voiceGain.connect(this.masterGain);

    const voice = { source, gain: voiceGain };
    this.activeVoices.add(voice);

    source.onended = () => {
      this.activeVoices.delete(voice);
      try {
        source.disconnect();
        voiceGain.disconnect();
      } catch {
        // Disconnect cleanup
      }
    };

    source.start(this.ctx.currentTime);
    return true;
  }

  /**
   * Silences all active voices smoothly and stops audio output.
   */
  public stopAllVoices(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const voice of this.activeVoices) {
      try {
        voice.gain.gain.setTargetAtTime(0, now, 0.02);
        voice.source.stop(now + 0.05);
      } catch {
        // Voice might already be stopping
      }
    }
    this.activeVoices.clear();
  }

  /**
   * Shuts down the audio context and releases resources.
   */
  public async dispose(): Promise<void> {
    this.stopAllVoices();
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        await this.ctx.close();
      } catch {
        // AudioContext close error
      }
    }
    this.ctx = null;
    this.masterGain = null;
    this.sampleBuffers.clear();
    this.updateStatus({ initialized: false, loading: false });
  }

  /**
   * In-memory Karplus-Strong string synthesis fallback
   */
  private generateSyntheticChordBuffer(frets: number[], direction: StrumDirection): AudioBuffer {
    const sampleRate = this.ctx ? this.ctx.sampleRate : 44100;
    const duration = 2.5;
    const totalSamples = Math.floor(sampleRate * duration);

    const baseFrequencies = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];
    const played: { freq: number; pan: number; stringIdx: number }[] = [];

    for (let s = 0; s < 6; s++) {
      const fret = frets[s];
      if (fret >= 0) {
        played.push({
          stringIdx: s,
          freq: baseFrequencies[s] * Math.pow(2, fret / 12),
          pan: ((s - 2.5) / 3.0) * 0.35,
        });
      }
    }

    const order = direction === 'down' ? played : [...played].reverse();
    const leftData = new Float32Array(totalSamples);
    const rightData = new Float32Array(totalSamples);
    const delayPerString = Math.floor(sampleRate * 0.016);

    order.forEach((str, idx) => {
      const start = idx * delayPerString;
      if (start >= totalSamples) return;

      const period = Math.max(2, Math.round(sampleRate / str.freq));
      const ringBuffer = new Float32Array(period);

      for (let i = 0; i < period; i++) {
        ringBuffer[i] = (Math.random() * 2 - 1) * Math.exp(-2.5 * (i / period));
      }

      let bufIdx = 0;
      let prev = 0;
      const decay = 0.993 + (str.stringIdx < 3 ? 0.003 : 0.001);
      const panL = 0.5 * (1 - str.pan);
      const panR = 0.5 * (1 + str.pan);

      for (let i = start; i < totalSamples; i++) {
        const cur = ringBuffer[bufIdx];
        leftData[i] += cur * panL;
        rightData[i] += cur * panR;

        const filtered = 0.5 * (cur + prev) * decay;
        ringBuffer[bufIdx] = filtered;
        prev = cur;
        bufIdx = (bufIdx + 1) % period;
      }
    });

    // Normalize
    let max = 0;
    for (let i = 0; i < totalSamples; i++) {
      const absL = Math.abs(leftData[i]);
      const absR = Math.abs(rightData[i]);
      if (absL > max) max = absL;
      if (absR > max) max = absR;
    }
    if (max > 0) {
      const scale = 0.85 / max;
      for (let i = 0; i < totalSamples; i++) {
        leftData[i] *= scale;
        rightData[i] *= scale;
      }
    }

    const audioBuf = this.ctx!.createBuffer(2, totalSamples, sampleRate);
    audioBuf.copyToChannel(leftData, 0);
    audioBuf.copyToChannel(rightData, 1);
    return audioBuf;
  }
}
