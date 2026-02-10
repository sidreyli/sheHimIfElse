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
}

export interface ASLConfig {
  confidenceThreshold: number;
  smoothingWindow: number;
  enabled: boolean;
}
