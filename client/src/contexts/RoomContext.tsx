import { createContext, useContext, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { Participant, RoomConfig } from '../types';

interface RoomContextValue {
  /** Current room configuration */
  config: RoomConfig | null;
  setConfig: (config: RoomConfig | null) => void;

  /** All participants including local */
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;

  /** Local user's media stream */
  localStream: MediaStream | null;
  setLocalStream: (stream: MediaStream | null) => void;

  /** Map of peerId -> MediaStream for remote participants */
  remoteStreams: Map<string, MediaStream>;
  setRemoteStreams: React.Dispatch<React.SetStateAction<Map<string, MediaStream>>>;

  /** Refs to <video> elements keyed by peerId — used by ASL module to read frames */
  videoRefs: RefObject<Map<string, HTMLVideoElement>>;

  /** Connection state */
  isConnected: boolean;
  setIsConnected: (v: boolean) => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<RoomConfig | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  return (
    <RoomContext.Provider
      value={{
        config, setConfig,
        participants, setParticipants,
        localStream, setLocalStream,
        remoteStreams, setRemoteStreams,
        videoRefs,
        isConnected, setIsConnected,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}

export function useRoomContext() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoomContext must be used within RoomProvider');
  return ctx;
}
