import type React from 'react';
import type { ChordDefinition } from '../../types';

interface ChordFretDiagramProps {
  chord: ChordDefinition;
  className?: string;
}

export const ChordFretDiagram: React.FC<ChordFretDiagramProps> = ({ chord, className = '' }) => {
  const { frets, strings } = chord;
  const numStrings = 6;
  const numFrets = 4;

  return (
    <div
      className={`flex flex-col items-center bg-[#14171B] border border-[#292E35] rounded-lg p-3 text-xs ${className}`}
      aria-label={`Fretboard diagram for ${chord.name}`}
    >
      <div className="text-[11px] font-mono text-[#9299A3] mb-1">Fretboard</div>
      <svg
        width="110"
        height="100"
        viewBox="0 0 110 100"
        className="overflow-visible select-none"
      >
        {/* Nut (top thick line) */}
        <line x1="15" y1="20" x2="95" y2="20" stroke="#F5F6F7" strokeWidth="3" />

        {/* Frets (horizontal lines) */}
        {Array.from({ length: numFrets }).map((_, fIdx) => {
          const y = 20 + (fIdx + 1) * 18;
          return (
            <line
              key={`fret-${fIdx}`}
              x1="15"
              y1={y}
              x2="95"
              y2={y}
              stroke="#292E35"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Strings (vertical lines) */}
        {Array.from({ length: numStrings }).map((_, sIdx) => {
          const x = 15 + sIdx * 16;
          const fretVal = frets[sIdx];
          const isMuted = fretVal === -1;
          const isOpen = fretVal === 0;

          return (
            <g key={`string-${sIdx}`}>
              {/* String line */}
              <line
                x1={x}
                y1="20"
                x2={x}
                y2="92"
                stroke={fretVal > 0 ? '#9299A3' : '#3c444e'}
                strokeWidth={sIdx < 2 ? 1.8 : 1.2}
              />

              {/* Nut indicator (X for muted, O for open) */}
              {isMuted && (
                <text
                  x={x}
                  y="14"
                  fill="#FF6B6B"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  ✕
                </text>
              )}
              {isOpen && (
                <text
                  x={x}
                  y="14"
                  fill="#C8F169"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  ○
                </text>
              )}

              {/* Fret dot for pressed string */}
              {fretVal > 0 && (
                <circle
                  cx={x}
                  cy={20 + (fretVal - 0.5) * 18}
                  r="5"
                  fill="#C8F169"
                  stroke="#0B0D0F"
                  strokeWidth="1.5"
                />
              )}

              {/* String note name at bottom */}
              <text
                x={x}
                y="100"
                fill="#9299A3"
                fontSize="8"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {strings[sIdx] || ''}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
