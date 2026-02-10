/**
 * Assembles raw MediaPipe Hand/Face/Pose landmarks into the 100-landmark
 * tensor format expected by the DeBERTa ASL model.
 *
 * MediaPipe holistic space: 543 total landmarks
 *   pose:       0–32   (33 landmarks)
 *   face:       0–467  → holistic offset by 0 (FaceLandmarker returns 478 but
 *               the Kaggle data uses holistic indices where face mesh starts at 0)
 *   left hand:  468–488 (= HandLandmarker landmarks for left hand)
 *   right hand: 522–542 (= HandLandmarker landmarks for right hand)
 *   arms/body:  500–511 (= PoseLandmarker indices 11-22 mapped to holistic)
 *
 * Output per frame: Float32Array of length 500 (5 channels × 100 landmarks)
 *   Channel layout: [type, x, y, z, landmark_id] for each landmark
 */

import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { HolisticResult } from './mediapipeService';
import { KEPT_LANDMARKS, TO_AVG, TYPE_ARRAY, NUM_LANDMARKS } from '../models/labelMap';

/** Map from holistic arm indices (500-511) to PoseLandmarker landmark indices */
const POSE_ARM_MAP: Record<number, number> = {
  500: 11, 501: 12, 502: 13, 503: 14, 504: 15, 505: 16,
  506: 17, 507: 18, 508: 19, 509: 20, 510: 21, 511: 22,
};

/** Cached face/pose results for half-frequency frames */
let lastFace: NormalizedLandmark[] | null = null;
let lastPose: NormalizedLandmark[] | null = null;

/**
 * Build a lookup table: holistic index → {x, y, z} from the raw landmarker results.
 * Only populates entries that we actually need (KEPT_LANDMARKS + TO_AVG indices).
 */
function buildHolisticMap(
  result: HolisticResult
): Map<number, { x: number; y: number; z: number }> {
  const map = new Map<number, { x: number; y: number; z: number }>();

  // Hands: HandLandmarker returns up to 2 hands with handedness labels
  if (result.hands && result.hands.landmarks.length > 0) {
    for (let h = 0; h < result.hands.landmarks.length; h++) {
      const hand = result.hands.landmarks[h];
      const label = result.hands.handednesses?.[h]?.[0]?.categoryName;
      // MediaPipe mirrors: "Right" label = user's left hand
      const isLeft = label === 'Right';
      const baseIdx = isLeft ? 468 : 522;
      for (let i = 0; i < Math.min(hand.length, 21); i++) {
        const l = hand[i];
        map.set(baseIdx + i, { x: l.x, y: l.y, z: l.z });
      }
    }
  }

  // Face: cache across half-frequency frames
  if (result.face && result.face.faceLandmarks.length > 0) {
    lastFace = result.face.faceLandmarks[0];
  }
  if (lastFace) {
    // Cap at 468: indices 468-477 are iris landmarks that would overwrite left-hand entries
    const faceCount = Math.min(lastFace.length, 468);
    for (let i = 0; i < faceCount; i++) {
      const l = lastFace[i];
      map.set(i, { x: l.x, y: l.y, z: l.z });
    }
  }

  // Pose: cache across half-frequency frames
  if (result.pose && result.pose.landmarks.length > 0) {
    lastPose = result.pose.landmarks[0];
  }
  if (lastPose) {
    // Pose landmarks 0-32 map to holistic 0-32 (for silhouette picks)
    for (let i = 0; i < lastPose.length; i++) {
      const l = lastPose[i];
      // Pose index i → holistic index i (overlap with face is fine; face takes priority for shared indices)
      if (!map.has(i)) {
        map.set(i, { x: l.x, y: l.y, z: l.z });
      }
    }
    // Arms: holistic 500-511 → pose indices via POSE_ARM_MAP
    for (const [holisticIdx, poseIdx] of Object.entries(POSE_ARM_MAP)) {
      const idx = Number(holisticIdx);
      const pl = lastPose[poseIdx];
      if (pl) map.set(idx, { x: pl.x, y: pl.y, z: pl.z });
    }
    // Cheeks: holistic 205, 425 → approximate from face mesh if available, else from pose
    // Face mesh indices 205 and 425 map directly if face data is present
  }

  return map;
}

/**
 * Assemble one frame: returns [5, 100] as a flat Float32Array of length 500.
 * Layout per landmark i: [type, x, y, z, landmark_id] at offsets [i, 100+i, 200+i, 300+i, 400+i].
 * This matches the model's input format: x[:, channel, landmark].
 *
 * Returns null if no hand landmarks detected (skip frame).
 */
export function assembleFrame(result: HolisticResult): Float32Array | null {
  if (!result.hands || result.hands.landmarks.length === 0) return null;

  const map = buildHolisticMap(result);
  const frame = new Float32Array(5 * NUM_LANDMARKS); // [5, 100] flattened

  let offset = 0;

  // 1. Gather 95 kept landmarks
  for (const group of KEPT_LANDMARKS) {
    for (const holisticIdx of group) {
      const pt = map.get(holisticIdx);
      const lmIdx = offset;
      // Channel 0: type
      frame[lmIdx] = TYPE_ARRAY[offset];
      // Channel 1: x
      frame[NUM_LANDMARKS + lmIdx] = pt ? pt.x : NaN;
      // Channel 2: y
      frame[2 * NUM_LANDMARKS + lmIdx] = pt ? pt.y : NaN;
      // Channel 3: z
      frame[3 * NUM_LANDMARKS + lmIdx] = pt ? pt.z : NaN;
      // Channel 4: landmark_id (1-indexed)
      frame[4 * NUM_LANDMARKS + lmIdx] = offset + 1;
      offset++;
    }
  }

  // 2. Compute 5 averaged virtual landmarks
  for (const avgGroup of TO_AVG) {
    let sumX = 0, sumY = 0, sumZ = 0, count = 0;
    for (const idx of avgGroup) {
      const pt = map.get(idx);
      if (pt) {
        sumX += pt.x;
        sumY += pt.y;
        sumZ += pt.z;
        count++;
      }
    }
    const lmIdx = offset;
    frame[lmIdx] = TYPE_ARRAY[offset];
    frame[NUM_LANDMARKS + lmIdx] = count > 0 ? sumX / count : NaN;
    frame[2 * NUM_LANDMARKS + lmIdx] = count > 0 ? sumY / count : NaN;
    frame[3 * NUM_LANDMARKS + lmIdx] = count > 0 ? sumZ / count : NaN;
    frame[4 * NUM_LANDMARKS + lmIdx] = offset + 1;
    offset++;
  }

  return frame;
}

export function resetAssemblerCache() {
  lastFace = null;
  lastPose = null;
}
