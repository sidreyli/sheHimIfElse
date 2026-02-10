import * as tf from '@tensorflow/tfjs';
import { ASL_LABELS, SEQ_LEN, NUM_FEATURES } from '../models/labelMap';

let model: tf.LayersModel | null = null;
let isLoading = false;

export async function loadModel(): Promise<tf.LayersModel> {
  if (model) return model;
  if (isLoading) {
    while (isLoading) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return model!;
  }

  isLoading = true;
  try {
    model = await tf.loadLayersModel('/models/asl_model.json');
    return model;
  } finally {
    isLoading = false;
  }
}

/**
 * Classify a sequence of hand landmark frames into an ASL word.
 *
 * Input: array of frames, each frame is 126 features
 *   (21 left-hand landmarks × 3 + 21 right-hand landmarks × 3)
 *
 * The sequence is padded/truncated to SEQ_LEN (32) frames internally.
 */
export function classifySequence(
  frames: number[][]
): { word: string; confidence: number; topN: { word: string; confidence: number }[] } | null {
  if (!model) return null;
  if (frames.length === 0) return null;

  // Pad or truncate to SEQ_LEN
  let sequence: number[][];
  if (frames.length >= SEQ_LEN) {
    // Uniformly sample SEQ_LEN frames
    const indices: number[] = [];
    for (let i = 0; i < SEQ_LEN; i++) {
      indices.push(Math.round((i * (frames.length - 1)) / (SEQ_LEN - 1)));
    }
    sequence = indices.map((idx) => frames[idx]);
  } else {
    // Pad with zeros
    sequence = [
      ...frames,
      ...Array.from({ length: SEQ_LEN - frames.length }, () =>
        new Array(NUM_FEATURES).fill(0)
      ),
    ];
  }

  // Verify dimensions
  if (sequence.length !== SEQ_LEN || sequence[0].length !== NUM_FEATURES) {
    return null;
  }

  const input = tf.tensor3d([sequence], [1, SEQ_LEN, NUM_FEATURES]);
  const prediction = model.predict(input) as tf.Tensor;
  const scores = prediction.dataSync() as Float32Array;

  input.dispose();
  prediction.dispose();

  // Find top-5 predictions
  const indexed = Array.from(scores).map((score, i) => ({ i, score }));
  indexed.sort((a, b) => b.score - a.score);

  const topN = indexed.slice(0, 5).map(({ i, score }) => ({
    word: ASL_LABELS[i] ?? 'unknown',
    confidence: score,
  }));

  const best = indexed[0];
  return {
    word: ASL_LABELS[best.i] ?? 'unknown',
    confidence: best.score,
    topN,
  };
}

/** Legacy single-frame classify — kept for backward compatibility */
export function classify(
  landmarks: number[][]
): { letter: string; confidence: number } | null {
  // For single-frame, just wrap in a 1-frame sequence
  const flat = landmarks.flatMap(([x, y, z]) => [x, y, z]);

  // Single hand = 63 features, both hands = 126 features
  let frame: number[];
  if (flat.length === 63) {
    // Only one hand — pad the other with zeros
    frame = [...flat, ...new Array(63).fill(0)];
  } else if (flat.length === 126) {
    frame = flat;
  } else {
    return null;
  }

  const result = classifySequence([frame]);
  if (!result) return null;
  return { letter: result.word, confidence: result.confidence };
}

export function isModelLoaded(): boolean {
  return model !== null;
}

export function disposeModel() {
  if (model) {
    model.dispose();
    model = null;
  }
}
