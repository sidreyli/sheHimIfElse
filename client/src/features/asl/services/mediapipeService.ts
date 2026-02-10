import {
  HandLandmarker,
  FaceLandmarker,
  PoseLandmarker,
  FilesetResolver,
  type HandLandmarkerResult,
  type FaceLandmarkerResult,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';

let handLandmarker: HandLandmarker | null = null;
let faceLandmarker: FaceLandmarker | null = null;
let poseLandmarker: PoseLandmarker | null = null;
let lastVideoTime = -1;
let frameCount = 0;

const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export async function initHandLandmarker(): Promise<HandLandmarker> {
  if (handLandmarker) return handLandmarker;
  const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  return handLandmarker;
}

export async function initFaceLandmarker(): Promise<FaceLandmarker> {
  if (faceLandmarker) return faceLandmarker;
  const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    outputFaceBlendshapes: false,
    numFaces: 1,
  });
  return faceLandmarker;
}

export async function initPoseLandmarker(): Promise<PoseLandmarker> {
  if (poseLandmarker) return poseLandmarker;
  const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numPoses: 1,
  });
  return poseLandmarker;
}

export async function initAllLandmarkers() {
  await Promise.all([initHandLandmarker(), initFaceLandmarker(), initPoseLandmarker()]);
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

export interface HolisticResult {
  hands: HandLandmarkerResult | null;
  face: FaceLandmarkerResult | null;
  pose: PoseLandmarkerResult | null;
}

/**
 * Run all three landmarkers. Face & pose run at half frequency to save compute.
 */
export function detectAll(videoElement: HTMLVideoElement): HolisticResult | null {
  if (!handLandmarker) return null;
  if (videoElement.readyState < 2) return null;

  const now = performance.now();
  if (now === lastVideoTime) return null;
  lastVideoTime = now;
  frameCount++;

  const hands = handLandmarker.detectForVideo(videoElement, now);

  // Face and pose run every other frame
  let face: FaceLandmarkerResult | null = null;
  let pose: PoseLandmarkerResult | null = null;
  if (frameCount % 2 === 0) {
    if (faceLandmarker) face = faceLandmarker.detectForVideo(videoElement, now);
    if (poseLandmarker) pose = poseLandmarker.detectForVideo(videoElement, now);
  }

  return { hands, face, pose };
}

export function destroyHandLandmarker() {
  if (handLandmarker) { handLandmarker.close(); handLandmarker = null; }
  lastVideoTime = -1;
}

export function destroyAllLandmarkers() {
  if (handLandmarker) { handLandmarker.close(); handLandmarker = null; }
  if (faceLandmarker) { faceLandmarker.close(); faceLandmarker = null; }
  if (poseLandmarker) { poseLandmarker.close(); poseLandmarker = null; }
  lastVideoTime = -1;
  frameCount = 0;
}
