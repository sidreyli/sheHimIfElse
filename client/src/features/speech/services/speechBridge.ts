import { eventBus } from '../../../utils/eventBus';
import { speak as speakService } from './ttsService';

let initialized = false;
let ttsEnabled = false;

function handleAslRecognized(prediction: { letter: string }) {
  if (!ttsEnabled) {
    return;
  }

  if (prediction?.letter) {
    speakService(prediction.letter);
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
    speakService(payload.text);
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
