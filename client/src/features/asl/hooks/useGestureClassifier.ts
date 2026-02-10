import { useEffect, useRef, useState, useCallback } from 'react';
import { loadModel, isModelLoaded, disposeModel } from '../services/classifierService';
import { GestureBuffer } from '../services/gestureBuffer';
import type { ASLConfig } from '../../../types/asl';

interface WordResult {
  word: string;
  confidence: number;
  topN: { word: string; confidence: number }[];
}

interface UseGestureClassifierResult {
  result: WordResult | null;
  isModelReady: boolean;
  modelError: string | null;
  pushFrame: (frame: Float32Array) => Promise<WordResult | null>;
}

export function useGestureClassifier(config: ASLConfig): UseGestureClassifierResult {
  const [isModelReady, setIsModelReady] = useState(isModelLoaded());
  const [modelError, setModelError] = useState<string | null>(null);
  const [result, setResult] = useState<WordResult | null>(null);
  const bufferRef = useRef(new GestureBuffer(config.confidenceThreshold));

  useEffect(() => {
    bufferRef.current.setConfidenceThreshold(config.confidenceThreshold);
    bufferRef.current.setWindowSize(config.smoothingWindow);
  }, [config.confidenceThreshold, config.smoothingWindow]);

  useEffect(() => {
    if (!config.enabled) return;

    loadModel()
      .then(() => setIsModelReady(true))
      .catch((err) => {
        setModelError(err instanceof Error ? err.message : 'Failed to load ASL model');
      });

    return () => {
      disposeModel();
      setIsModelReady(false);
    };
  }, [config.enabled]);

  const pushFrame = useCallback(
    async (frame: Float32Array): Promise<WordResult | null> => {
      if (!isModelReady || !config.enabled) return null;

      const prediction = await bufferRef.current.pushFrame(frame);
      if (prediction) {
        setResult(prediction);
        return prediction;
      }
      return null;
    },
    [isModelReady, config.enabled]
  );

  return { result, isModelReady, modelError, pushFrame };
}
