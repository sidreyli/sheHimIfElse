import { SEQ_LEN, NUM_FEATURES } from '../models/labelMap';
import { classifySequence } from './classifierService';

interface WordPrediction {
  word: string;
  confidence: number;
  topN: { word: string; confidence: number }[];
}

/**
 * Frame accumulator for word-level ASL recognition.
 *
 * Collects landmark frames from the rAF loop. When enough frames have been
 * collected (SEQ_LEN), runs classification on the full sequence.
 *
 * Uses a sliding window approach: classifies every `strideFrames` new frames
 * rather than waiting for a full reset, giving more responsive predictions.
 */
export class GestureBuffer {
  private frames: number[][] = [];
  private confidenceThreshold: number;
  private strideFrames: number;
  private framesSinceLastClassify = 0;
  private lastWord: string | null = null;
  private lastEmitTime = 0;
  private cooldownMs = 1000; // Words need longer cooldown than letters

  constructor(confidenceThreshold = 0.6, strideFrames = 8) {
    this.confidenceThreshold = confidenceThreshold;
    this.strideFrames = strideFrames;
  }

  setConfidenceThreshold(threshold: number) {
    this.confidenceThreshold = threshold;
  }

  setWindowSize(size: number) {
    // For word-level, window size controls the stride
    this.strideFrames = Math.max(4, Math.floor(size / 2));
  }

  /**
   * Add a frame of landmarks (126 features: left hand + right hand).
   * Returns a word prediction when the buffer is ready, otherwise null.
   */
  pushFrame(
    leftHand: number[][] | null,
    rightHand: number[][] | null
  ): WordPrediction | null {
    // Build a single frame of 126 features
    const frame = new Array(NUM_FEATURES).fill(0);

    if (leftHand) {
      for (let i = 0; i < Math.min(leftHand.length, 21); i++) {
        const base = i * 3;
        frame[base] = leftHand[i][0] ?? 0;
        frame[base + 1] = leftHand[i][1] ?? 0;
        frame[base + 2] = leftHand[i][2] ?? 0;
      }
    }

    if (rightHand) {
      for (let i = 0; i < Math.min(rightHand.length, 21); i++) {
        const base = 63 + i * 3; // right hand offset
        frame[base] = rightHand[i][0] ?? 0;
        frame[base + 1] = rightHand[i][1] ?? 0;
        frame[base + 2] = rightHand[i][2] ?? 0;
      }
    }

    this.frames.push(frame);
    this.framesSinceLastClassify++;

    // Keep buffer from growing unbounded — sliding window of 2× SEQ_LEN
    if (this.frames.length > SEQ_LEN * 2) {
      this.frames = this.frames.slice(-SEQ_LEN);
    }

    // Only classify when we have enough frames and stride has elapsed
    if (this.frames.length < SEQ_LEN || this.framesSinceLastClassify < this.strideFrames) {
      return null;
    }

    this.framesSinceLastClassify = 0;

    // Classify the most recent SEQ_LEN frames
    const window = this.frames.slice(-SEQ_LEN);
    const result = classifySequence(window);

    if (!result || result.confidence < this.confidenceThreshold) {
      return null;
    }

    // Cooldown: don't emit the same word repeatedly
    const now = Date.now();
    if (result.word === this.lastWord && now - this.lastEmitTime < this.cooldownMs) {
      return null;
    }

    this.lastWord = result.word;
    this.lastEmitTime = now;

    return result;
  }

  /** Call when hands disappear from frame to reset the sequence */
  onHandsLost() {
    // Don't fully clear — keep some context for when hands reappear
    if (this.frames.length > SEQ_LEN) {
      this.frames = this.frames.slice(-Math.floor(SEQ_LEN / 2));
    }
    this.framesSinceLastClassify = 0;
  }

  clear() {
    this.frames = [];
    this.framesSinceLastClassify = 0;
    this.lastWord = null;
    this.lastEmitTime = 0;
  }

  get frameCount(): number {
    return this.frames.length;
  }

  get isBufferReady(): boolean {
    return this.frames.length >= SEQ_LEN;
  }
}
