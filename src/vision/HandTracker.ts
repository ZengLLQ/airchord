import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import type { Handedness, TrackedHand } from '../types';

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private isInitializing: boolean = false;
  private lastVideoTime: number = -1;
  private lastInferenceTimestamp: number = 0;

  /**
   * Initializes MediaPipe HandLandmarker with local assets and CDN fallback.
   */
  public async initialize(): Promise<void> {
    if (this.landmarker || this.isInitializing) return;
    this.isInitializing = true;

    try {
      // First attempt local wasm resolver, then CDN fallback
      let vision;
      try {
        vision = await FilesetResolver.forVisionTasks('/wasm');
      } catch (err) {
        console.warn('Local wasm resolver failed, falling back to CDN...', err);
        vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
        );
      }

      // Try local model first, then CDN fallback
      try {
        this.landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/models/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      } catch (err) {
        console.warn('Local model load failed, falling back to Google Cloud storage...', err);
        this.landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      }
    } finally {
      this.isInitializing = false;
    }
  }

  public isReady(): boolean {
    return this.landmarker !== null;
  }

  /**
   * Performs real-time inference on a video frame.
   * Discards stale or duplicate video frames and enforces monotonic timestamps.
   */
  public detect(videoElement: HTMLVideoElement, timestamp: number): TrackedHand[] {
    if (!this.landmarker || videoElement.readyState < 2) {
      return [];
    }

    // Skip if the video frame has not changed
    if (videoElement.currentTime === this.lastVideoTime) {
      return [];
    }
    this.lastVideoTime = videoElement.currentTime;

    // MediaPipe requires strictly monotonically increasing timestamps
    let safeTimestamp = timestamp;
    if (safeTimestamp <= this.lastInferenceTimestamp) {
      safeTimestamp = this.lastInferenceTimestamp + 1;
    }
    this.lastInferenceTimestamp = safeTimestamp;

    try {
      const results = this.landmarker.detectForVideo(videoElement, safeTimestamp);

      if (!results.landmarks || results.landmarks.length === 0) {
        return [];
      }

      const trackedHands: TrackedHand[] = results.landmarks.map((rawLandmarks, index) => {
        const handednessInfo = results.handednesses?.[index]?.[0];
        const categoryName = handednessInfo?.categoryName;
        const handedness: Handedness = categoryName === 'Right' ? 'Right' : 'Left';
        const score = handednessInfo?.score ?? 0.8;

        return {
          landmarks: rawLandmarks.map((pt) => ({
            x: pt.x,
            y: pt.y,
            z: pt.z,
          })),
          handedness,
          score,
        };
      });

      return trackedHands;
    } catch (err) {
      console.error('HandTracker: inference error', err);
      return [];
    }
  }

  public dispose(): void {
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch (err) {
        console.warn('Error closing HandLandmarker:', err);
      }
      this.landmarker = null;
    }
    this.lastVideoTime = -1;
    this.lastInferenceTimestamp = 0;
  }
}
