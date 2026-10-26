import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Award,
  Check,
  RotateCcw,
} from 'lucide-react';
import { CHORD_REGISTRY } from '../../audio/chordRegistry';
import type { StrumDirection } from '../../types';
import { ChordFretDiagram } from '../play/ChordFretDiagram';

interface LearnViewProps {
  onAuditionChord: (chordId: string, direction: StrumDirection) => void;
  activeChordId?: string;
}

interface PracticeStep {
  id: number;
  chordId: string;
  targetFingers: number;
  instruction: string;
  stroke: StrumDirection;
}

const PRACTICE_STEPS: PracticeStep[] = [
  {
    id: 1,
    chordId: 'c-major',
    targetFingers: 1,
    instruction: 'Raise 1 finger (Index) for C Major, then strum downwards.',
    stroke: 'down',
  },
  {
    id: 2,
    chordId: 'g-major',
    targetFingers: 2,
    instruction: 'Raise 2 fingers (Index + Middle) for G Major, then strum downwards.',
    stroke: 'down',
  },
  {
    id: 3,
    chordId: 'd-major',
    targetFingers: 3,
    instruction: 'Raise 3 fingers for D Major, then perform an upstroke.',
    stroke: 'up',
  },
  {
    id: 4,
    chordId: 'e-minor',
    targetFingers: 4,
    instruction: 'Raise 4 fingers for E Minor, then strum downwards.',
    stroke: 'down',
  },
  {
    id: 5,
    chordId: 'a-minor',
    targetFingers: 5,
    instruction: 'Open all 5 fingers for A Minor, then complete with an upstroke.',
    stroke: 'up',
  },
];

const GESTURE_GUIDES: Record<
  string,
  { fingers: number; icon: string; title: string; howTo: string }
> = {
  'c-major': {
    fingers: 1,
    icon: '☝️',
    title: '1 Finger: Index Raised',
    howTo: 'Raise your index finger straight up. Fold thumb and remaining fingers against the palm.',
  },
  'g-major': {
    fingers: 2,
    icon: '✌️',
    title: '2 Fingers: Victory / Peace',
    howTo: 'Extend your index and middle fingers upward in a V shape. Keep ring, pinky, and thumb folded.',
  },
  'd-major': {
    fingers: 3,
    icon: '🤟',
    title: '3 Fingers: Three Up',
    howTo: 'Extend index, middle, and ring fingers together. Tuck pinky and thumb.',
  },
  'e-minor': {
    fingers: 4,
    icon: '🖐️',
    title: '4 Fingers: Flat Four',
    howTo: 'Extend all four long fingers (index, middle, ring, pinky). Tuck thumb across palm.',
  },
  'a-minor': {
    fingers: 5,
    icon: '✋',
    title: '5 Fingers: Open Hand',
    howTo: 'Open your entire hand with all five fingers spread naturally toward the camera.',
  },
};

export const LearnView: React.FC<LearnViewProps> = ({ onAuditionChord, activeChordId }) => {
  const [currentPracticeIndex, setCurrentPracticeIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const currentStep = PRACTICE_STEPS[currentPracticeIndex];
  const isPracticeFinished = completedSteps.length === PRACTICE_STEPS.length;

  const handleStepDone = (stepId: number, chordId: string, stroke: StrumDirection) => {
    onAuditionChord(chordId, stroke);
    if (!completedSteps.includes(stepId)) {
      const nextCompleted = [...completedSteps, stepId];
      setCompletedSteps(nextCompleted);
      if (currentPracticeIndex < PRACTICE_STEPS.length - 1) {
        setCurrentPracticeIndex((prev) => prev + 1);
      }
    }
  };

  const handleResetPractice = () => {
    setCurrentPracticeIndex(0);
    setCompletedSteps([]);
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-6xl mx-auto w-full gap-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[#F5F6F7]">
          Learn & Master AirChord
        </h1>
        <p className="text-sm text-[#9299A3] mt-1 max-w-2xl">
          AirChord uses intuitive finger-count gestures for chord selection and directional wrist movement for strumming. Review the gesture guide below or practice transitions.
        </p>
      </div>

      {/* Interactive Practice Trainer */}
      <div className="bg-[#14171B] border border-[#292E35] rounded-2xl p-6">
        <div className="flex items-center justify-between border-b border-[#292E35] pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#C8F169]/10 text-[#C8F169] flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-[#F5F6F7] text-sm">Chord Transition Practice</div>
              <div className="text-xs text-[#9299A3]">
                Step {currentPracticeIndex + 1} of {PRACTICE_STEPS.length}
              </div>
            </div>
          </div>

          <button
            onClick={handleResetPractice}
            className="flex items-center gap-1.5 text-xs text-[#9299A3] hover:text-[#F5F6F7] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Practice</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#1B1F24] h-2 rounded-full overflow-hidden mb-6 border border-[#292E35]">
          <div
            className="bg-[#C8F169] h-full transition-all duration-300"
            style={{ width: `${(completedSteps.length / PRACTICE_STEPS.length) * 100}%` }}
          />
        </div>

        {isPracticeFinished ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#C8F169]/20 text-[#C8F169] flex items-center justify-center mx-auto">
              <Check className="w-8 h-8" />
            </div>
            <div className="text-xl font-bold text-[#F5F6F7]">Practice Routine Complete!</div>
            <p className="text-sm text-[#9299A3] max-w-md mx-auto">
              You've demonstrated smooth chord transitions across all 5 chords. Head over to the Play view to perform freely!
            </p>
            <button
              onClick={handleResetPractice}
              className="px-6 py-2.5 rounded-lg bg-[#C8F169] text-[#0B0D0F] font-bold text-xs"
            >
              Practice Again
            </button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-[#1B1F24] border border-[#292E35] rounded-xl p-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-mono uppercase bg-[#14171B] text-[#C8F169] border border-[#292E35]">
                {GESTURE_GUIDES[currentStep.chordId].icon} {currentStep.targetFingers} Finger Gesture
              </div>
              <div className="text-lg font-bold text-[#F5F6F7]">
                {CHORD_REGISTRY[currentStep.chordId]?.name}
              </div>
              <p className="text-sm text-[#9299A3] max-w-lg">
                {currentStep.instruction}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleStepDone(currentStep.id, currentStep.chordId, currentStep.stroke)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C8F169] text-[#0B0D0F] font-bold text-xs hover:bg-[#d4f67c] transition-colors shadow-lg"
              >
                {currentStep.stroke === 'down' ? (
                  <ArrowDown className="w-4 h-4" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
                <span>Complete Step</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5 Chord Cards Directory */}
      <div>
        <div className="font-bold text-lg text-[#F5F6F7] mb-4">
          Default Chord Gesture Reference
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(CHORD_REGISTRY).map((chord) => {
            const guide = GESTURE_GUIDES[chord.id];
            const isCurrentlyActive = activeChordId === chord.id;

            return (
              <div
                key={chord.id}
                className={`bg-[#14171B] border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                  isCurrentlyActive
                    ? 'border-[#C8F169] shadow-lg shadow-[#C8F169]/5'
                    : 'border-[#292E35] hover:border-[#3c444e]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{guide.icon}</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#1B1F24] text-[#C8F169] border border-[#292E35]">
                      {guide.fingers} Finger{guide.fingers > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="text-2xl font-bold text-[#F5F6F7]">{chord.name}</div>
                  <div className="text-xs text-[#9299A3] font-medium mt-1">
                    {guide.title}
                  </div>
                  <p className="text-xs text-[#9299A3] mt-2.5 leading-relaxed">
                    {guide.howTo}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-[#292E35] flex items-center justify-between">
                  <ChordFretDiagram chord={chord} className="!p-2 scale-90 origin-left" />

                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => onAuditionChord(chord.id, 'down')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B1F24] border border-[#292E35] text-xs text-[#F5F6F7] hover:border-[#C8F169] hover:text-[#C8F169] transition-colors"
                      title="Audition Downstroke"
                    >
                      <ArrowDown className="w-3.5 h-3.5 text-[#C8F169]" />
                      <span>Down</span>
                    </button>
                    <button
                      onClick={() => onAuditionChord(chord.id, 'up')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B1F24] border border-[#292E35] text-xs text-[#F5F6F7] hover:border-cyan-400 hover:text-cyan-400 transition-colors"
                      title="Audition Upstroke"
                    >
                      <ArrowUp className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Up</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strumming Technique Masterclass */}
      <div className="bg-[#14171B] border border-[#292E35] rounded-2xl p-6">
        <h2 className="text-xl font-bold text-[#F5F6F7] mb-4">Strumming Technique Guide</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-[#9299A3] leading-relaxed">
          <div className="space-y-2 bg-[#1B1F24] p-4 rounded-xl border border-[#292E35]">
            <div className="flex items-center gap-2 font-bold text-[#F5F6F7]">
              <ArrowDown className="w-4 h-4 text-[#C8F169]" />
              <span>Downstroke Motion</span>
            </div>
            <p className="text-xs">
              Drop your strumming hand downward through the air. The motion should be brisk and deliberate, covering at least 4–5cm of vertical travel in front of the lens.
            </p>
          </div>

          <div className="space-y-2 bg-[#1B1F24] p-4 rounded-xl border border-[#292E35]">
            <div className="flex items-center gap-2 font-bold text-[#F5F6F7]">
              <ArrowUp className="w-4 h-4 text-cyan-400" />
              <span>Upstroke Motion</span>
            </div>
            <p className="text-xs">
              Sweep your wrist back upwards. AirChord requires the hand to slow down or reverse to re-arm, preventing tremors or hovering from creating repeated accidental strums.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
