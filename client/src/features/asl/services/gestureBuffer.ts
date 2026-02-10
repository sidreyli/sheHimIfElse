import { SEQ_LEN, NUM_LANDMARKS } from '../models/labelMap';
import { classifySequence } from './classifierService';

interface WordPrediction {
  word: string;
  confidence: number;
  topN: { word: string; confidence: number }[];
}

/** Number of recent classifications to keep for majority voting */
const VOTE_WINDOW = 8;
/** Minimum fraction of votes for the top word to be emitted */
const VOTE_QUORUM = 0.5;
/** Minimum average confidence of the top word across its votes */
const MIN_AVG_CONFIDENCE = 0.03;

/**
 * Frame accumulator for the DeBERTa ASL model.
 *
 * Accepts assembled 100-landmark frames (Float32Array of [5, 100]).
 * Buffers up to SEQ_LEN (25) frames, normalizes, classifies, and applies
 * temporal majority-voting to produce stable predictions.
 */
export class GestureBuffer {
  private frames: Float32Array[] = [];
  private confidenceThreshold: number;
  private strideFrames: number;
  private framesSinceLastClassify = 0;
  private lastWord: string | null = null;
  private lastEmitTime = 0;
  private cooldownMs = 800;

  /** Rolling window of recent classification results for majority voting */
  private recentVotes: { word: string; confidence: number }[] = [];

  constructor(confidenceThreshold = 0.04, strideFrames = 4) {
    this.confidenceThreshold = confidenceThreshold;
    this.strideFrames = strideFrames;
  }

  setConfidenceThreshold(threshold: number) {
    this.confidenceThreshold = threshold;
  }

  setWindowSize(size: number) {
    this.strideFrames = Math.max(2, Math.floor(size / 3));
  }

  /**
   * Add an assembled frame (Float32Array [5, 100]).
   * Returns a prediction when majority voting produces a stable result.
   */
  async pushFrame(frame: Float32Array): Promise<WordPrediction | null> {
    this.frames.push(frame);
    this.framesSinceLastClassify++;

    if (this.frames.length > SEQ_LEN) {
      this.frames = this.frames.slice(-SEQ_LEN);
    }

    if (this.frames.length < SEQ_LEN || this.framesSinceLastClassify < this.strideFrames) {
      return null;
    }

    this.framesSinceLastClassify = 0;

    // Select SEQ_LEN frames
    const window = this.frames.slice(-SEQ_LEN);
    const tensor = this.buildTensor(window);
    const result = await classifySequence(tensor);

    if (!result) return null;

    // Add to vote window
    this.recentVotes.push({ word: result.word, confidence: result.confidence });
    if (this.recentVotes.length > VOTE_WINDOW) {
      this.recentVotes.shift();
    }

    // Need enough votes before deciding
    if (this.recentVotes.length < Math.ceil(VOTE_WINDOW * VOTE_QUORUM)) return null;

    // Tally votes: count occurrences and average confidence per word
    const tally = new Map<string, { count: number; totalConf: number }>();
    for (const v of this.recentVotes) {
      const entry = tally.get(v.word) || { count: 0, totalConf: 0 };
      entry.count++;
      entry.totalConf += v.confidence;
      tally.set(v.word, entry);
    }

    // Find the word with the most votes
    let bestWord = '';
    let bestCount = 0;
    let bestAvgConf = 0;
    for (const [word, { count, totalConf }] of tally) {
      if (count > bestCount || (count === bestCount && totalConf / count > bestAvgConf)) {
        bestWord = word;
        bestCount = count;
        bestAvgConf = totalConf / count;
      }
    }

    // Check quorum and minimum confidence
    const quorumMet = bestCount >= Math.ceil(this.recentVotes.length * VOTE_QUORUM);
    if (!quorumMet || bestAvgConf < MIN_AVG_CONFIDENCE) return null;

    // Cooldown: don't re-emit the same word too quickly
    const now = Date.now();
    if (bestWord === this.lastWord && now - this.lastEmitTime < this.cooldownMs) return null;

    this.lastWord = bestWord;
    this.lastEmitTime = now;
    // Clear votes after emitting to avoid repeating
    this.recentVotes = [];

    return {
      word: bestWord,
      confidence: bestAvgConf,
      topN: result.topN,
    };
  }

  /**
   * Build the model input tensor: [SEQ_LEN, 5, 100] as flat Float32Array.
   * Applies per-coordinate normalization (separate mean/std for x, y, z) matching
   * TheoViel's preprocessing, then NaN→0.
   */
  private buildTensor(frames: Float32Array[]): Float32Array {
    const n = frames.length; // should == SEQ_LEN
    const channelSize = NUM_LANDMARKS; // 100
    const frameSize = 5 * channelSize; // 500
    const totalSize = n * frameSize;
    const tensor = new Float32Array(totalSize);

    // Copy frames into tensor
    for (let f = 0; f < n; f++) {
      tensor.set(frames[f], f * frameSize);
    }

    // Per-coordinate normalization: separate mean/std for x (ch1), y (ch2), z (ch3)
    for (let ch = 1; ch <= 3; ch++) {
      let sum = 0, sumSq = 0, count = 0;
      for (let f = 0; f < n; f++) {
        const base = f * frameSize + ch * channelSize;
        for (let lm = 0; lm < channelSize; lm++) {
          const v = tensor[base + lm];
          if (!isNaN(v)) {
            sum += v;
            sumSq += v * v;
            count++;
          }
        }
      }

      const mean = count > 0 ? sum / count : 0;
      const variance = count > 1 ? (sumSq / count - mean * mean) : 1;
      const std = Math.sqrt(Math.max(variance, 1e-8));

      for (let f = 0; f < n; f++) {
        const base = f * frameSize + ch * channelSize;
        for (let lm = 0; lm < channelSize; lm++) {
          const idx = base + lm;
          const v = tensor[idx];
          tensor[idx] = isNaN(v) ? 0 : (v - mean) / std;
        }
      }
    }

    return tensor;
  }

  /** Push a frame without triggering classification (used while inference is in progress). */
  pushFrameOnly(frame: Float32Array) {
    this.frames.push(frame);
    this.framesSinceLastClassify++;
    if (this.frames.length > SEQ_LEN) {
      this.frames = this.frames.slice(-SEQ_LEN);
    }
  }

  onHandsLost() {
    this.frames = [];
    this.framesSinceLastClassify = 0;
    this.recentVotes = [];
  }

  clear() {
    this.frames = [];
    this.framesSinceLastClassify = 0;
    this.lastWord = null;
    this.lastEmitTime = 0;
    this.recentVotes = [];
  }

  get frameCount(): number {
    return this.frames.length;
  }

  get isBufferReady(): boolean {
    return this.frames.length >= SEQ_LEN;
  }
}
