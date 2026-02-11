import { useEffect, useRef, useCallback, useState } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { ASLConfig } from '../../../types/asl';
import { eventBus } from '../../../utils/eventBus';
import { initAllLandmarkers, detectAll, destroyAllLandmarkers } from '../services/mediapipeService';
import { captureFrameSequence, recognizeASLFromFrames } from '../services/visionService';

interface UseASLVisionPipelineResult {
  landmarks: NormalizedLandmark[][] | null;
  currentWord: string | null;
  confidence: number;
  isRunning: boolean;
  isLoading: boolean;
  isRecognizing: boolean;
  error: string | null;
  start: () => void;
  stop: () => void;
}

/** Base interval between Gemini API calls (ms) */
const BASE_RECOGNITION_INTERVAL = 3000;
/** Max backoff interval on repeated errors (ms) */
const MAX_BACKOFF = 60000;
/** Number of frames to capture per recognition request */
const FRAME_COUNT = 3;
/** Interval between frame captures within one request (ms) */
const FRAME_INTERVAL = 400;
/** Minimum confidence to emit a recognized sign */
const MIN_CONFIDENCE = 0.3;

export function useASLVisionPipeline(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  config: ASLConfig,
): UseASLVisionPipelineResult {
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[][] | null>(null);
  const [currentWord, setCurrentWord] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeRef = useRef(false);
  const rafId = useRef(0);
  const recognizingRef = useRef(false);
  const lastRecognitionTime = useRef(0);
  const lastLandmarkUpdate = useRef(0);
  const handsVisibleRef = useRef(false);
  const consecutiveErrors = useRef(0);
  const currentInterval = useRef(BASE_RECOGNITION_INTERVAL);
  const LANDMARK_THROTTLE = 50; // ms

  /**
   * Main render loop: detect hands via MediaPipe for the overlay,
   * and periodically send frames to Gemini for recognition.
   */
  const processFrame = useCallback(() => {
    if (!activeRef.current) return;

    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      rafId.current = requestAnimationFrame(processFrame);
      return;
    }

    // Run MediaPipe hand detection for overlay
    const result = detectAll(video);
    const handsDetected = result?.hands?.landmarks && result.hands.landmarks.length > 0;

    if (handsDetected) {
      handsVisibleRef.current = true;
      const now = performance.now();
      if (now - lastLandmarkUpdate.current >= LANDMARK_THROTTLE) {
        lastLandmarkUpdate.current = now;
        setLandmarks(result!.hands!.landmarks);
      }

      // Trigger Gemini recognition if enough time has passed (with backoff)
      const timeSinceLastRecognition = now - lastRecognitionTime.current;
      if (!recognizingRef.current && timeSinceLastRecognition >= currentInterval.current) {
        recognizingRef.current = true;
        lastRecognitionTime.current = now;
        setIsRecognizing(true);

        // Capture frames and send to server (runs async, doesn't block the render loop)
        captureFrameSequence(video, FRAME_COUNT, FRAME_INTERVAL)
          .then((frames) => {
            if (frames.length === 0 || !activeRef.current) {
              recognizingRef.current = false;
              setIsRecognizing(false);
              return;
            }
            return recognizeASLFromFrames(frames);
          })
          .then((prediction) => {
            recognizingRef.current = false;
            setIsRecognizing(false);

            if (!prediction || !activeRef.current) return;

            // Success — reset backoff
            consecutiveErrors.current = 0;
            currentInterval.current = BASE_RECOGNITION_INTERVAL;

            if (prediction.sign && prediction.confidence >= MIN_CONFIDENCE) {
              setCurrentWord(prediction.sign);
              setConfidence(prediction.confidence);

              const firstHand = result?.hands?.landmarks?.[0];
              eventBus.emit('asl:recognized', {
                letter: prediction.sign,
                confidence: prediction.confidence,
                landmarks: firstHand
                  ? firstHand.map((l) => ({ x: l.x, y: l.y, z: l.z }))
                  : [],
                timestamp: Date.now(),
              });
            }
          })
          .catch((err: any) => {
            recognizingRef.current = false;
            setIsRecognizing(false);

            // Exponential backoff on errors (especially 429)
            consecutiveErrors.current++;
            const backoff = Math.min(
              BASE_RECOGNITION_INTERVAL * Math.pow(2, consecutiveErrors.current),
              MAX_BACKOFF,
            );
            currentInterval.current = backoff;

            if (err?.status === 429) {
              setError(`Rate limited — retrying in ${Math.round(backoff / 1000)}s`);
            } else {
              console.error('[ASL Vision] Recognition error:', err?.message || err);
            }
          });
      }
    } else {
      if (handsVisibleRef.current) {
        handsVisibleRef.current = false;
        setLandmarks(null);
      }
    }

    rafId.current = requestAnimationFrame(processFrame);
  }, [videoRef]);

  const start = useCallback(async () => {
    if (activeRef.current || !config.enabled) return;
    setIsLoading(true);
    setError(null);

    try {
      // Only need MediaPipe for hand overlay — no ONNX model needed
      await initAllLandmarkers();
      activeRef.current = true;
      setIsRunning(true);
      setIsLoading(false);
      rafId.current = requestAnimationFrame(processFrame);
    } catch (err) {
      console.error('[ASL Vision Pipeline] start error:', err);
      setError(err instanceof Error ? err.message : String(err));
      setIsLoading(false);
    }
  }, [config.enabled, processFrame]);

  const stop = useCallback(() => {
    activeRef.current = false;
    cancelAnimationFrame(rafId.current);
    setIsRunning(false);
    setLandmarks(null);
    setCurrentWord(null);
    setConfidence(0);
    setIsRecognizing(false);
  }, []);

  useEffect(() => {
    if (config.enabled) {
      start();
    } else {
      stop();
    }
  }, [config.enabled, start, stop]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      cancelAnimationFrame(rafId.current);
      destroyAllLandmarkers();
    };
  }, []);

  return {
    landmarks,
    currentWord,
    confidence,
    isRunning,
    isLoading,
    isRecognizing,
    error,
    start,
    stop,
  };
}
