import { useCallback, useEffect, useMemo, useState } from 'react';
import { eventBus } from '../../../utils/eventBus';
import { onError, onResult, startListening, stopListening } from '../services/sttService';

const UNSUPPORTED_ERROR = 'Speech recognition requires Chrome or Edge.';

function extractTranscripts(event: SpeechRecognitionEvent) {
  let finalText = '';
  let interimText = '';

  for (let i = event.resultIndex; i < event.results.length; i += 1) {
    const result = event.results[i];
    const text = result[0]?.transcript?.trim();

    if (!text) {
      continue;
    }

    if (result.isFinal) {
      finalText += finalText ? ` ${text}` : text;
    } else {
      interimText += interimText ? ` ${text}` : text;
    }
  }

  return { finalText, interimText };
}

export function useSpeechToText() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeResult = onResult((event) => {
      const { finalText, interimText: interim } = extractTranscripts(event);

      if (finalText) {
        setTranscript((prev) => (prev ? `${prev} ${finalText}` : finalText));
        setInterimText('');

        eventBus.emit('stt:result', {
          id: crypto.randomUUID(),
          text: finalText,
          speakerId: 'local',
          speakerName: 'You',
          isFinal: true,
          timestamp: Date.now(),
        });
      } else {
        setInterimText(interim);
      }
    });

    const unsubscribeError = onError((event) => {
      const message =
        event instanceof Error
          ? event.message
          : event.error
          ? `Speech recognition error: ${event.error}`
          : 'Speech recognition error.';

      setError(message);
      setIsListening(false);
    });

    return () => {
      unsubscribeResult();
      unsubscribeError();
      stopListening();
    };
  }, []);

  const start = useCallback(() => {
    setError(null);
    const started = startListening();

    if (!started) {
      setError(UNSUPPORTED_ERROR);
      setIsListening(false);
      return;
    }

    setIsListening(true);
  }, []);

  const stop = useCallback(() => {
    stopListening();
    setIsListening(false);
    setInterimText('');
  }, []);

  return useMemo(
    () => ({ isListening, transcript, interimText, error, start, stop }),
    [isListening, transcript, interimText, error, start, stop]
  );
}
