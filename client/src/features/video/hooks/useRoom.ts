import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useRoomContext } from '../../../contexts/RoomContext';
import type { ChatMessage, Participant } from '../../../types';
import type { ASLPrediction } from '../../../types/asl';
import type { TranscriptEntry } from '../../../types/speech';
import { eventBus } from '../../../utils/eventBus';
import { useChat } from '../../chat/hooks/useChat';
import { mapMaxParticipants } from '../services/roomService';
import { useMediaDevices } from './useMediaDevices';
import { usePeerConnection } from './usePeerConnection';

export function useRoom() {
  const navigate = useNavigate();
  const { roomId = '' } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const displayName = searchParams.get('name') || 'User';
  const [remoteDisplayNames, setRemoteDisplayNames] = useState<Map<string, string>>(new Map());

  const {
    remoteStreams,
    setConfig,
    setParticipants,
    setRemoteStreams,
    setLocalStream,
    isConnected,
  } = useRoomContext();

  const [localPeerId] = useState(() => `${roomId}-${crypto.randomUUID().slice(0, 8)}`);

  const { localStream, error, micEnabled, cameraEnabled, toggleMic, toggleCamera } = useMediaDevices();

  const { messages, sendMessage, addMessage } = useChat({
    senderId: localPeerId,
    senderName: displayName,
  });

  const handlePeerDisplayName = useCallback((peerId: string, name: string) => {
    setRemoteDisplayNames((prev) => {
      const next = new Map(prev);
      next.set(peerId, name);
      return next;
    });
  }, []);

  const handleRemoteChatMessage = useCallback(
    (message: ChatMessage) => {
      addMessage(message);
      eventBus.emit('chat:message', message);
    },
    [addMessage]
  );

  const { disconnect, sendChatMessage, broadcastData } = usePeerConnection({
    roomId,
    localStream,
    displayName,
    localPeerId,
    onPeerDisplayName: handlePeerDisplayName,
    onChatMessage: handleRemoteChatMessage,
  });

  useEffect(() => {
    if (!roomId) return;
    setConfig({
      roomId,
      roomName: `Room ${roomId}`,
      hostId: localPeerId,
      createdAt: Date.now(),
      maxParticipants: mapMaxParticipants(),
    });
  }, [localPeerId, roomId, setConfig]);

  useEffect(() => {
    const participants: Participant[] = [];

    if (localStream) {
      participants.push({
        id: localPeerId,
        peerId: localPeerId,
        displayName: `${displayName} (You)`,
        stream: localStream,
        isMuted: !micEnabled,
        isCameraOff: !cameraEnabled,
        isScreenSharing: false,
      });
    }

    remoteStreams.forEach((stream, peerId) => {
      const remoteName = remoteDisplayNames.get(peerId) || `Peer ${peerId.slice(-4)}`;
      participants.push({
        id: peerId,
        peerId,
        displayName: remoteName,
        stream,
        isMuted: false,
        isCameraOff: false,
        isScreenSharing: false,
      });
    });

    setParticipants(participants);
  }, [
    cameraEnabled,
    displayName,
    localPeerId,
    localStream,
    micEnabled,
    remoteDisplayNames,
    remoteStreams,
    setParticipants,
  ]);

  // Broadcast local ASL/STT results to remote peers (skip remote-originated events)
  useEffect(() => {
    const handleAsl = (prediction: ASLPrediction & { _remote?: boolean }) => {
      if (prediction._remote) return;
      broadcastData({
        type: 'asl:recognized',
        data: { ...prediction, speakerName: displayName } as ASLPrediction,
      });
    };
    const handleStt = (entry: TranscriptEntry & { _remote?: boolean }) => {
      if (entry._remote) return;
      broadcastData({
        type: 'stt:result',
        data: { ...entry, speakerName: displayName },
      });
    };
    eventBus.on('asl:recognized', handleAsl);
    eventBus.on('stt:result', handleStt);
    return () => {
      eventBus.off('asl:recognized', handleAsl);
      eventBus.off('stt:result', handleStt);
    };
  }, [broadcastData, displayName]);

  const sendChat = useCallback(
    (content: string) => {
      const message = sendMessage(content);
      sendChatMessage(message);
    },
    [sendChatMessage, sendMessage]
  );

  const leaveRoom = useCallback(() => {
    disconnect();
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    setLocalStream(null);
    setRemoteStreams(new Map());
    setRemoteDisplayNames(new Map());
    setParticipants([]);
    setConfig(null);
    navigate('/');
  }, [disconnect, localStream, navigate, setConfig, setLocalStream, setParticipants, setRemoteStreams]);

  return {
    roomId,
    localPeerId,
    displayName,
    localStream,
    remoteStreams,
    remoteDisplayNames,
    isConnected,
    error,
    micEnabled,
    cameraEnabled,
    toggleMic,
    toggleCamera,
    chatMessages: messages,
    sendChat,
    leaveRoom,
  };
}
