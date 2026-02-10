export interface TranscriptEntry {
  id: string;
  text: string;
  speakerId: string;
  speakerName: string;
  isFinal: boolean;
  timestamp: number;
}

export interface TTSConfig {
  enabled: boolean;
  voice: string | null;
  rate: number;
  pitch: number;
  volume: number;
}

export interface STTConfig {
  enabled: boolean;
  language: string;
  continuous: boolean;
}
