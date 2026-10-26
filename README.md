# AirChord

> **Production-Quality Browser-Based Virtual Guitar Controlled by Real-Time Computer Vision**

AirChord transforms a standard desktop or laptop webcam into a hands-free virtual guitar controller. One hand selects guitar chords using intuitive finger gestures, while the other hand performs air-strumming movements through the air. A low-latency Web Audio API engine produces rich, playable acoustic guitar chord audio in real time.

---

## Key Features

- **Real-Time Dual-Hand Tracking**: Uses Google MediaPipe Hand Landmarker to track 21 landmarks per hand simultaneously at 30+ FPS.
- **Orientation-Invariant Chord Recognition**: Geometric finger extension analysis (not simple vertical thresholds) tolerant of tilted hands, hand size variations, and mirrored perspectives.
- **Continuous Gesture Hysteresis**: 140ms stability threshold prevents chord flickering; 800ms tracking-loss grace period maintains chord integrity during momentary hand occlusions.
- **Air-Strum Motion Engine**: Tracks vertical wrist velocity and displacement. Supports distinct downstrokes and upstrokes with anti-tremor filtering, 120ms cooldown, and state re-arming (one physical stroke = one clean strum).
- **Acoustic Guitar Sound Engine**: Web Audio API sampler loading real acoustic chord samples (downstroke & upstroke variants) with an in-engine physical Karplus-Strong string synthesis fallback.
- **100% Client-Side Privacy**: Zero camera footage or landmark coordinates leave your device. All neural inference and audio generation execute locally in your browser.
- **Instrument HUD & Customization**: Fretboard visualization, customizable chord-to-gesture mappings, left-hand / right-hand swapping, sensitivity sliders, and optional diagnostics overlay.

---

## Default Chord Gesture Mappings

| Finger Gesture | Chord | Frets (Low E to High E) | Voicing Description |
|---|---|---|---|
| **1 Finger** (Index Raised) | **C Major** | `x 3 2 0 1 0` | Open C chord with root on 5th string |
| **2 Fingers** (Victory / Peace) | **G Major** | `3 2 0 0 0 3` | Resonant full 6-string acoustic voicing |
| **3 Fingers** (Three Up) | **D Major** | `x x 0 2 3 2` | Crisp voicing with open 4th string root |
| **4 Fingers** (Flat Four) | **E Minor** | `0 2 2 0 0 0` | Deep open minor chord with low 6th-string root |
| **5 Fingers** (Open Hand) | **A Minor** | `x 0 2 2 1 0` | Warm minor voicing with open 5th string root |

*Note: Gestures can be reassigned to any chord in the Settings tab.*

---

## Architecture & Technology Stack

- **Framework**: React 19 + Vite 8 (TypeScript with strict type checking)
- **Computer Vision**: `@mediapipe/tasks-vision` (HandLandmarker in VIDEO running mode)
- **Styling**: Tailwind CSS v4 (Custom dark instrument palette: `#0B0D0F`, `#14171B`, `#C8F169` accent)
- **Icons**: Lucide React
- **Audio**: Web Audio API (`AudioContext`, `AudioBuffer`, `GainNode`, polyphony pool)
- **State & Persistence**: React Hooks + Refs for high-frequency tracking, `localStorage` for user preferences
- **Testing**: Vitest + React Testing Library + `@testing-library/jest-dom`

### Module Layout

```
src/
├── audio/
│   ├── AudioEngine.ts        # Web Audio API lifecycle, polyphony, gain smoothing
│   ├── GuitarSampler.ts      # Sample buffer lookup & strum triggering
│   └── chordRegistry.ts      # Chord definitions, frets, default mappings
├── camera/
│   └── CameraService.ts      # getUserMedia lifecycle, device enumeration, error recovery
├── components/
│   ├── debug/
│   │   └── DebugOverlay.tsx  # 21-point hand skeleton canvas & diagnostics HUD
│   ├── learn/
│   │   └── LearnView.tsx     # Gesture reference guide, strum tutorial & practice trainer
│   ├── navigation/
│   │   └── TopNav.tsx        # Navigation tabs, volume slider, debug toggle
│   ├── play/
│   │   ├── ChordFretDiagram.tsx # SVG acoustic guitar fretboard diagram
│   │   └── PlayView.tsx      # Main camera workspace, chord billboard, strum animation
│   └── settings/
│       └── SettingsView.tsx  # Gesture remapping, sensitivity sliders, device select
├── hooks/
│   └── useAirGuitar.ts       # Orchestrator connecting CV, gestures, strumming, and audio
├── storage/
│   └── settingsStorage.ts    # Type-safe LocalStorage persistence and defaults
├── test/
│   ├── fixtures/
│   │   └── handLandmarks.ts  # Deterministic 21-point landmark fixtures
│   ├── audioEngine.test.ts   # AudioEngine & GuitarSampler unit tests
│   ├── chordRecognition.test.ts # GestureClassifier & hysteresis unit tests
│   ├── settingsStorage.test.ts # Storage validation & clamping unit tests
│   ├── strumming.test.ts     # MotionAnalyzer & StrumDetector unit tests
│   └── ui.test.tsx           # React component integration & accessibility tests
└── vision/
    ├── GestureClassifier.ts  # Scale- and orientation-invariant finger state classifier
    ├── HandAssignment.ts     # Spatial role assignment & mirror compensation
    ├── HandTracker.ts        # MediaPipe HandLandmarker wrapper with frame deduplication
    ├── LandmarkSmoother.ts   # Exponential Moving Average (EMA) coordinate smoothing
    ├── MotionAnalyzer.ts     # Wrist velocity & vertical displacement tracking
    └── StrumDetector.ts      # Downstroke/upstroke state machine with re-arming
```

---

## Getting Started

### Prerequisites

- Node.js 20 or higher
- Modern desktop browser supporting Web Audio API and WebRTC webcam access (Chrome, Edge, Firefox, Safari)
- Webcam (built-in or USB external)

### Installation

```bash
# Clone repository
git clone https://github.com/AirChord/AirChord.git
cd AirChord

# Install dependencies
npm install

# (Optional) Regenerate acoustic guitar audio samples
npm run generate:audio
```

### Development Server

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### Production Build & Preview

```bash
# Compile production bundle
npm run build

# Preview production build locally
npm run preview
```

### Verification & Testing

```bash
# Run strict TypeScript typechecking
npm run typecheck

# Run linter
npm run lint

# Run all automated unit and integration tests
npm run test
```

---

## How to Play

1. **Launch Instrument**: Click **Start AirChord** on the Play screen. When prompted, allow browser camera permission.
2. **Position Your Hands**: Sit approximately 0.5–1 meter away from the camera so both hands are clearly visible in the frame.
   - **Left Hand** (Default Chord Hand): Keep visible on the left side of the screen.
   - **Right Hand** (Default Strum Hand): Position on the right side of the screen.
3. **Form a Chord**:
   - Raise 1 finger (Index) for **C Major**.
   - Raise 2 fingers (Victory sign) for **G Major**.
   - Raise 3 fingers for **D Major**.
   - Raise 4 fingers for **E Minor**.
   - Open 5 fingers for **A Minor**.
   The billboard updates with the active chord and guitar fretboard diagram.
4. **Air-Strum**:
   - Move your right hand briskly downward through the air for a **Downstroke**.
   - Sweep upward for an **Upstroke**.
   - The corresponding acoustic guitar chord plays with natural ring-out.
5. **Left-Handed Players**: Click **Swap Roles** in the header or in Settings to swap chord and strumming hands.

---

## Keyboard Accessibility & Shortcuts

- <kbd>Space</kbd>: Start / Stop instrument session
- <kbd>1</kbd> – <kbd>5</kbd>: Switch active chord manually (C, G, D, Em, Am)
- <kbd>↓</kbd>: Test downstroke
- <kbd>↑</kbd>: Test upstroke
- <kbd>D</kbd>: Toggle diagnostics overlay (displays 21-point skeleton, FPS, and velocity meter)

---

## Troubleshooting

- **Camera permission denied**: Ensure your browser allows camera access. In Chrome/Edge, click the tune/lock icon in the address bar and set Camera to "Allow", then click "Retry Camera".
- **Tracking feels jittery**: Ensure your room has adequate lighting. Avoid direct, blinding backlights behind you.
- **Accidental double strums**: Increase the **Strum Cooldown** slider in the Settings tab (e.g. from 120ms to 160ms).
- **Strumming requires too much effort**: Lower the **Min Strum Velocity** slider in Settings.
- **Role swap confusion**: AirChord assumes standard selfie mirroring (`scaleX(-1)`). If your camera feed is unmirrored, toggle "Webcam Preview Mirror" in Settings.

---

## Attribution & Licensing

- **MediaPipe Hand Landmarker**: Powered by Google MediaPipe Tasks Vision (`@mediapipe/tasks-vision`, Apache 2.0 License).
- **Guitar Audio Samples**: High-definition physically modeled acoustic guitar samples synthesized via Karplus-Strong string algorithm with body resonance filtering. Assets generated by `scripts/generate-guitar-samples.js`.
- **Icons**: Lucide React (ISC License).

---

## License

MIT License. Designed and engineered for high-performance interactive musical computing.
