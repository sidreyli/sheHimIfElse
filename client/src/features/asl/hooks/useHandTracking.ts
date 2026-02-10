import { useEffect, useRef, useState, useCallback } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import {
  initHandLandmarker,
  detectHands,
  destroyHandLandmarker,
} from '../services/mediapipeService';

interface UseHandTrackingResult {
  landmarks: NormalizedLandmark[][] | null;
  isTracking: boolean;
  isLoading: boolean;
  error: string | null;
  startTracking: () => void;
  stopTracking: () => void;
}

export function useHandTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>
): UseHandTrackingResult {
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[][] | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rafId = useRef<number>(0);
  const activeRef = useRef(false);

  const detect = useCallback(() => {
    if (!activeRef.current || !videoRef.current) return;

    const result = detectHands(videoRef.current);
    if (result && result.landmarks.length > 0) {
      setLandmarks(result.landmarks);
    } else {
      setLandmarks(null);
    }

    rafId.current = requestAnimationFrame(detect);
  }, [videoRef]);

  const startTracking = useCallback(async () => {
    if (activeRef.current) return;
    setIsLoading(true);
    setError(null);

    try {
      await initHandLandmarker();
      activeRef.current = true;
      setIsTracking(true);
      setIsLoading(false);
      rafId.current = requestAnimationFrame(detect);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to initialize hand tracking'
      );
      setIsLoading(false);
    }
  }, [detect]);

  const stopTracking = useCallback(() => {
    activeRef.current = false;
    setIsTracking(false);
    cancelAnimationFrame(rafId.current);
    setLandmarks(null);
  }, []);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      cancelAnimationFrame(rafId.current);
      destroyHandLandmarker();
    };
  }, []);

  return { landmarks, isTracking, isLoading, error, startTracking, stopTracking };
}
