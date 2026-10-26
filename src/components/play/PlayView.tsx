import { useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Camera,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Play,
  RotateCw,
  Square,
  Volume2,
} from 'lucide-react';
import { CHORD_REGISTRY } from '../../audio/chordRegistry';
import type {
  CameraStatus,
  ChordDefinition,
  HandAssignment,
  InstrumentSettings,
  StrumDirection,
  StrumEvent,
  TrackedHand,
  TrackingStatus,
} from '../../types';
import type { MotionAnalysis } from '../../vision/MotionAnalyzer';
import { DebugOverlay } from '../debug/DebugOverlay';
import { ChordFretDiagram } from './ChordFretDiagram';

interface PlayViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  cameraStatus: CameraStatus;
  cameraError: string | null;
  activeChord: ChordDefinition;
  lastStrum: StrumEvent | null;
  trackingStatus: TrackingStatus;
  settings: InstrumentSettings;
  handsRef: React.RefObject<TrackedHand[]>;
  assignmentRef: React.RefObject<HandAssignment | null>;
  motionRef: React.RefObject<MotionAnalysis | null>;
  onStart: () => void;
  onStop: () => void;
  onSwapHands: () => void;
  onSelectChord: (chordId: string) => void;
  onTriggerStrum: (dir: StrumDirection) => void;
}

export const PlayView: React.FC<PlayViewProps> = ({
  videoRef,
  isPlaying,
  cameraStatus,
  cameraError,
  activeChord,
  lastStrum,
  trackingStatus,
  settings,
  handsRef,
  assignmentRef,
  motionRef,
  onStart,
  onStop,
  onSwapHands,
  onSelectChord,
  onTriggerStrum,
}) => {
  const [showQuickHelp, setShowQuickHelp] = useState(false);

  // Show quick help modal state

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-7xl mx-auto w-full gap-4">
      {/* Top Banner / Guidance */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#14171B] border border-[#292E35] rounded-xl px-4 py-2.5 text-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[#9299A3]">Chord Hand:</span>
            <span className="font-semibold text-[#F5F6F7]">{settings.chordHand} Hand</span>
          </div>
          <span className="text-[#292E35]">|</span>
          <div className="flex items-center gap-2">
            <span className="text-[#9299A3]">Strum Hand:</span>
            <span className="font-semibold text-[#F5F6F7]">{settings.strumHand} Hand</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPlaying && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  trackingStatus.handsDetected === 2
                    ? 'bg-[#C8F169]'
                    : trackingStatus.handsDetected === 1
                    ? 'bg-amber-400'
                    : 'bg-[#FF6B6B]'
                }`}
              />
              <span className="text-[#9299A3]">
                {trackingStatus.handsDetected === 2
                  ? 'Both Hands Tracked'
                  : trackingStatus.handsDetected === 1
                  ? '1 Hand in View'
                  : 'Position Hands in View'}
              </span>
            </div>
          )}

          <button
            onClick={onSwapHands}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1B1F24] border border-[#292E35] text-xs text-[#9299A3] hover:text-[#F5F6F7] transition-colors"
            title="Swap Left / Right Hand Roles"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Swap Roles</span>
          </button>

          <button
            onClick={() => setShowQuickHelp((prev) => !prev)}
            className="p-1 rounded text-[#9299A3] hover:text-[#F5F6F7] transition-colors"
            title="Quick Instructions"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Help Modal / Dropdown */}
      {showQuickHelp && (
        <div className="bg-[#1B1F24] border border-[#292E35] rounded-xl p-4 text-xs text-[#9299A3] space-y-2">
          <div className="font-semibold text-[#F5F6F7] text-sm">How to Play AirChord</div>
          <p>
            1. Click <strong className="text-[#C8F169]">Start AirChord</strong> and allow camera access.
          </p>
          <p>
            2. Raise your <strong className="text-[#F5F6F7]">{settings.chordHand} Hand</strong> in front of the camera:
            1 finger = C Maj, 2 fingers = G Maj, 3 fingers = D Maj, 4 fingers = E Min, 5 fingers = A Min.
          </p>
          <p>
            3. Move your <strong className="text-[#F5F6F7]">{settings.strumHand} Hand</strong> briskly downwards or upwards through the air to strum the guitar!
          </p>
        </div>
      )}

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left / Center: Camera & Hand Tracking Feed (Cols 8) */}
        <div className="lg:col-span-8 flex flex-col bg-[#14171B] border border-[#292E35] rounded-2xl overflow-hidden relative min-h-[380px] lg:min-h-[500px]">
          {/* Tracking Lost Warning Banner */}
          {isPlaying && trackingStatus.handsDetected < 2 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-[#0B0D0F]/90 border border-amber-500/50 text-amber-300 px-4 py-1.5 rounded-full text-xs flex items-center gap-2 backdrop-blur-sm shadow-lg pointer-events-none animate-pulse">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {trackingStatus.handsDetected === 0
                  ? 'Bring both hands into camera view to play'
                  : !trackingStatus.chordHandPresent
                  ? `Raise ${settings.chordHand} hand to select chord`
                  : `Position ${settings.strumHand} hand to strum`}
              </span>
            </div>
          )}

          {/* Strum Visual Feedback Indicator */}
          {lastStrum && (
            <div
              key={lastStrum.id}
              className={`absolute inset-0 pointer-events-none z-20 flex items-center justify-center ${
                lastStrum.direction === 'down' ? 'animate-strum-down' : 'animate-strum-up'
              }`}
            >
              <div className="bg-[#C8F169]/15 border border-[#C8F169] text-[#C8F169] px-6 py-2 rounded-full font-mono font-bold text-sm flex items-center gap-2 backdrop-blur-md shadow-2xl">
                {lastStrum.direction === 'down' ? (
                  <>
                    <ArrowDown className="w-5 h-5" />
                    <span>DOWNSTROKE</span>
                  </>
                ) : (
                  <>
                    <ArrowUp className="w-5 h-5" />
                    <span>UPSTROKE</span>
                  </>
                )}
                <span className="text-xs opacity-80">({activeChord.name})</span>
              </div>
            </div>
          )}

          {/* Video Feed */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isPlaying ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              transform: settings.mirrorVideo ? 'scaleX(-1)' : 'none',
            }}
            playsInline
            muted
          />

          {/* Diagnostic Overlay Canvas */}
          {isPlaying && settings.debugMode && (
            <DebugOverlay
              handsRef={handsRef}
              assignmentRef={assignmentRef}
              motionRef={motionRef}
              fps={trackingStatus.fps}
              mirror={settings.mirrorVideo}
            />
          )}

          {/* Subtle Hand Role HUD Zones */}
          {isPlaying && (
            <div className="absolute inset-x-0 bottom-3 px-4 flex justify-between pointer-events-none z-10 select-none">
              <div className="bg-[#0B0D0F]/80 border border-[#292E35] rounded-lg px-3 py-1.5 backdrop-blur-sm text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C8F169]" />
                <span className="text-[#9299A3]">
                  {settings.chordHand} Side: <strong className="text-[#F5F6F7]">Chord Select</strong>
                </span>
              </div>
              <div className="bg-[#0B0D0F]/80 border border-[#292E35] rounded-lg px-3 py-1.5 backdrop-blur-sm text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-[#9299A3]">
                  {settings.strumHand} Side: <strong className="text-[#F5F6F7]">Air Strum</strong>
                </span>
              </div>
            </div>
          )}

          {/* Inactive / Permission / Loading State Display */}
          {!isPlaying && (
            <div className="absolute inset-0 bg-[#0B0D0F]/95 flex flex-col items-center justify-center p-6 text-center z-10">
              {cameraStatus === 'initializing' || cameraStatus === 'requesting-permission' ? (
                <div className="space-y-4 max-w-md">
                  <Loader2 className="w-12 h-12 text-[#C8F169] animate-spin mx-auto" />
                  <div className="font-semibold text-lg text-[#F5F6F7]">
                    {cameraStatus === 'requesting-permission'
                      ? 'Requesting Camera Permission...'
                      : 'Initializing Computer Vision Engine...'}
                  </div>
                  <p className="text-xs text-[#9299A3]">
                    Loading MediaPipe Hand Landmarker neural model and calibrating video stream.
                  </p>
                </div>
              ) : cameraStatus === 'camera-error' ? (
                <div className="space-y-4 max-w-md bg-[#1B1F24] border border-[#FF6B6B]/40 p-6 rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-[#FF6B6B]/10 text-[#FF6B6B] flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="font-bold text-lg text-[#F5F6F7]">Camera Access Error</div>
                  <p className="text-sm text-[#9299A3]">
                    {cameraError || 'Unable to access your webcam.'}
                  </p>
                  <button
                    onClick={onStart}
                    className="px-6 py-2.5 rounded-lg bg-[#C8F169] text-[#0B0D0F] font-semibold text-sm hover:bg-[#d8f885] transition-colors shadow-lg"
                  >
                    Retry Camera
                  </button>
                </div>
              ) : (
                <div className="space-y-6 max-w-lg">
                  <div className="w-16 h-16 rounded-2xl bg-[#14171B] border border-[#292E35] flex items-center justify-center mx-auto text-[#C8F169] shadow-xl">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight text-[#F5F6F7]">
                      Virtual Guitar Through Your Webcam
                    </h2>
                    <p className="text-sm text-[#9299A3] leading-relaxed">
                      Position yourself in front of your camera. Your left hand selects chords via finger gestures, and your right hand plays through natural air-strumming.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      onClick={onStart}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[#C8F169] text-[#0B0D0F] font-bold text-sm hover:bg-[#d4f67c] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#C8F169]/10"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      <span>Start AirChord</span>
                    </button>
                  </div>
                  <div className="text-[11px] text-[#9299A3] flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#C8F169]" />
                    <span>Runs 100% in browser. Zero camera data is uploaded or recorded.</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Instrument HUD & Chord Controls (Cols 4) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Active Chord Billboard Card */}
          <div className="bg-[#14171B] border border-[#292E35] rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#9299A3] font-mono border-b border-[#292E35] pb-3 mb-4">
              <span>ACTIVE CHORD</span>
              <span className="px-2 py-0.5 rounded bg-[#1B1F24] border border-[#292E35] text-[#C8F169]">
                {activeChord.defaultGestureFingerCount} Finger{activeChord.defaultGestureFingerCount > 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-5xl font-black tracking-tight text-[#F5F6F7]">
                  {activeChord.shortName}
                </div>
                <div className="text-sm font-medium text-[#9299A3] mt-1">
                  {activeChord.name}
                </div>
                <div className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-[#1B1F24] text-[#9299A3] border border-[#292E35]">
                  Root: {activeChord.root} ({activeChord.quality})
                </div>
              </div>

              {/* Fretboard Mini Diagram */}
              <ChordFretDiagram chord={activeChord} />
            </div>

            {/* Description */}
            <div className="mt-4 pt-3 border-t border-[#292E35] text-xs text-[#9299A3]">
              {activeChord.description}
            </div>
          </div>

          {/* Quick Chord Select Palette (Accessible click / key triggers) */}
          <div className="bg-[#14171B] border border-[#292E35] rounded-2xl p-4">
            <div className="text-xs font-mono text-[#9299A3] mb-3 flex items-center justify-between">
              <span>GESTURE CHORD PALETTE</span>
              <span className="text-[10px] text-[#9299A3]">Click or show gesture</span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {Object.values(CHORD_REGISTRY).map((chord) => {
                const isSelected = activeChord.id === chord.id;
                return (
                  <button
                    key={chord.id}
                    onClick={() => onSelectChord(chord.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-[#C8F169] text-[#0B0D0F] border-[#C8F169] font-bold shadow-md'
                        : 'bg-[#1B1F24] text-[#F5F6F7] border-[#292E35] hover:border-[#9299A3]'
                    }`}
                  >
                    <span className="text-base font-bold">{chord.shortName}</span>
                    <span className="text-[10px] font-mono opacity-80">
                      {chord.defaultGestureFingerCount} ☝
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audio Test / Strumming Controls */}
          <div className="bg-[#14171B] border border-[#292E35] rounded-2xl p-4 flex flex-col gap-3">
            <div className="text-xs font-mono text-[#9299A3] flex items-center justify-between">
              <span>AUDIO TEST CONTROLS</span>
              <Volume2 className="w-3.5 h-3.5" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onTriggerStrum('down')}
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#1B1F24] border border-[#292E35] text-xs font-semibold text-[#F5F6F7] hover:border-[#C8F169] hover:text-[#C8F169] transition-colors"
              >
                <ArrowDown className="w-4 h-4 text-[#C8F169]" />
                <span>Test Downstroke</span>
              </button>

              <button
                onClick={() => onTriggerStrum('up')}
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#1B1F24] border border-[#292E35] text-xs font-semibold text-[#F5F6F7] hover:border-cyan-400 hover:text-cyan-400 transition-colors"
              >
                <ArrowUp className="w-4 h-4 text-cyan-400" />
                <span>Test Upstroke</span>
              </button>
            </div>

            {/* Session Play/Stop Toggle Button */}
            <div className="pt-2">
              {isPlaying ? (
                <button
                  onClick={onStop}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1B1F24] border border-[#FF6B6B]/60 text-[#FF6B6B] hover:bg-[#FF6B6B]/10 font-bold text-sm transition-colors"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop Instrument</span>
                </button>
              ) : (
                <button
                  onClick={onStart}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#C8F169] text-[#0B0D0F] font-bold text-sm hover:bg-[#d4f67c] transition-colors shadow-lg"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Instrument</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
