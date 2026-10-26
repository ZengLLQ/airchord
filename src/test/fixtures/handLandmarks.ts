import type { HandLandmark } from '../../types';

/**
 * Creates 21 normalized landmarks for a stylized hand in front of the camera.
 * Wrist at (0.5, 0.7). Palm length ~0.2.
 */
export function createHandLandmarks(options: {
  thumbExtended?: boolean;
  indexExtended?: boolean;
  middleExtended?: boolean;
  ringExtended?: boolean;
  pinkyExtended?: boolean;
  wristX?: number;
  wristY?: number;
}): HandLandmark[] {
  const {
    thumbExtended = false,
    indexExtended = false,
    middleExtended = false,
    ringExtended = false,
    pinkyExtended = false,
    wristX = 0.5,
    wristY = 0.7,
  } = options;

  const lm: HandLandmark[] = new Array(21);

  // 0: Wrist
  lm[0] = { x: wristX, y: wristY, z: 0 };

  // Thumb: 1: CMC, 2: MCP, 3: IP, 4: TIP
  lm[1] = { x: wristX - 0.04, y: wristY - 0.05, z: 0 };
  lm[2] = { x: wristX - 0.08, y: wristY - 0.1, z: 0 };
  lm[3] = { x: wristX - 0.11, y: wristY - 0.14, z: 0 };
  // If extended, thumb tip reaches outward and up; if folded, tucks inward
  lm[4] = thumbExtended
    ? { x: wristX - 0.16, y: wristY - 0.18, z: 0 }
    : { x: wristX - 0.05, y: wristY - 0.12, z: 0 };

  // Index: 5: MCP, 6: PIP, 7: DIP, 8: TIP
  lm[5] = { x: wristX - 0.04, y: wristY - 0.16, z: 0 };
  lm[6] = { x: wristX - 0.045, y: wristY - 0.22, z: 0 };
  lm[7] = { x: wristX - 0.048, y: wristY - 0.26, z: 0 };
  lm[8] = indexExtended
    ? { x: wristX - 0.05, y: wristY - 0.32, z: 0 }
    : { x: wristX - 0.04, y: wristY - 0.18, z: 0 };

  // Middle: 9: MCP, 10: PIP, 11: DIP, 12: TIP
  lm[9] = { x: wristX, y: wristY - 0.17, z: 0 };
  lm[10] = { x: wristX, y: wristY - 0.23, z: 0 };
  lm[11] = { x: wristX, y: wristY - 0.28, z: 0 };
  lm[12] = middleExtended
    ? { x: wristX, y: wristY - 0.34, z: 0 }
    : { x: wristX, y: wristY - 0.19, z: 0 };

  // Ring: 13: MCP, 14: PIP, 15: DIP, 16: TIP
  lm[13] = { x: wristX + 0.04, y: wristY - 0.16, z: 0 };
  lm[14] = { x: wristX + 0.042, y: wristY - 0.22, z: 0 };
  lm[15] = { x: wristX + 0.045, y: wristY - 0.26, z: 0 };
  lm[16] = ringExtended
    ? { x: wristX + 0.048, y: wristY - 0.32, z: 0 }
    : { x: wristX + 0.038, y: wristY - 0.18, z: 0 };

  // Pinky: 17: MCP, 18: PIP, 19: DIP, 20: TIP
  lm[17] = { x: wristX + 0.07, y: wristY - 0.14, z: 0 };
  lm[18] = { x: wristX + 0.075, y: wristY - 0.19, z: 0 };
  lm[19] = { x: wristX + 0.078, y: wristY - 0.23, z: 0 };
  lm[20] = pinkyExtended
    ? { x: wristX + 0.08, y: wristY - 0.28, z: 0 }
    : { x: wristX + 0.065, y: wristY - 0.16, z: 0 };

  return lm;
}
