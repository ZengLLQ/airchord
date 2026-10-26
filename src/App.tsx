import { useEffect, useState } from 'react';
import { LearnView } from './components/learn/LearnView';
import type { NavTab } from './components/navigation/TopNav';
import { TopNav } from './components/navigation/TopNav';
import { PlayView } from './components/play/PlayView';
import { SettingsView } from './components/settings/SettingsView';
import { useAirGuitar } from './hooks/useAirGuitar';
import { resetSettings } from './storage/settingsStorage';
import type { StrumDirection } from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('play');

  const {
    videoRef,
    settings,
    cameraStatus,
    cameraError,
    audioStatus,
    activeChord,
    lastStrum,
    trackingStatus,
    isPlaying,
    latestHandsRef,
    latestAssignmentRef,
    latestMotionRef,
    startInstrument,
    stopInstrument,
    updateSettings,
    selectChordManual,
    triggerStrumManual,
    swapHandRoles,
  } = useAirGuitar();

  // Keyboard accessibility and testing shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or select
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) {
          stopInstrument();
        } else {
          startInstrument();
        }
      } else if (e.key === '1') {
        selectChordManual('c-major');
      } else if (e.key === '2') {
        selectChordManual('g-major');
      } else if (e.key === '3') {
        selectChordManual('d-major');
      } else if (e.key === '4') {
        selectChordManual('e-minor');
      } else if (e.key === '5') {
        selectChordManual('a-minor');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        triggerStrumManual('down');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        triggerStrumManual('up');
      } else if (e.key.toLowerCase() === 'd') {
        updateSettings({ debugMode: !settings.debugMode });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPlaying,
    startInstrument,
    stopInstrument,
    selectChordManual,
    triggerStrumManual,
    updateSettings,
    settings.debugMode,
  ]);

  const handleAuditionChord = (chordId: string, direction: StrumDirection) => {
    selectChordManual(chordId);
    triggerStrumManual(direction);
  };

  const handleResetSettings = () => {
    const defaults = resetSettings();
    updateSettings(defaults);
  };

  return (
    <div className="min-h-screen bg-[#0B0D0F] text-[#F5F6F7] flex flex-col font-sans selection:bg-[#C8F169] selection:text-[#0B0D0F]">
      <TopNav
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        audioStatus={audioStatus}
        volume={settings.masterVolume}
        onVolumeChange={(vol) => updateSettings({ masterVolume: vol })}
        debugMode={settings.debugMode}
        onToggleDebug={() => updateSettings({ debugMode: !settings.debugMode })}
        isPlaying={isPlaying}
      />

      <main className="flex-1 flex flex-col">
        {/* We keep PlayView mounted so videoRef stays attached when switching tabs */}
        <div className={currentTab === 'play' ? 'flex flex-1 flex-col' : 'hidden'}>
          <PlayView
            videoRef={videoRef}
            isPlaying={isPlaying}
            cameraStatus={cameraStatus}
            cameraError={cameraError}
            activeChord={activeChord}
            lastStrum={lastStrum}
            trackingStatus={trackingStatus}
            settings={settings}
            handsRef={latestHandsRef}
            assignmentRef={latestAssignmentRef}
            motionRef={latestMotionRef}
            onStart={startInstrument}
            onStop={stopInstrument}
            onSwapHands={swapHandRoles}
            onSelectChord={selectChordManual}
            onTriggerStrum={triggerStrumManual}
          />
        </div>

        {currentTab === 'learn' && (
          <LearnView
            onAuditionChord={handleAuditionChord}
            activeChordId={activeChord.id}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            settings={settings}
            audioStatus={audioStatus}
            onUpdateSettings={updateSettings}
            onResetSettings={handleResetSettings}
            onAuditionChord={handleAuditionChord}
          />
        )}
      </main>

      {/* Accessible keyboard hints footer */}
      <footer className="border-t border-[#292E35] bg-[#0B0D0F] px-4 py-2 text-[11px] text-[#9299A3] flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-3">
          <span>Shortcuts:</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-[#14171B] border border-[#292E35] text-[#F5F6F7]">Space</kbd> Start/Stop</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-[#14171B] border border-[#292E35] text-[#F5F6F7]">1–5</kbd> Chords</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-[#14171B] border border-[#292E35] text-[#F5F6F7]">↓ / ↑</kbd> Strums</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-[#14171B] border border-[#292E35] text-[#F5F6F7]">D</kbd> Diagnostics</span>
        </div>
        <div className="text-[10px] opacity-75">
          AirChord • Audio Synthesizer & Computer Vision
        </div>
      </footer>
    </div>
  );
}

export default App;
