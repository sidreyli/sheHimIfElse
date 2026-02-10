export interface Participant {
  id: string;
  displayName: string;
  peerId: string;
  stream?: MediaStream;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
}

export interface RoomConfig {
  roomId: string;
  roomName: string;
  maxParticipants: number;
  createdAt: number;
  hostId: string;
}

export interface RoomState {
  config: RoomConfig | null;
  participants: Participant[];
  localParticipant: Participant | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}
