import { useCallback, useEffect, useMemo, useState } from 'react';
import { initSpeechBridge, setTTSEnabled, setTTSConfig } from '../services/speechBridge';
import { useSpeechToText } from './useSpeechToText';
import { useTextToSpeech } from './useTextToSpeech';

export type SpeechMode = 'off' | 'stt' | 'tts' | 'both';

export function useSpeechPipeline() {
  const stt = useSpeechToText();
  const tts = useTextToSpeech();
  const [mode, setMode] = useState<SpeechMode>('off');
  const { start: startSTT, stop: stopSTT } = stt;
  const { stop: stopTTS } = tts;

  useEffect(() => {
    initSpeechBridge();
  }, []);

  useEffect(() => {
    const sttEnabled = mode === 'stt' || mode === 'both';

    if (sttEnabled) {
      startSTT();
    } else {
      stopSTT();
    }
  }, [mode, startSTT, stopSTT]);

  useEffect(() => {
    const ttsEnabled = mode === 'tts' || mode === 'both';

    setTTSEnabled(ttsEnabled && tts.config.enabled);
    setTTSConfig(tts.config);

    if (!ttsEnabled) {
      stopTTS();
    }
  }, [mode, stopTTS, tts.config]);

  useEffect(() => {
    return () => {
      stopSTT();
      stopTTS();
      setTTSEnabled(false);
    };
  }, [stopSTT, stopTTS]);

  const setSpeechMode = useCallback((nextMode: SpeechMode) => {
    setMode(nextMode);
  }, []);

  return useMemo(
    () => ({ mode, setMode: setSpeechMode, stt, tts }),
    [mode, setSpeechMode, stt, tts]
  );
}
