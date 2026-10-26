import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AudioEngine } from '../audio/AudioEngine';
import { GuitarSampler } from '../audio/GuitarSampler';
import type { StrumEvent } from '../types';

// Mock Web Audio API classes for Node / JSDOM test environment
class MockGainNode {
  gain = {
    value: 1,
    setValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
  };
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAudioBufferSourceNode {
  buffer: any = null;
  onended: (() => void) | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockAudioBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  private channelData: Float32Array[];

  constructor(options: { numberOfChannels: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels;
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.channelData = Array.from({ length: options.numberOfChannels }, () => new Float32Array(options.length));
  }

  copyToChannel(source: Float32Array, channelNumber: number): void {
    this.channelData[channelNumber]?.set(source);
  }

  getChannelData(channel: number): Float32Array {
    return this.channelData[channel];
  }
}

class MockAudioContext {
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  currentTime = 10;
  sampleRate = 44100;
  destination = {};

  resume = vi.fn().mockImplementation(async () => {
    this.state = 'running';
  });

  createGain = vi.fn().mockImplementation(() => new MockGainNode());
  createBufferSource = vi.fn().mockImplementation(() => new MockAudioBufferSourceNode());
  createBuffer = vi.fn().mockImplementation((channels, length, rate) => {
    return new MockAudioBuffer({ numberOfChannels: channels, length, sampleRate: rate });
  });

  decodeAudioData = vi.fn().mockImplementation(async () => {
    return new MockAudioBuffer({ numberOfChannels: 2, length: 44100, sampleRate: 44100 });
  });

  close = vi.fn().mockImplementation(async () => {
    this.state = 'closed';
  });
}

describe('AudioEngine & GuitarSampler', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(1024),
    }));
  });

  it('initializes audio and resumes suspended AudioContext', async () => {
    const statusChanges: any[] = [];
    const engine = new AudioEngine((status) => statusChanges.push(status));

    expect(engine.getStatus().initialized).toBe(false);

    const ok = await engine.initAudio();
    expect(ok).toBe(true);
    expect(engine.getStatus().initialized).toBe(true);
    expect(engine.getStatus().error).toBeNull();
  });

  it('manages master volume with clamping between 0 and 1', async () => {
    const engine = new AudioEngine();
    await engine.initAudio();

    engine.setVolume(0.5);
    expect(engine.getVolume()).toBe(0.5);

    // Over maximum
    engine.setVolume(1.8);
    expect(engine.getVolume()).toBe(1.0);

    // Below minimum
    engine.setVolume(-0.2);
    expect(engine.getVolume()).toBe(0.0);
  });

  it('loads audio samples from manifest/assets and populates buffer cache', async () => {
    const engine = new AudioEngine();
    await engine.initAudio();

    expect(engine.getStatus().samplesLoadedCount).toBe(10);
  });

  it('plays chord on verified strum event via GuitarSampler', async () => {
    const engine = new AudioEngine();
    await engine.initAudio();
    const sampler = new GuitarSampler(engine);

    const event: StrumEvent = {
      id: 'strum-test-1',
      direction: 'down',
      timestamp: 1000,
      speed: 1.2,
      displacement: 0.08,
      confidence: 0.9,
      chordId: 'c-major',
    };

    const played = sampler.triggerStrum(event);
    expect(played).toBe(true);
  });

  it('falls back to alternate direction or synthesis if requested direction buffer missing', async () => {
    const engine = new AudioEngine();
    await engine.initAudio();

    const upEvent: StrumEvent = {
      id: 'strum-up-test',
      direction: 'up',
      timestamp: 1200,
      speed: 1.0,
      displacement: 0.06,
      confidence: 0.8,
      chordId: 'g-major',
    };

    const played = engine.playStrum(upEvent);
    expect(played).toBe(true);
  });

  it('stops all active voices and disposes audio context cleanly', async () => {
    const engine = new AudioEngine();
    await engine.initAudio();

    const event: StrumEvent = {
      id: 'strum-test-stop',
      direction: 'down',
      timestamp: 1500,
      speed: 1.0,
      displacement: 0.06,
      confidence: 0.8,
      chordId: 'd-major',
    };
    engine.playStrum(event);

    engine.stopAllVoices();
    await engine.dispose();

    expect(engine.getStatus().initialized).toBe(false);
  });
});
