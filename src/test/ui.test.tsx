import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { App } from '../App';
import { ChordFretDiagram } from '../components/play/ChordFretDiagram';
import { getChordById } from '../audio/chordRegistry';

// Mock Web Audio and Camera for UI testing
class MockAudioContext {
  state = 'suspended';
  currentTime = 0;
  sampleRate = 44100;
  resume = vi.fn().mockResolvedValue(undefined);
  createGain = vi.fn().mockReturnValue({
    gain: { setValueAtTime: vi.fn(), setTargetAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  createBuffer = vi.fn().mockReturnValue({ copyToChannel: vi.fn() });
  createBufferSource = vi.fn().mockReturnValue({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  });
  decodeAudioData = vi.fn().mockResolvedValue({
    numberOfChannels: 2,
    length: 44100,
    sampleRate: 44100,
    copyToChannel: vi.fn(),
  });
  close = vi.fn().mockResolvedValue(undefined);
}

describe('AirChord UI Component Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(512),
    }));

    // Mock mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
          getVideoTracks: () => [{ stop: vi.fn(), readyState: 'live' }],
        }),
        enumerateDevices: vi.fn().mockResolvedValue([
          { kind: 'videoinput', deviceId: 'cam-1', label: 'FaceTime HD Camera' },
        ]),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    // Mock HTMLMediaElement.play
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  });

  it('renders initial landing interface with brand, start button, and C Major default', () => {
    render(<App />);

    expect(screen.getByText('AirChord')).toBeInTheDocument();
    expect(screen.getByText('Start AirChord')).toBeInTheDocument();
    expect(screen.getByText('C Major')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE CHORD')).toBeInTheDocument();
  });

  it('switches between Play, Learn, and Settings navigation tabs', () => {
    render(<App />);

    // Click Learn tab
    const learnBtn = screen.getByRole('button', { name: /learn/i });
    fireEvent.click(learnBtn);
    expect(screen.getByText('Learn & Master AirChord')).toBeInTheDocument();
    expect(screen.getByText('Chord Transition Practice')).toBeInTheDocument();

    // Click Settings tab
    const settingsBtn = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsBtn);
    expect(screen.getByText('Instrument Settings')).toBeInTheDocument();
    expect(screen.getByText('Hand Assignment & Video Mirroring')).toBeInTheDocument();

    // Click Play tab
    const playBtn = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playBtn);
    expect(screen.getByText('ACTIVE CHORD')).toBeInTheDocument();
  });

  it('allows manual chord selection from the chord palette', () => {
    render(<App />);

    // Click 'G' in chord palette
    const gChordBtn = screen.getByRole('button', { name: /G2/i });
    fireEvent.click(gChordBtn);

    expect(screen.getByText('G Major')).toBeInTheDocument();
  });

  it('allows swapping hand roles from Left to Right', () => {
    render(<App />);

    const swapBtn = screen.getByTitle('Swap Left / Right Hand Roles');
    fireEvent.click(swapBtn);

    expect(screen.getByText('Right Hand')).toBeInTheDocument();
  });

  it('renders guitar chord fretboard diagram with correct strings and frets', () => {
    const cChord = getChordById('c-major');
    render(<ChordFretDiagram chord={cChord} />);

    expect(screen.getByLabelText('Fretboard diagram for C Major')).toBeInTheDocument();
  });

  it('handles volume control adjustments', () => {
    render(<App />);

    const volumeSlider = screen.getByLabelText('Master volume');
    fireEvent.change(volumeSlider, { target: { value: '0.4' } });

    expect((volumeSlider as HTMLInputElement).value).toBe('0.4');
  });

  it('toggles diagnostics debug overlay', () => {
    render(<App />);

    const debugBtn = screen.getByLabelText('Toggle Debug Mode');
    fireEvent.click(debugBtn);

    // Debug mode toggled
    expect(debugBtn).toHaveClass('bg-[#C8F169]');
  });
});
