import {
  Activity,
  BookOpen,
  Music,
  Settings as SettingsIcon,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { AudioStatus } from '../../types';

export type NavTab = 'play' | 'learn' | 'settings';

interface TopNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  audioStatus: AudioStatus;
  volume: number;
  onVolumeChange: (vol: number) => void;
  debugMode: boolean;
  onToggleDebug: () => void;
  isPlaying: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentTab,
  onTabChange,
  audioStatus,
  volume,
  onVolumeChange,
  debugMode,
  onToggleDebug,
  isPlaying,
}) => {
  return (
    <header className="w-full bg-[#0B0D0F] border-b border-[#292E35] px-4 md:px-8 py-3 flex items-center justify-between z-30 select-none">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#14171B] border border-[#292E35] flex items-center justify-center text-[#C8F169]">
          <Music className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight text-[#F5F6F7]">AirChord</span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#1B1F24] text-[#C8F169] border border-[#292E35]">
              v1.0
            </span>
            {isPlaying && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-[#C8F169] bg-[#C8F169]/10 px-1.5 py-0.5 rounded border border-[#C8F169]/30 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8F169]" />
                LIVE
              </span>
            )}
          </div>
          <div className="text-[11px] text-[#9299A3] hidden sm:block">
            Vision-Controlled Virtual Guitar
          </div>
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex items-center gap-1 bg-[#14171B] p-1 rounded-lg border border-[#292E35]">
        <button
          onClick={() => onTabChange('play')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
            currentTab === 'play'
              ? 'bg-[#1B1F24] text-[#C8F169] shadow-sm'
              : 'text-[#9299A3] hover:text-[#F5F6F7]'
          }`}
          aria-current={currentTab === 'play' ? 'page' : undefined}
        >
          <Music className="w-4 h-4" />
          <span>Play</span>
        </button>

        <button
          onClick={() => onTabChange('learn')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
            currentTab === 'learn'
              ? 'bg-[#1B1F24] text-[#C8F169] shadow-sm'
              : 'text-[#9299A3] hover:text-[#F5F6F7]'
          }`}
          aria-current={currentTab === 'learn' ? 'page' : undefined}
        >
          <BookOpen className="w-4 h-4" />
          <span>Learn</span>
        </button>

        <button
          onClick={() => onTabChange('settings')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
            currentTab === 'settings'
              ? 'bg-[#1B1F24] text-[#C8F169] shadow-sm'
              : 'text-[#9299A3] hover:text-[#F5F6F7]'
          }`}
          aria-current={currentTab === 'settings' ? 'page' : undefined}
        >
          <SettingsIcon className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </nav>

      {/* Right Controls: Audio Status, Volume, Debug */}
      <div className="flex items-center gap-3">
        {/* Audio Engine Status Badge */}
        <div
          className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded bg-[#14171B] border border-[#292E35] text-xs font-mono"
          title={
            audioStatus.error
              ? `Audio error: ${audioStatus.error}`
              : audioStatus.loading
              ? `Loading samples: ${audioStatus.samplesLoadedCount}/${audioStatus.totalSamplesCount}`
              : audioStatus.initialized
              ? 'Audio Engine Online'
              : 'Audio awaiting start'
          }
        >
          <span
            className={`w-2 h-2 rounded-full ${
              audioStatus.error
                ? 'bg-[#FF6B6B]'
                : audioStatus.loading
                ? 'bg-amber-400 animate-pulse'
                : audioStatus.initialized
                ? 'bg-[#C8F169]'
                : 'bg-[#9299A3]'
            }`}
          />
          <span className="text-[#9299A3]">
            {audioStatus.loading
              ? `Loading (${audioStatus.samplesLoadedCount}/10)`
              : audioStatus.initialized
              ? 'Audio Ready'
              : 'Audio Idle'}
          </span>
        </div>

        {/* Volume slider */}
        <div className="flex items-center gap-2 bg-[#14171B] px-2.5 py-1 rounded-lg border border-[#292E35]">
          <button
            onClick={() => onVolumeChange(volume === 0 ? 0.8 : 0)}
            className="text-[#9299A3] hover:text-[#F5F6F7] transition-colors"
            aria-label={volume === 0 ? 'Unmute' : 'Mute'}
          >
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-16 h-1 bg-[#292E35] accent-[#C8F169] rounded cursor-pointer"
            aria-label="Master volume"
          />
        </div>

        {/* Debug Toggle */}
        <button
          onClick={onToggleDebug}
          className={`p-2 rounded-lg border transition-colors ${
            debugMode
              ? 'bg-[#C8F169] text-[#0B0D0F] border-[#C8F169]'
              : 'bg-[#14171B] text-[#9299A3] border-[#292E35] hover:text-[#F5F6F7]'
          }`}
          title="Toggle Diagnostics / Skeleton Overlay"
          aria-label="Toggle Debug Mode"
        >
          <Activity className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
