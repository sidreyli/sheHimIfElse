import { API_BASE } from '../../../utils/constants';
import type { SignLanguage } from '../../../types/asl';

/**
 * Captures a JPEG frame from a video element as a base64 string (no data URI prefix).
 */
export function captureFrame(video: HTMLVideoElement, quality = 0.7): string | null {
  if (video.readyState < 2 || video.videoWidth === 0) return null;

  const canvas = document.createElement('canvas');
  // Downscale to 480p max to keep payload small
  const scale = Math.min(1, 480 / video.videoHeight);
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Try JPEG first, fall back to PNG
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  // Some browsers ignore JPEG and return PNG — detect & handle
  if (!dataUrl.startsWith('data:image/jpeg')) {
    dataUrl = canvas.toDataURL('image/png');
  }

  // Strip the data URI prefix
  const base64 = dataUrl.split(',')[1];
  if (!base64 || base64.length < 100) return null; // too small = invalid

  return base64;
}

/**
 * Capture multiple frames from a video element over a time period.
 */
export async function captureFrameSequence(
  video: HTMLVideoElement,
  count = 3,
  intervalMs = 500,
): Promise<string[]> {
  const frames: string[] = [];

  for (let i = 0; i < count; i++) {
    const frame = captureFrame(video);
    if (frame) frames.push(frame);
    if (i < count - 1) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  return frames;
}

export interface VisionRecognitionResult {
  sign: string;
  confidence: number;
}

/** Compact landmark snapshot for a single frame */
export interface LandmarkSnapshot {
  hands: { x: number; y: number; z: number }[][];       // per-hand landmarks
  handedness: string[];                                   // 'Left' | 'Right' per hand
  pose?: { x: number; y: number; z: number }[];          // upper body landmarks
}

/**
 * Send captured frames + landmark data to the server's Gemini-powered sign language recognition endpoint.
 */
export async function recognizeASLFromFrames(
  frames: string[],
  landmarkSnapshots?: LandmarkSnapshot[],
  signLanguage: SignLanguage = 'ASL',
): Promise<VisionRecognitionResult> {
  const resp = await fetch(`${API_BASE}/api/asl/recognize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frames, landmarks: landmarkSnapshots, signLanguage }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
    const error = new Error(err.error || `Server responded with ${resp.status}`) as Error & { status: number; retryAfter?: number };
    error.status = resp.status;
    if (err.retryAfter) error.retryAfter = err.retryAfter;
    throw error;
  }

  return resp.json();
}
