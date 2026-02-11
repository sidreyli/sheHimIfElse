import { eventBus } from '../../../utils/eventBus';
import type { TTSConfig } from '../../../types/speech';
import { speak as speakService } from './ttsService';

let initialized = false;
let ttsEnabled = false;
let ttsConfig: Partial<TTSConfig> = {};

function handleAslRecognized(prediction: { letter: string }) {
  if (!ttsEnabled) {
    return;
  }

  if (prediction?.letter) {
    speakService(prediction.letter, ttsConfig);
  }
}

function handleSttResult(entry: { text: string; isFinal: boolean }) {
  if (!ttsEnabled) {
    return;
  }

  if (entry?.text && entry.isFinal) {
    speakService(entry.text);
  }
}

function handleTtsSpeak(payload: { text: string }) {
  if (!ttsEnabled) {
    return;
  }

  if (payload?.text) {
    speakService(payload.text, ttsConfig);
  }
}

export function initSpeechBridge() {
  if (initialized) {
    return;
  }

  initialized = true;
  eventBus.on('asl:recognized', handleAslRecognized);
  eventBus.on('stt:result', handleSttResult);
  eventBus.on('tts:speak', handleTtsSpeak);
}

export function setTTSEnabled(enabled: boolean) {
  ttsEnabled = enabled;
}

export function setTTSConfig(config: Partial<TTSConfig>) {
  ttsConfig = config;
}
