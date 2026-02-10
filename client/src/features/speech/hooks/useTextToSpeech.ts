import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TTSConfig } from '../../../types/speech';
import { getVoices, speak as speakService, stop as stopService } from '../services/ttsService';

const defaultConfig: TTSConfig = {
  enabled: true,
  voice: null,
  rate: 1,
  pitch: 1,
  volume: 1,
};

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [config, setConfig] = useState<TTSConfig>(defaultConfig);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    const updateVoices = () => {
      setVoices(getVoices());
    };

    updateVoices();

    const speechSynthesis = window.speechSynthesis;

    if ('addEventListener' in speechSynthesis) {
      speechSynthesis.addEventListener('voiceschanged', updateVoices);
      return () => {
        speechSynthesis.removeEventListener('voiceschanged', updateVoices);
      };
    }

    const synth = speechSynthesis as SpeechSynthesis & { onvoiceschanged: (() => void) | null };
    synth.onvoiceschanged = updateVoices;
    return () => {
      if (synth.onvoiceschanged === updateVoices) {
        synth.onvoiceschanged = null;
      }
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!config.enabled) {
        return;
      }

      const utterance = speakService(text, config);
      if (!utterance) {
        return;
      }

      setIsSpeaking(true);

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
    },
    [config]
  );

  const stop = useCallback(() => {
    stopService();
    setIsSpeaking(false);
  }, []);

  return useMemo(
    () => ({ isSpeaking, voices, speak, stop, config, setConfig }),
    [isSpeaking, voices, speak, stop, config]
  );
}
