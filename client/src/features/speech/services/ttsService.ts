import type { TTSConfig } from '../../../types/speech';

export function getVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return [];
  }

  return window.speechSynthesis.getVoices();
}

export function speak(text: string, config?: Partial<TTSConfig>) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return null;
  }

  if (!text.trim()) {
    return null;
  }

  if (config?.enabled === false) {
    return null;
  }

  const utterance = new SpeechSynthesisUtterance(text);

  if (config?.voice) {
    const matchedVoice = getVoices().find((voice) => voice.name === config.voice);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }
  }

  if (typeof config?.rate === 'number') {
    utterance.rate = config.rate;
  }

  if (typeof config?.pitch === 'number') {
    utterance.pitch = config.pitch;
  }

  if (typeof config?.volume === 'number') {
    utterance.volume = config.volume;
  }

  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stop() {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return;
  }

  window.speechSynthesis.cancel();
}
