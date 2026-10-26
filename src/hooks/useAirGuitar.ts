import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import { getChordById, getChordForFingerCount } from '../audio/chordRegistry';
import { GuitarSampler } from '../audio/GuitarSampler';
import { CameraService } from '../camera/CameraService';
import { loadSettings, saveSettings } from '../storage/settingsStorage';
import type {
  AudioStatus,
  CameraStatus,
  ChordDefinition,
  HandAssignment,
  InstrumentSettings,
  StrumDirection,
  StrumEvent,
  TrackedHand,
  TrackingStatus,
} from '../types';
import { GestureClassifier } from '../vision/GestureClassifier';
import { HandAssigner } from '../vision/HandAssignment';
import { HandTracker } from '../vision/HandTracker';
import { LandmarkSmoother } from '../vision/LandmarkSmoother';
import type { MotionAnalysis } from '../vision/MotionAnalyzer';
import { MotionAnalyzer } from '../vision/MotionAnalyzer';
import { StrumDetector } from '../vision/StrumDetector';

export function useAirGuitar() {
  const [settings, setSettings] = useState<InstrumentSettings>(loadSettings);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>({
    initialized: false,
    loading: false,
    samplesLoadedCount: 0,
    totalSamplesCount: 10,
    error: null,
  });
  const [activeChord, setActiveChord] = useState<ChordDefinition>(() => getChordById('c-major'));
  const [lastStrum, setLastStrum] = useState<StrumEvent | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>({
    handsDetected: 0,
    chordHandPresent: false,
    strumHandPresent: false,
    trackingLostWarning: false,
    isAmbiguous: false,
    fps: 0,
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // References to video element
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Low-latency engines and state stored in refs to avoid re-rendering React 60 times/sec
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const guitarSamplerRef = useRef<GuitarSampler | null>(null);
  const cameraServiceRef = useRef<CameraService | null>(null);
  const handTrackerRef = useRef<HandTracker | null>(null);
  const handAssignerRef = useRef<HandAssigner | null>(null);
  const chordSmootherRef = useRef<LandmarkSmoother | null>(null);
  const strumSmootherRef = useRef<LandmarkSmoother | null>(null);
  const gestureClassifierRef = useRef<GestureClassifier | null>(null);
  const motionAnalyzerRef = useRef<MotionAnalyzer | null>(null);
  const strumDetectorRef = useRef<StrumDetector | null>(null);

  const activeChordIdRef = useRef<string>('c-major');
  const isProcessingFrameRef = useRef<boolean>(false);
  const animFrameIdRef = useRef<number | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const settingsRef = useRef<InstrumentSettings>(settings);

  // Diagnostics / visual debugging data
  const latestHandsRef = useRef<TrackedHand[]>([]);
  const latestAssignmentRef = useRef<HandAssignment | null>(null);
  const latestMotionRef = useRef<MotionAnalysis | null>(null);
  const fpsCounterRef = useRef<{ frames: number; lastTime: number; currentFps: number }>({
    frames: 0,
    lastTime: 0,
    currentFps: 0,
  });

  const processFrameRef = useRef<() => void>(() => {});

  // Track state changes to publish to React state only when changed
  const lastPublishedTrackingStateRef = useRef<{
    handsDetected: number;
    chordHandPresent: boolean;
    strumHandPresent: boolean;
    isAmbiguous: boolean;
  }>({
    handsDetected: 0,
    chordHandPresent: false,
    strumHandPresent: false,
    isAmbiguous: false,
  });

  // Initialize persistent singletons
  useEffect(() => {
    const audioEngine = new AudioEngine((status) => {
      setAudioStatus(status);
    });
    const guitarSampler = new GuitarSampler(audioEngine);
    const cameraService = new CameraService((status, error) => {
      setCameraStatus(status);
      setCameraError(error);
    });
    const handTracker = new HandTracker();
    const handAssigner = new HandAssigner({
      chordHandRole: settingsRef.current.chordHand,
      strumHandRole: settingsRef.current.strumHand,
      mirrorVideo: settingsRef.current.mirrorVideo,
    });
    const chordSmoother = new LandmarkSmoother(settingsRef.current.landmarkSmoothingAlpha);
    const strumSmoother = new LandmarkSmoother(settingsRef.current.landmarkSmoothingAlpha);
    const gestureClassifier = new GestureClassifier({
      stabilityMs: settingsRef.current.gestureStabilityMs,
      trackingLossGraceMs: settingsRef.current.trackingLossGraceMs,
    });
    const motionAnalyzer = new MotionAnalyzer();
    const strumDetector = new StrumDetector({
      minSpeed: settingsRef.current.minStrumSpeed,
      minDisplacement: settingsRef.current.minStrumDisplacement,
      cooldownMs: settingsRef.current.strumCooldownMs,
    });

    audioEngineRef.current = audioEngine;
    guitarSamplerRef.current = guitarSampler;
    cameraServiceRef.current = cameraService;
    handTrackerRef.current = handTracker;
    handAssignerRef.current = handAssigner;
    chordSmootherRef.current = chordSmoother;
    strumSmootherRef.current = strumSmoother;
    gestureClassifierRef.current = gestureClassifier;
    motionAnalyzerRef.current = motionAnalyzer;
    strumDetectorRef.current = strumDetector;

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      cameraService.dispose();
      handTracker.dispose();
      audioEngine.dispose();
    };
  }, []);

  // Update analyzers when settings change
  useEffect(() => {
    handAssignerRef.current?.updateConfig({
      chordHandRole: settings.chordHand,
      strumHandRole: settings.strumHand,
      mirrorVideo: settings.mirrorVideo,
    });
    chordSmootherRef.current?.setAlpha(settings.landmarkSmoothingAlpha);
    strumSmootherRef.current?.setAlpha(settings.landmarkSmoothingAlpha);
    gestureClassifierRef.current?.updateConfig({
      stabilityMs: settings.gestureStabilityMs,
      trackingLossGraceMs: settings.trackingLossGraceMs,
    });
    // Scale speed and displacement thresholds using strumSensitivity (0.1 = tighter, 1.0 = lighter touch)
    const sensFactor = 1.35 - (settings.strumSensitivity - 0.1) * (0.7 / 0.9);
    strumDetectorRef.current?.updateConfig({
      minSpeed: settings.minStrumSpeed * sensFactor,
      minDisplacement: settings.minStrumDisplacement * sensFactor,
      cooldownMs: settings.strumCooldownMs,
    });
    audioEngineRef.current?.setVolume(settings.masterVolume);
    settingsRef.current = settings;
    saveSettings(settings);
  }, [settings]);

  /**
   * The core real-time processing loop running on requestAnimationFrame
   */
  const processFrame = useCallback(() => {
    if (!isPlayingRef.current) return;

    const video = videoRef.current;
    const tracker = handTrackerRef.current;
    const assigner = handAssignerRef.current;
    const chordSmoother = chordSmootherRef.current;
    const strumSmoother = strumSmootherRef.current;
    const gestureClassifier = gestureClassifierRef.current;
    const motionAnalyzer = motionAnalyzerRef.current;
    const strumDetector = strumDetectorRef.current;
    const sampler = guitarSamplerRef.current;

    const now = performance.now();

    // FPS measurement
    const fpsTracker = fpsCounterRef.current;
    fpsTracker.frames++;
    if (now - fpsTracker.lastTime >= 1000) {
      fpsTracker.currentFps = Math.round((fpsTracker.frames * 1000) / (now - fpsTracker.lastTime));
      fpsTracker.frames = 0;
      fpsTracker.lastTime = now;
      setTrackingStatus((prev) => ({ ...prev, fps: fpsTracker.currentFps }));
    }

    if (
      video &&
      video.readyState >= 2 &&
      tracker &&
      tracker.isReady() &&
      !isProcessingFrameRef.current
    ) {
      isProcessingFrameRef.current = true;

      try {
        const detectedHands = tracker.detect(video, now);
        // If null, the video frame has not changed since last inference tick.
        // Skip downstream processing to avoid resetting smoothers, detectors, or zeroing hands.
        if (detectedHands === null) {
          return;
        }

        latestHandsRef.current = detectedHands;

        if (assigner) {
          const assignment = assigner.assignHands(detectedHands);
          latestAssignmentRef.current = assignment;

          // 1. Process Chord Hand
          let chordHandLandmarks = assignment.chordHand?.landmarks ?? null;
          if (chordHandLandmarks && chordSmoother) {
            chordHandLandmarks = chordSmoother.smooth(chordHandLandmarks, now);
          } else {
            chordSmoother?.reset();
          }

          if (gestureClassifier) {
            const gestureResult = gestureClassifier.classify(chordHandLandmarks, now);
            if (gestureResult.isStable && gestureResult.fingerCount > 0) {
              const matchedChord = getChordForFingerCount(
                gestureResult.fingerCount,
                settingsRef.current.chordMappings
              );
              if (matchedChord && matchedChord.id !== activeChordIdRef.current) {
                activeChordIdRef.current = matchedChord.id;
                setActiveChord(matchedChord);
              }
            }
          }

          // 2. Process Strum Hand
          let strumHandLandmarks = assignment.strumHand?.landmarks ?? null;
          if (strumHandLandmarks && strumSmoother) {
            strumHandLandmarks = strumSmoother.smooth(strumHandLandmarks, now);
          } else {
            strumSmoother?.reset();
          }

          if (motionAnalyzer && strumDetector && sampler) {
            const motion = motionAnalyzer.update(strumHandLandmarks, now);
            latestMotionRef.current = motion;

            const strumEvent = strumDetector.processMotion(
              motion,
              activeChordIdRef.current,
              now
            );

            if (strumEvent) {
              sampler.triggerStrum(strumEvent);
              setLastStrum(strumEvent);
            }
          }

          // 3. Batch publish TrackingStatus updates only if presence state changed
          const prevPresence = lastPublishedTrackingStateRef.current;
          const chordPresent = assignment.chordHand !== null;
          const strumPresent = assignment.strumHand !== null;
          const isAmbiguous = assignment.isAmbiguous;
          const handsCount = detectedHands.length;

          if (
            prevPresence.handsDetected !== handsCount ||
            prevPresence.chordHandPresent !== chordPresent ||
            prevPresence.strumHandPresent !== strumPresent ||
            prevPresence.isAmbiguous !== isAmbiguous
          ) {
            lastPublishedTrackingStateRef.current = {
              handsDetected: handsCount,
              chordHandPresent: chordPresent,
              strumHandPresent: strumPresent,
              isAmbiguous,
            };
            setTrackingStatus((prev) => ({
              ...prev,
              handsDetected: handsCount,
              chordHandPresent: chordPresent,
              strumHandPresent: strumPresent,
              trackingLostWarning: handsCount < 2,
              isAmbiguous,
            }));
          }
        }
      } catch (err) {
        console.error('Frame loop processing error:', err);
      } finally {
        isProcessingFrameRef.current = false;
      }
    }

    if (isPlayingRef.current) {
      animFrameIdRef.current = requestAnimationFrame(() => {
        processFrameRef.current();
      });
    }
  }, []);

  useEffect(() => {
    processFrameRef.current = processFrame;
  }, [processFrame]);

  /**
   * Starts playing session: initializes AudioContext, Camera, and MediaPipe
   */
  const startInstrument = useCallback(async () => {
    if (isPlayingRef.current) return;

    // 1. Audio initialization on user interaction
    const audioInitOk = await audioEngineRef.current?.initAudio();
    if (!audioInitOk) {
      console.warn('AudioContext failed to initialize or resume.');
    }

    // 2. Initialize MediaPipe Model
    if (handTrackerRef.current && !handTrackerRef.current.isReady()) {
      try {
        await handTrackerRef.current.initialize();
      } catch (err) {
        console.error('MediaPipe initialization failed:', err);
        setCameraError('Failed to load MediaPipe hand tracking model.');
        return;
      }
    }

    // 3. Start Camera
    if (videoRef.current && cameraServiceRef.current) {
      const cameraOk = await cameraServiceRef.current.startCamera(
        videoRef.current,
        settingsRef.current.selectedCameraId || undefined
      );
      if (!cameraOk) {
        return;
      }
    }

    isPlayingRef.current = true;
    setIsPlaying(true);
    animFrameIdRef.current = requestAnimationFrame(() => {
      processFrameRef.current();
    });
  }, []);

  /**
   * Stops playing session and cleans up resources
   */
  const stopInstrument = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);

    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    cameraServiceRef.current?.stopCamera();
    audioEngineRef.current?.stopAllVoices();
    chordSmootherRef.current?.reset();
    strumSmootherRef.current?.reset();
    gestureClassifierRef.current?.reset();
    motionAnalyzerRef.current?.reset();
    strumDetectorRef.current?.reset();

    setTrackingStatus({
      handsDetected: 0,
      chordHandPresent: false,
      strumHandPresent: false,
      trackingLostWarning: false,
      isAmbiguous: false,
      fps: 0,
    });
  }, []);

  /**
   * Recalibrates tracking: resets smoother history, motion analysis,
   * strum detector, and gesture classifier states.
   */
  const recalibrate = useCallback(() => {
    chordSmootherRef.current?.reset();
    strumSmootherRef.current?.reset();
    motionAnalyzerRef.current?.reset();
    strumDetectorRef.current?.reset();
    gestureClassifierRef.current?.reset();
    fpsCounterRef.current.frames = 0;
  }, []);

  /**
   * Updates settings with persistence
   */
  const updateSettings = useCallback((partial: Partial<InstrumentSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      return next;
    });
  }, []);

  /**
   * Manual test trigger for chord
   */
  const selectChordManual = useCallback((chordId: string) => {
    const chord = getChordById(chordId);
    activeChordIdRef.current = chord.id;
    setActiveChord(chord);
  }, []);

  /**
   * Manual test trigger for strumming (helpful for accessibility / testing)
   */
  const triggerStrumManual = useCallback((direction: StrumDirection = 'down') => {
    const now = performance.now();
    const event: StrumEvent = {
      id: `manual-strum-${now}`,
      direction,
      timestamp: now,
      speed: 1.0,
      displacement: 0.1,
      confidence: 1.0,
      chordId: activeChordIdRef.current,
    };
    audioEngineRef.current?.playStrum(event);
    setLastStrum(event);
  }, []);

  /**
   * Swaps physical hand roles
   */
  const swapHandRoles = useCallback(() => {
    setSettings((prev) => {
      const newChordRole = prev.chordHand === 'Left' ? 'Right' : 'Left';
      const newStrumRole = prev.strumHand === 'Right' ? 'Left' : 'Right';
      return {
        ...prev,
        chordHand: newChordRole,
        strumHand: newStrumRole,
      };
    });
  }, []);

  return {
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
    recalibrate,
    updateSettings,
    selectChordManual,
    triggerStrumManual,
    swapHandRoles,
  };
}
