# ASL Recognition Module — Dev 2 Guide

## Your Files
```
features/asl/
├── components/
│   ├── ASLOverlay.tsx         # Canvas overlay drawing hand landmarks
│   ├── ASLCaptionBar.tsx      # Shows recognized sign text (aria-live)
│   └── ASLSettingsPanel.tsx   # Confidence threshold slider, on/off toggle
├── hooks/
│   ├── useHandTracking.ts     # MediaPipe hand landmark detection per frame
│   ├── useGestureClassifier.ts # Feed landmarks into TFJS model
│   └── useASLPipeline.ts      # Orchestrates: frame -> landmarks -> classify -> emit
├── services/
│   ├── mediapipeService.ts    # Initialize HandLandmarker from @mediapipe/tasks-vision
│   ├── classifierService.ts   # Load & run TFJS model from /public/models/
│   └── gestureBuffer.ts       # Temporal smoothing (majority vote over N frames)
├── models/
│   └── labelMap.ts            # Model output index -> ASL letter mapping
└── index.ts
```

## Also Owned: `ml/` (Python training pipeline)

## What to Build

### Phase 1: Hand Tracking + Landmark Drawing
1. **mediapipeService.ts** — Initialize `HandLandmarker` from `@mediapipe/tasks-vision`. Export an async `detectHands(videoElement)` that returns `HandLandmarkerResult`.
2. **useHandTracking.ts** — Hook that takes a `<video>` element ref, runs `detectHands()` in a `requestAnimationFrame` loop, returns `{ landmarks, isTracking }`.
3. **ASLOverlay.tsx** — `<canvas>` positioned absolutely over the video tile. Draws hand landmarks and connections using Canvas 2D API. Takes `landmarks` prop.
4. Test with your webcam — you should see green dots on your hand.

### Phase 2: Classification + Event Emission
1. **classifierService.ts** — Load the TFJS model from `/models/asl_model.json`. Export `classify(landmarks: number[][])` -> `{ letter, confidence }`.
2. **gestureBuffer.ts** — Accumulate last 5 predictions, emit the majority prediction only when confidence > threshold. This prevents flickering.
3. **useASLPipeline.ts** — Combines tracking + classification. When a stable prediction is made, emit:
   ```ts
   eventBus.emit('asl:recognized', { letter, confidence, landmarks, timestamp });
   ```
4. **ASLCaptionBar.tsx** — Subscribe to `asl:recognized`, display the running text. Use `aria-live="polite"` so screen readers announce new signs.

### Phase 2 Integration
- Read video elements from `RoomContext.videoRefs` to run ASL on any participant (not just local).
- The `asl:recognized` event is consumed by Dev 3 (TTS) and Dev 4 (UnifiedTranscript).

## Libraries
- `@mediapipe/tasks-vision` — Hand landmark detection (runs in browser via WASM)
- `@tensorflow/tfjs` — Run the custom ASL classifier model

## Events You Emit
```ts
eventBus.emit('asl:recognized', {
  letter: 'A',
  confidence: 0.95,
  landmarks: [...],
  timestamp: Date.now()
});
```

## Events You Consume
None — ASL module reads video refs directly from RoomContext.

## ML Pipeline (ml/ folder)
1. `scripts/collect_landmarks.py` — Use MediaPipe Python to extract hand landmarks from ASL dataset images, save as CSV.
2. `scripts/train_model.py` — Train a simple Dense/LSTM classifier on landmark CSVs.
3. `scripts/convert_to_tfjs.py` — Convert SavedModel to TFJS format, copy to `client/public/models/`.
4. Notebooks in `ml/notebooks/` for experimentation.

## Accessibility
- `ASLOverlay` canvas is `aria-hidden="true"` (decorative)
- `ASLCaptionBar` uses `aria-live="polite"` and `role="status"`
- Settings panel controls need proper labels
