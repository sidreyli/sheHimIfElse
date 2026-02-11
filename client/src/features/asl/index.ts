// Feature: ASL Recognition — Gemini Vision API

// Components
export { default as ASLOverlay } from './components/ASLOverlay';
export { default as ASLCaptionBar } from './components/ASLCaptionBar';
export { default as ASLSettingsPanel } from './components/ASLSettingsPanel';

// Hooks
export { useASLVisionPipeline } from './hooks/useASLVisionPipeline';

// Services
export { initAllLandmarkers, detectAll, destroyAllLandmarkers } from './services/mediapipeService';
export type { HolisticResult } from './services/mediapipeService';
export { captureFrame, captureFrameSequence, recognizeASLFromFrames } from './services/visionService';

// Legacy ONNX pipeline moved to ./_legacyML/
