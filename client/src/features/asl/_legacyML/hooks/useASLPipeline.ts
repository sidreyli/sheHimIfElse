import { useEffect, useRef, useCallback, useState } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { ASLConfig } from '../../../types/asl';
import { eventBus } from '../../../utils/eventBus';
import { initAllLandmarkers, detectAll, destroyAllLandmarkers } from '../services/mediapipeService';
import { assembleFrame, resetAssemblerCache } from '../services/landmarkAssembler';
import { GestureBuffer } from '../services/gestureBuffer';
import { loadModel, disposeModel } from '../services/classifierService';
import { SEQ_LEN } from '../models/labelMap';

interface UseASLPipelineResult {
  landmarks: NormalizedLandmark[][] | null;
  currentWord: string | null;
  confidence: number;
  topPredictions: { word: string; confidence: number }[];
  isRunning: boolean;
  isLoading: boolean;
  bufferProgress: number;
  error: string | null;
  start: () => void;
  stop: () => void;
}

export function useASLPipeline(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  config: ASLConfig
): UseASLPipelineResult {
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[][] | null>(null);
  const [currentWord, setCurrentWord] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [topPredictions, setTopPredictions] = useState<{ word: string; confidence: number }[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bufferProgress, setBufferProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const activeRef = useRef(false);
  const rafId = useRef(0);
  const bufferRef = useRef(new GestureBuffer(config.confidenceThreshold));
  const classifyingRef = useRef(false);
  const landmarksRef = useRef<NormalizedLandmark[][] | null>(null);
  const lastLandmarkUpdate = useRef(0);
  const LANDMARK_UPDATE_INTERVAL = 50;

  useEffect(() => {
    bufferRef.current.setConfidenceThreshold(config.confidenceThreshold);
    bufferRef.current.setWindowSize(config.smoothingWindow);
  }, [config.confidenceThreshold, config.smoothingWindow]);

  const processFrame = useCallback(() => {
    if (!activeRef.current) return;

    if (!videoRef.current || videoRef.current.readyState < 2) {
      rafId.current = requestAnimationFrame(processFrame);
      return;
    }

    const result = detectAll(videoRef.current);

    if (result && result.hands && result.hands.landmarks.length > 0) {
      // Update hand landmarks for overlay rendering (throttled)
      landmarksRef.current = result.hands.landmarks;
      const now = performance.now();
      if (now - lastLandmarkUpdate.current >= LANDMARK_UPDATE_INTERVAL) {
        lastLandmarkUpdate.current = now;
        setLandmarks(result.hands.landmarks);
      }

      // Assemble holistic frame for classification
      const frame = assembleFrame(result);
      if (frame) {
        // Always buffer the frame to maintain temporal continuity
        if (!classifyingRef.current) {
          classifyingRef.current = true;
          bufferRef.current.pushFrame(frame).then((prediction) => {
            classifyingRef.current = false;
            setBufferProgress(Math.min(bufferRef.current.frameCount / SEQ_LEN, 1));

            if (prediction && activeRef.current) {
              setCurrentWord(prediction.word);
              setConfidence(prediction.confidence);
              setTopPredictions(prediction.topN);

              const firstHand = result.hands!.landmarks[0];
              if (firstHand) {
                eventBus.emit('asl:recognized', {
                  letter: prediction.word,
                  confidence: prediction.confidence,
                  landmarks: firstHand.map((l) => ({ x: l.x, y: l.y, z: l.z })),
                  timestamp: Date.now(),
                });
              }
            }
          }).catch((err) => {
            classifyingRef.current = false;
          });
        } else {
          // Push frame even while classifying — don't drop frames
          bufferRef.current.pushFrameOnly(frame);
          setBufferProgress(Math.min(bufferRef.current.frameCount / SEQ_LEN, 1));
        }
      }
    } else {
      if (landmarksRef.current !== null) {
        landmarksRef.current = null;
        setLandmarks(null);
      }
      bufferRef.current.onHandsLost();
    }

    rafId.current = requestAnimationFrame(processFrame);
  }, [videoRef]);

  const start = useCallback(async () => {
    if (activeRef.current || !config.enabled) return;
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([initAllLandmarkers(), loadModel()]);
      activeRef.current = true;
      setIsRunning(true);
      setIsLoading(false);
      rafId.current = requestAnimationFrame(processFrame);
    } catch (err) {
      console.error('[ASL Pipeline] start error:', err);
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('404') || message.includes('Could not fetch')) {
        try {
          await initAllLandmarkers();
          activeRef.current = true;
          setIsRunning(true);
          setIsLoading(false);
          setError('ASL model not loaded — showing hand tracking only. Export the DeBERTa model first.');
          rafId.current = requestAnimationFrame(processFrame);
          return;
        } catch {
          // Fall through
        }
      }
      setError(message);
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
    setTopPredictions([]);
    setBufferProgress(0);
    bufferRef.current.clear();
    resetAssemblerCache();
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
      disposeModel();
      resetAssemblerCache();
    };
  }, []);

  return {
    landmarks, currentWord, confidence, topPredictions,
    isRunning, isLoading, bufferProgress, error,
    start, stop,
  };
}
