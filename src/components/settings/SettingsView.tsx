import { useEffect, useState } from 'react';
import {
  Camera,
  Check,
  Hand,
  RotateCcw,
  Sliders,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { CHORD_REGISTRY } from '../../audio/chordRegistry';
import { CameraService } from '../../camera/CameraService';
import type { AudioStatus, InstrumentSettings, StrumDirection } from '../../types';

interface SettingsViewProps {
  settings: InstrumentSettings;
  audioStatus: AudioStatus;
  onUpdateSettings: (partial: Partial<InstrumentSettings>) => void;
  onResetSettings: () => void;
  onAuditionChord: (chordId: string, dir: StrumDirection) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  audioStatus,
  onUpdateSettings,
  onResetSettings,
  onAuditionChord,
}) => {
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    let mounted = true;
    const service = new CameraService();
    service.getAvailableCameras().then((devices) => {
      if (mounted) {
        setAvailableCameras(devices);
      }
    });
    return () => {
      mounted = false;
      service.dispose();
    };
  }, []);

  useEffect(() => {
    if (!savedBanner) return;
    const timer = setTimeout(() => setSavedBanner(false), 2000);
    return () => clearTimeout(timer);
  }, [savedBanner]);

  const handleSaveNotice = () => {
    setSavedBanner(true);
  };

  const handleMappingChange = (fingerCount: number, newChordId: string) => {
    const existing = settings.chordMappings.find((m) => m.chordId === newChordId);
    let updated;
    if (existing && existing.gestureFingerCount !== fingerCount) {
      const oldChordId =
        settings.chordMappings.find((m) => m.gestureFingerCount === fingerCount)?.chordId ||
        'c-major';
      updated = settings.chordMappings.map((m) => {
        if (m.gestureFingerCount === fingerCount) return { ...m, chordId: newChordId };
        if (m.gestureFingerCount === existing.gestureFingerCount)
          return { ...m, chordId: oldChordId };
        return m;
      });
    } else {
      updated = settings.chordMappings.map((m) =>
        m.gestureFingerCount === fingerCount ? { ...m, chordId: newChordId } : m
      );
    }
    onUpdateSettings({ chordMappings: updated });
    handleSaveNotice();
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-4xl mx-auto w-full gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#F5F6F7]">Instrument Settings</h1>
          <p className="text-sm text-[#9299A3] mt-1">
            Configure gesture mappings, computer vision sensitivity, and audio output preferences.
          </p>
        </div>

        {savedBanner && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C8F169]/10 border border-[#C8F169] text-[#C8F169] text-xs font-mono animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>Saved</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Section 1: Hand Roles & Camera Mirroring */}
        <div className="bg-[#14171B] border border-[#292E35] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 font-bold text-base text-[#F5F6F7]">
            <Hand className="w-4 h-4 text-[#C8F169]" />
            <span>Hand Assignment & Video Mirroring</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chord Hand Choice */}
            <div className="bg-[#1B1F24] p-4 rounded-xl border border-[#292E35] space-y-2">
              <label className="text-xs font-mono text-[#9299A3]">CHORD SELECTION HAND</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({ chordHand: 'Left', strumHand: 'Right' });
                    handleSaveNotice();
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                    settings.chordHand === 'Left'
                      ? 'bg-[#C8F169] text-[#0B0D0F] border-[#C8F169]'
                      : 'bg-[#14171B] text-[#9299A3] border-[#292E35] hover:text-[#F5F6F7]'
                  }`}
                >
                  Left Hand (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({ chordHand: 'Right', strumHand: 'Left' });
                    handleSaveNotice();
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                    settings.chordHand === 'Right'
                      ? 'bg-[#C8F169] text-[#0B0D0F] border-[#C8F169]'
                      : 'bg-[#14171B] text-[#9299A3] border-[#292E35] hover:text-[#F5F6F7]'
                  }`}
                >
                  Right Hand (Left-Handed)
                </button>
              </div>
              <p className="text-[11px] text-[#9299A3]">
                Default is Left Hand selects chords while Right Hand strums.
              </p>
            </div>

            {/* Video Mirroring */}
            <div className="bg-[#1B1F24] p-4 rounded-xl border border-[#292E35] space-y-2">
              <label className="text-xs font-mono text-[#9299A3]">WEBCAM PREVIEW MIRROR</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({ mirrorVideo: true });
                    handleSaveNotice();
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                    settings.mirrorVideo
                      ? 'bg-[#C8F169] text-[#0B0D0F] border-[#C8F169]'
                      : 'bg-[#14171B] text-[#9299A3] border-[#292E35] hover:text-[#F5F6F7]'
                  }`}
                >
                  Mirrored (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({ mirrorVideo: false });
                    handleSaveNotice();
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                    !settings.mirrorVideo
                      ? 'bg-[#C8F169] text-[#0B0D0F] border-[#C8F169]'
                      : 'bg-[#14171B] text-[#9299A3] border-[#292E35] hover:text-[#F5F6F7]'
                  }`}
                >
                  Natural / Unmirrored
                </button>
              </div>
              <p className="text-[11px] text-[#9299A3]">
                Mirrored acts like looking in a mirror. AirChord adjusts coordinates automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Chord Gesture Mappings */}
        <div className="bg-[#14171B] border border-[#292E35] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 font-bold text-base text-[#F5F6F7]">
            <Zap className="w-4 h-4 text-[#C8F169]" />
            <span>Finger Gesture to Chord Mappings</span>
          </div>

          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((fingers) => {
              const currentMapping = settings.chordMappings.find(
                (m) => m.gestureFingerCount === fingers
              );
              const selectedChordId = currentMapping?.chordId ?? 'c-major';

              return (
                <div
                  key={`gesture-map-${fingers}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#1B1F24] border border-[#292E35]"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-[#14171B] border border-[#292E35] flex items-center justify-center font-mono font-bold text-xs text-[#C8F169]">
                      {fingers}
                    </span>
                    <span className="text-sm font-semibold text-[#F5F6F7]">
                      {fingers} Finger{fingers > 1 ? 's' : ''} Gesture
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedChordId}
                      onChange={(e) => handleMappingChange(fingers, e.target.value)}
                      className="bg-[#14171B] border border-[#292E35] rounded-lg px-3 py-1.5 text-xs text-[#F5F6F7] focus:outline-none focus:border-[#C8F169]"
                    >
                      {Object.values(CHORD_REGISTRY).map((chord) => (
                        <option key={chord.id} value={chord.id}>
                          {chord.name} ({chord.shortName})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => onAuditionChord(selectedChordId, 'down')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#14171B] border border-[#292E35] text-xs text-[#9299A3] hover:text-[#C8F169] transition-colors"
                      title="Audition mapped chord"
                    >
                      Audition
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Vision & Strumming Sensitivity */}
        <div className="bg-[#14171B] border border-[#292E35] rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 font-bold text-base text-[#F5F6F7]">
            <Sliders className="w-4 h-4 text-[#C8F169]" />
            <span>Tracking Sensitivity & Motion Tuning</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall Tracking Sensitivity */}
            <div className="space-y-2 md:col-span-2 bg-[#1B1F24] p-4 rounded-xl border border-[#292E35]">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#9299A3]">OVERALL TRACKING SENSITIVITY</span>
                <span className="text-[#C8F169]">{Math.round(settings.strumSensitivity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={settings.strumSensitivity}
                onChange={(e) => {
                  onUpdateSettings({ strumSensitivity: parseFloat(e.target.value) });
                  handleSaveNotice();
                }}
                className="w-full h-1.5 bg-[#292E35] accent-[#C8F169] rounded cursor-pointer"
                aria-label="Overall tracking sensitivity"
              />
              <p className="text-[11px] text-[#9299A3]">
                Scales speed and displacement thresholds dynamically. Higher sensitivity enables effortless strumming on subtle hand gestures.
              </p>
            </div>

            {/* Min Strum Velocity */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#9299A3]">MIN STRUM VELOCITY</span>
                <span className="text-[#C8F169]">{settings.minStrumSpeed.toFixed(2)} units/s</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="1.8"
                step="0.05"
                value={settings.minStrumSpeed}
                onChange={(e) => {
                  onUpdateSettings({ minStrumSpeed: parseFloat(e.target.value) });
                  handleSaveNotice();
                }}
                className="w-full h-1.5 bg-[#292E35] accent-[#C8F169] rounded cursor-pointer"
              />
              <p className="text-[11px] text-[#9299A3]">
                Lower values require lighter hand movement; higher values require more forceful strokes.
              </p>
            </div>

            {/* Min Displacement */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#9299A3]">MIN DISPLACEMENT</span>
                <span className="text-[#C8F169]">{(settings.minStrumDisplacement * 100).toFixed(0)}% screen</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.12"
                step="0.01"
                value={settings.minStrumDisplacement}
                onChange={(e) => {
                  onUpdateSettings({ minStrumDisplacement: parseFloat(e.target.value) });
                  handleSaveNotice();
                }}
                className="w-full h-1.5 bg-[#292E35] accent-[#C8F169] rounded cursor-pointer"
              />
              <p className="text-[11px] text-[#9299A3]">
                Vertical travel distance required to accept a stroke. Prevents hand jitter.
              </p>
            </div>

            {/* Strum Cooldown */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#9299A3]">STRUM COOLDOWN</span>
                <span className="text-[#C8F169]">{settings.strumCooldownMs} ms</span>
              </div>
              <input
                type="range"
                min="80"
                max="300"
                step="10"
                value={settings.strumCooldownMs}
                onChange={(e) => {
                  onUpdateSettings({ strumCooldownMs: parseInt(e.target.value) });
                  handleSaveNotice();
                }}
                className="w-full h-1.5 bg-[#292E35] accent-[#C8F169] rounded cursor-pointer"
              />
              <p className="text-[11px] text-[#9299A3]">
                Time window after each strum to prevent double triggering.
              </p>
            </div>

            {/* Gesture Stability Window */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#9299A3]">GESTURE STABILITY TIME</span>
                <span className="text-[#C8F169]">{settings.gestureStabilityMs} ms</span>
              </div>
              <input
                type="range"
                min="80"
                max="300"
                step="10"
                value={settings.gestureStabilityMs}
                onChange={(e) => {
                  onUpdateSettings({ gestureStabilityMs: parseInt(e.target.value) });
                  handleSaveNotice();
                }}
                className="w-full h-1.5 bg-[#292E35] accent-[#C8F169] rounded cursor-pointer"
              />
              <p className="text-[11px] text-[#9299A3]">
                Hysteresis duration to confirm new chord. Avoids flickering between chord frames.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Camera & Audio Status */}
        <div className="bg-[#14171B] border border-[#292E35] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 font-bold text-base text-[#F5F6F7]">
            <Camera className="w-4 h-4 text-[#C8F169]" />
            <span>Hardware Devices & Audio Status</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Camera Select */}
            <div className="bg-[#1B1F24] p-4 rounded-xl border border-[#292E35] space-y-2">
              <label className="text-xs font-mono text-[#9299A3]">CAMERA INPUT DEVICE</label>
              <select
                value={settings.selectedCameraId}
                onChange={(e) => {
                  onUpdateSettings({ selectedCameraId: e.target.value });
                  handleSaveNotice();
                }}
                className="w-full bg-[#14171B] border border-[#292E35] rounded-lg px-3 py-2 text-xs text-[#F5F6F7] focus:outline-none focus:border-[#C8F169]"
              >
                <option value="">Default System Webcam</option>
                {availableCameras.map((device, idx) => (
                  <option key={device.deviceId || idx} value={device.deviceId}>
                    {device.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Master Volume */}
            <div className="bg-[#1B1F24] p-4 rounded-xl border border-[#292E35] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#9299A3]">MASTER VOLUME</span>
                <span className="text-[#C8F169]">{Math.round(settings.masterVolume * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({ masterVolume: settings.masterVolume === 0 ? 0.75 : 0 });
                    handleSaveNotice();
                  }}
                  className="p-1.5 rounded-lg bg-[#14171B] border border-[#292E35] text-[#9299A3] hover:text-[#F5F6F7] transition-colors"
                  title={settings.masterVolume === 0 ? 'Unmute' : 'Mute'}
                >
                  {settings.masterVolume === 0 ? (
                    <VolumeX className="w-4 h-4 text-[#FF6B6B]" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-[#C8F169]" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.masterVolume}
                  onChange={(e) => {
                    onUpdateSettings({ masterVolume: parseFloat(e.target.value) });
                    handleSaveNotice();
                  }}
                  className="w-full h-1.5 bg-[#292E35] accent-[#C8F169] rounded cursor-pointer"
                  aria-label="Master volume"
                />
              </div>
            </div>

            {/* Audio Engine Status */}
            <div className="bg-[#1B1F24] p-4 rounded-xl border border-[#292E35] space-y-2 md:col-span-2">
              <label className="text-xs font-mono text-[#9299A3]">AUDIO ENGINE SAMPLES</label>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#F5F6F7]">
                  {audioStatus.samplesLoadedCount} / {audioStatus.totalSamplesCount} Chords Loaded
                </span>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded ${
                    audioStatus.initialized ? 'bg-[#C8F169]/10 text-[#C8F169]' : 'bg-[#292E35] text-[#9299A3]'
                  }`}
                >
                  {audioStatus.initialized ? 'Active' : 'Standby'}
                </span>
              </div>
              <p className="text-[11px] text-[#9299A3]">
                High-definition acoustic guitar samples with Karplus-Strong physical modeling fallback.
              </p>
            </div>
          </div>
        </div>

        {/* Section 5: Reset to Defaults */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset all AirChord settings to factory defaults?')) {
                onResetSettings();
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1B1F24] border border-[#292E35] text-xs font-semibold text-[#9299A3] hover:text-[#FF6B6B] hover:border-[#FF6B6B]/40 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All to Defaults</span>
          </button>
        </div>
      </div>
    </div>
  );
};
