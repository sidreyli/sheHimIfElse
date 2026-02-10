import {
  HandLandmarker,
  FilesetResolver,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision';

let handLandmarker: HandLandmarker | null = null;
let lastVideoTime = -1;

const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export async function initHandLandmarker(): Promise<HandLandmarker> {
  if (handLandmarker) return handLandmarker;

  const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  return handLandmarker;
}

export function detectHands(
  videoElement: HTMLVideoElement
): HandLandmarkerResult | null {
  if (!handLandmarker) return null;
  if (videoElement.readyState < 2) return null;

  const now = performance.now();
  if (now === lastVideoTime) return null;
  lastVideoTime = now;

  return handLandmarker.detectForVideo(videoElement, now);
}

export function destroyHandLandmarker() {
  if (handLandmarker) {
    handLandmarker.close();
    handLandmarker = null;
  }
  lastVideoTime = -1;
}
