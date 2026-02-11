import * as ort from 'onnxruntime-web';
import { ASL_LABELS, SEQ_LEN, NUM_LANDMARKS } from '../models/labelMap';

let session: ort.InferenceSession | null = null;
let loadPromise: Promise<ort.InferenceSession> | null = null;

ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.1/dist/';

export async function loadModel(): Promise<ort.InferenceSession> {
  if (session) return session;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const s = await ort.InferenceSession.create('/models/asl_deberta.onnx', {
        executionProviders: ['wasm'],
      });
      session = s;
      return s;
    } catch (err) {
      console.error('[ASL Classifier] Model load failed:', err);
      loadPromise = null;
      throw err;
    }
  })();

  return loadPromise;
}

function softmax(logits: Float32Array): Float32Array {
  const maxVal = Math.max(...logits);
  const exps = logits.map((v) => Math.exp(v - maxVal));
  const sumExps = exps.reduce((a, b) => a + b, 0);
  return new Float32Array(exps.map((e) => e / sumExps));
}

/**
 * Classify a pre-built tensor of shape [SEQ_LEN, 5, 100] (already normalized).
 * Input is a flat Float32Array of length SEQ_LEN * 5 * NUM_LANDMARKS.
 */
export async function classifySequence(
  tensor: Float32Array
): Promise<{ word: string; confidence: number; topN: { word: string; confidence: number }[] } | null> {
  if (!session) {
    return null;
  }

  const expectedLen = SEQ_LEN * 5 * NUM_LANDMARKS;
  if (tensor.length !== expectedLen) {
    return null;
  }

  const inputName = session.inputNames[0];
  const inputTensor = new ort.Tensor('float32', tensor, [SEQ_LEN, 5, NUM_LANDMARKS]);
  const results = await session.run({ [inputName]: inputTensor });

  const outputName = session.outputNames[0];
  const outputData = results[outputName].data as Float32Array;

  const scores = softmax(outputData);

  const indexed = Array.from(scores).map((score, i) => ({ i, score }));
  indexed.sort((a, b) => b.score - a.score);

  const topN = indexed.slice(0, 5).map(({ i, score }) => ({
    word: ASL_LABELS[i] ?? 'unknown',
    confidence: score,
  }));

  const best = indexed[0];
  console.log('[ASL] top-5:', topN.map(t => `${t.word}:${t.confidence.toFixed(3)}`).join(' '));
  return {
    word: ASL_LABELS[best.i] ?? 'unknown',
    confidence: best.score,
    topN,
  };
}

export function isModelLoaded(): boolean {
  return session !== null;
}

export function disposeModel() {
  if (session) session = null;
  loadPromise = null;
}
