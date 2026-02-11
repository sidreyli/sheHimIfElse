// Feature: ASL Recognition — Gemini Vision API

// Components
export { default as ASLOverlay } from './components/ASLOverlay';
export { default as ASLCaptionBar } from './components/ASLCaptionBar';
export { default as ASLSettingsPanel } from './components/ASLSettingsPanel';

// Hooks — Vision pipeline (Gemini Flash)
export { useASLVisionPipeline } from './hooks/useASLVisionPipeline';

// Legacy hooks (kept for reference)
export { useHandTracking } from './hooks/useHandTracking';
export { useGestureClassifier } from './hooks/useGestureClassifier';
export { useASLPipeline } from './hooks/useASLPipeline';

// Services
export { initHandLandmarker, detectHands, destroyHandLandmarker, initAllLandmarkers, detectAll, destroyAllLandmarkers } from './services/mediapipeService';
export type { HolisticResult } from './services/mediapipeService';
export { captureFrame, captureFrameSequence, recognizeASLFromFrames } from './services/visionService';
export { loadModel, classifySequence, isModelLoaded } from './services/classifierService';
export { GestureBuffer } from './services/gestureBuffer';
export { assembleFrame, resetAssemblerCache } from './services/landmarkAssembler';

// Constants
export { ASL_LABELS, NUM_CLASSES, SEQ_LEN, NUM_LANDMARKS, NUM_FEATURES, KEPT_LANDMARKS, TO_AVG, KEPT_FLAT, TYPE_ARRAY } from './models/labelMap';
