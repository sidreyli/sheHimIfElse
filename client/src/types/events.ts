import type { ASLPrediction } from './asl';
import type { TranscriptEntry } from './speech';
import type { ChatMessage } from './message';

/**
 * Event map for the cross-module event bus.
 * Modules never import from each other — they communicate through these events.
 */
export type EventMap = {
  /** Dev 2 emits when ASL sign is recognized. Dev 3 & 4 consume. */
  'asl:recognized': ASLPrediction;

  /** Dev 3 emits when speech-to-text produces a result. Dev 4 consumes. */
  'stt:result': TranscriptEntry;

  /** Dev 4 emits when a chat message is sent. Dev 3 optionally consumes for TTS. */
  'chat:message': ChatMessage;

  /** Any module emits to request text-to-speech. Dev 3 consumes. */
  'tts:speak': { text: string; priority?: 'low' | 'normal' | 'high' };

  /** Dev 1 emits when a participant joins/leaves. */
  'room:participant-joined': { peerId: string; displayName: string };
  'room:participant-left': { peerId: string };

  /** Dev 1 emits when connection state changes. */
  'room:connected': void;
  'room:disconnected': void;
};
