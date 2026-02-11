export type SignLanguage = 'ASL' | 'BSL' | 'CSL' | 'ISL' | 'FSL' | 'JSL';

export interface SignLanguageInfo {
  code: SignLanguage;
  name: string;
  region: string;
}

export const SIGN_LANGUAGES: SignLanguageInfo[] = [
  { code: 'ASL', name: 'American Sign Language', region: 'USA / Canada' },
  { code: 'BSL', name: 'British Sign Language', region: 'United Kingdom' },
  { code: 'CSL', name: 'Chinese Sign Language', region: 'China' },
  { code: 'ISL', name: 'Indian Sign Language', region: 'India' },
  { code: 'FSL', name: 'French Sign Language', region: 'France' },
  { code: 'JSL', name: 'Japanese Sign Language', region: 'Japan' },
];

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface ASLPrediction {
  letter: string;
  confidence: number;
  landmarks: HandLandmark[];
  timestamp: number;
  signLanguage?: SignLanguage;
  _remote?: boolean;
  speakerName?: string;
}

export interface ASLConfig {
  confidenceThreshold: number;
  smoothingWindow: number;
  enabled: boolean;
  signLanguage: SignLanguage;
}
