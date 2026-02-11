import { useEffect, useState, useRef } from 'react';
import { eventBus } from '../../../utils/eventBus';
import type { ASLPrediction } from '../../../types/asl';
import type { SignLanguage } from '../../../types/asl';

interface ASLCaptionBarProps {
  signLanguage?: SignLanguage;
}

export default function ASLCaptionBar({ signLanguage = 'ASL' }: ASLCaptionBarProps) {
  const [currentWord, setCurrentWord] = useState<string | null>(null);
  const [wordHistory, setWordHistory] = useState<string[]>([]);
  const [confidence, setConfidence] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function handleRecognized(prediction: ASLPrediction) {
      const word = prediction.letter; // "letter" field carries the word
      setCurrentWord(word);
      setConfidence(prediction.confidence);
      setWordHistory((prev) => [...prev.slice(-19), word]); // keep last 20 words

      // Clear current word display after 3s of no new signs
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCurrentWord(null), 3000);
    }

    eventBus.on('asl:recognized', handleRecognized);
    return () => {
      eventBus.off('asl:recognized', handleRecognized);
      clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Sign language recognition output"
      className="flex items-center justify-between border-t border-surface-700 bg-surface-800 px-4 py-2"
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <span className="shrink-0 rounded bg-accent-asl/20 px-2 py-0.5 text-xs font-semibold text-accent-asl">
          {signLanguage}
        </span>
        <span className="truncate text-sm text-gray-300">
          {wordHistory.length > 0
            ? wordHistory.join(' ')
            : 'Waiting for signs...'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {currentWord && (
          <span className="rounded-lg bg-accent-asl/20 px-3 py-1 text-lg font-bold text-accent-asl">
            {currentWord}
          </span>
        )}
        {currentWord && (
          <span className="text-xs text-gray-500">
            {Math.round(confidence * 100)}%
          </span>
        )}
        <button
          onClick={() => {
            setWordHistory([]);
            setCurrentWord(null);
          }}
          className="min-h-[44px] min-w-[44px] rounded-lg bg-surface-700 px-3 py-1 text-xs text-gray-400 hover:bg-surface-600"
          aria-label="Clear ASL history"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
