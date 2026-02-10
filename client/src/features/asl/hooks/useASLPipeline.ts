import { useEffect, useRef, useCallback, useState } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { ASLConfig } from '../../../types/asl';
import { eventBus } from '../../../utils/eventBus';
import { initHandLandmarker, detectHands, destroyHandLandmarker } from '../services/mediapipeService';
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
  bufferProgress: number; // 0-1 how full the frame buffer is
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

  // Keep buffer in sync with config
  useEffect(() => {
    bufferRef.current.setConfidenceThreshold(config.confidenceThreshold);
    bufferRef.current.setWindowSize(config.smoothingWindow);
  }, [config.confidenceThreshold, config.smoothingWindow]);

  const processFrame = useCallback(() => {
    if (!activeRef.current || !videoRef.current) return;

    const result = detectHands(videoRef.current);

    if (result && result.landmarks.length > 0) {
      setLandmarks(result.landmarks);

      // Extract left and right hand landmarks as number[][]
      // MediaPipe returns hands in detection order, not left/right order.
      // For simplicity, treat first hand as left, second as right.
      const hand0 = result.landmarks[0]?.map((l) => [l.x, l.y, l.z]) ?? null;
      const hand1 = result.landmarks[1]?.map((l) => [l.x, l.y, l.z]) ?? null;

      // Determine handedness if available
      let leftHand = hand0;
      let rightHand = hand1;
      if (result.handednesses && result.handednesses.length > 0) {
        const h0Label = result.handednesses[0]?.[0]?.categoryName;
        if (h0Label === 'Right') {
          // MediaPipe mirrors, so "Right" label = user's left hand in video
          leftHand = hand0;
          rightHand = hand1;
        } else {
          leftHand = hand1;
          rightHand = hand0;
        }
      }

      // Feed frame to buffer for word-level classification
      const prediction = bufferRef.current.pushFrame(leftHand, rightHand);

      // Update buffer progress for UI
      setBufferProgress(Math.min(bufferRef.current.frameCount / SEQ_LEN, 1));

      if (prediction) {
        setCurrentWord(prediction.word);
        setConfidence(prediction.confidence);
        setTopPredictions(prediction.topN);

        // Emit to event bus for other modules
        const firstHand = result.landmarks[0];
        eventBus.emit('asl:recognized', {
          letter: prediction.word, // "letter" field carries the word
          confidence: prediction.confidence,
          landmarks: firstHand.map((l) => ({ x: l.x, y: l.y, z: l.z })),
          timestamp: Date.now(),
        });
      }
    } else {
      setLandmarks(null);
      bufferRef.current.onHandsLost();
    }

    rafId.current = requestAnimationFrame(processFrame);
  }, [videoRef]);

  const start = useCallback(async () => {
    if (activeRef.current || !config.enabled) return;
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([initHandLandmarker(), loadModel()]);
      activeRef.current = true;
      setIsRunning(true);
      setIsLoading(false);
      rafId.current = requestAnimationFrame(processFrame);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start ASL pipeline';
      // If the TFJS model isn't available yet, still run hand tracking only
      if (message.includes('model') || message.includes('404') || message.includes('fetch')) {
        try {
          await initHandLandmarker();
          activeRef.current = true;
          setIsRunning(true);
          setIsLoading(false);
          setError('ASL model not loaded — showing hand tracking only. Train and export the model first.');
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
  }, []);

  // Auto-start/stop based on config.enabled
  useEffect(() => {
    if (config.enabled && videoRef.current) {
      start();
    } else {
      stop();
    }
  }, [config.enabled, start, stop, videoRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false;
      cancelAnimationFrame(rafId.current);
      destroyHandLandmarker();
      disposeModel();
    };
  }, []);

  return {
    landmarks, currentWord, confidence, topPredictions,
    isRunning, isLoading, bufferProgress, error,
    start, stop,
  };
}
