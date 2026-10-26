import type React from 'react';
import { useEffect, useRef } from 'react';
import type { HandAssignment, TrackedHand } from '../../types';
import type { MotionAnalysis } from '../../vision/MotionAnalyzer';

interface DebugOverlayProps {
  handsRef: React.RefObject<TrackedHand[]>;
  assignmentRef: React.RefObject<HandAssignment | null>;
  motionRef: React.RefObject<MotionAnalysis | null>;
  fps: number;
  mirror: boolean;
}

const CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm knuckle base
  [5, 9], [9, 13], [13, 17],
];

export const DebugOverlay: React.FC<DebugOverlayProps> = ({
  handsRef,
  assignmentRef,
  motionRef,
  fps,
  mirror,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;

    const renderLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const hands = handsRef.current ?? [];
      const assignment = assignmentRef.current;
      const motion = motionRef.current;

      // Draw hand skeletons
      hands.forEach((hand) => {
        const isChordHand = assignment?.chordHand === hand;
        const isStrumHand = assignment?.strumHand === hand;

        const boneColor = isChordHand
          ? '#C8F169' // Lime for chord hand
          : isStrumHand
          ? '#38BDF8' // Cyan for strum hand
          : '#9299A3'; // Gray for unassigned

        // Draw connections
        ctx.strokeStyle = boneColor;
        ctx.lineWidth = 2.5;

        CONNECTIONS.forEach(([i, j]) => {
          const p1 = hand.landmarks[i];
          const p2 = hand.landmarks[j];
          if (!p1 || !p2) return;

          const x1 = mirror ? (1 - p1.x) * width : p1.x * width;
          const y1 = p1.y * height;
          const x2 = mirror ? (1 - p2.x) * width : p2.x * width;
          const y2 = p2.y * height;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        });

        // Draw joints
        hand.landmarks.forEach((p, idx) => {
          const x = mirror ? (1 - p.x) * width : p.x * width;
          const y = p.y * height;

          ctx.fillStyle = idx === 0 ? '#FFFFFF' : boneColor;
          ctx.beginPath();
          ctx.arc(x, y, idx === 0 ? 5 : 3.5, 0, 2 * Math.PI);
          ctx.fill();
        });

        // Hand role label
        const wrist = hand.landmarks[0];
        if (wrist) {
          const wx = mirror ? (1 - wrist.x) * width : wrist.x * width;
          const wy = wrist.y * height - 12;

          ctx.font = '11px monospace';
          ctx.fillStyle = '#FFFFFF';
          const label = isChordHand
            ? `CHORD (${hand.handedness})`
            : isStrumHand
            ? `STRUM (${hand.handedness})`
            : hand.handedness;
          ctx.fillText(label, wx - 30, wy);
        }
      });

      // Diagnostics HUD in top corner
      ctx.fillStyle = 'rgba(11, 13, 15, 0.75)';
      ctx.fillRect(8, 8, 170, 75);
      ctx.strokeStyle = '#292E35';
      ctx.lineWidth = 1;
      ctx.strokeRect(8, 8, 170, 75);

      ctx.fillStyle = '#C8F169';
      ctx.font = '12px monospace';
      ctx.fillText(`FPS: ${fps}`, 16, 26);

      ctx.fillStyle = '#F5F6F7';
      ctx.fillText(`Hands Detected: ${hands.length}`, 16, 42);

      const velY = motion?.isValid ? motion.velocityY.toFixed(2) : '0.00';
      ctx.fillText(`Strum Vel Y: ${velY}`, 16, 58);

      // Mini velocity meter
      if (motion?.isValid) {
        const barWidth = Math.min(60, Math.abs(motion.velocityY) * 20);
        const barX = 100;
        const barY = 62;
        ctx.fillStyle = motion.velocityY > 0 ? '#C8F169' : '#38BDF8';
        ctx.fillRect(barX, barY, barWidth, 4);
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [fps, mirror, handsRef, assignmentRef, motionRef]);

  return (
    <canvas
      ref={canvasRef}
      width={1280}
      height={720}
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
      aria-hidden="true"
    />
  );
};
