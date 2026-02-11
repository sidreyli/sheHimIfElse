import { useCallback, useEffect, useRef } from 'react';
import type { ChatMessage } from '../../../types';
import type { ASLPrediction } from '../../../types/asl';
import type { TranscriptEntry } from '../../../types/speech';
import type { MediaConnection } from 'peerjs';
import type { DataConnection } from 'peerjs';
import { useRoomContext } from '../../../contexts/RoomContext';
import { eventBus } from '../../../utils/eventBus';
import { createPeer, destroyPeer, getPeer } from '../services/peerService';

type PeerPayload =
  | { type: 'room:presence'; data: { displayName: string } }
  | { type: 'chat:message'; data: ChatMessage }
  | { type: 'asl:recognized'; data: ASLPrediction }
  | { type: 'stt:result'; data: TranscriptEntry };

interface UsePeerConnectionParams {
  roomId: string;
  localStream: MediaStream | null;
  displayName: string;
  localPeerId: string;
  onPeerDisplayName: (peerId: string, name: string) => void;
  onChatMessage: (message: ChatMessage) => void;
}

export function usePeerConnection({
  roomId,
  localStream,
  displayName,
  localPeerId,
  onPeerDisplayName,
  onChatMessage,
}: UsePeerConnectionParams) {
  const { setRemoteStreams, setIsConnected } = useRoomContext();
  const callsRef = useRef<Map<string, MediaConnection>>(new Map());
  const dataConnsRef = useRef<Map<string, DataConnection>>(new Map());
  const knownPeersRef = useRef<Set<string>>(new Set());
  const peerNamesRef = useRef<Map<string, string>>(new Map());

  const removePeer = useCallback(
    (peerId: string) => {
      setRemoteStreams((prev) => {
        if (!prev.has(peerId)) return prev;
        const next = new Map(prev);
        next.delete(peerId);
        return next;
      });
      const displayName = peerNamesRef.current.get(peerId) || peerId;
      eventBus.emit('room:participant-left', { peerId });
      onPeerDisplayName(peerId, displayName);
      peerNamesRef.current.delete(peerId);
      const conn = dataConnsRef.current.get(peerId);
      if (conn) {
        conn.close();
      }
      dataConnsRef.current.delete(peerId);
      knownPeersRef.current.delete(peerId);
    },
    [onPeerDisplayName, setRemoteStreams]
  );

  useEffect(() => {
    if (!roomId || !localStream) return;

    const peer = createPeer(localPeerId);
    const roomPrefix = `${roomId}-`;
    let pollId: ReturnType<typeof setInterval> | null = null;
    let mounted = true;

    function upsertPeerName(peerId: string, name: string) {
      const normalized = name.trim() || `Peer ${peerId.slice(-4)}`;
      peerNamesRef.current.set(peerId, normalized);
      onPeerDisplayName(peerId, normalized);
    }

    function attachDataConnection(conn: DataConnection) {
      const remotePeerId = conn.peer;
      dataConnsRef.current.set(remotePeerId, conn);

      conn.on('open', () => {
        conn.send({ type: 'room:presence', data: { displayName } } satisfies PeerPayload);
      });

      conn.on('data', (raw) => {
        const payload = raw as PeerPayload;
        if (!payload || typeof payload !== 'object' || !('type' in payload)) {
          return;
        }
        if (payload.type === 'room:presence') {
          upsertPeerName(remotePeerId, payload.data.displayName);
          if (!knownPeersRef.current.has(remotePeerId)) {
            eventBus.emit('room:participant-joined', {
              peerId: remotePeerId,
              displayName: payload.data.displayName,
            });
            knownPeersRef.current.add(remotePeerId);
          }
        }
        if (payload.type === 'chat:message') {
          onChatMessage(payload.data);
        }
        if (payload.type === 'asl:recognized') {
          eventBus.emit('asl:recognized', { ...payload.data, _remote: true });
        }
        if (payload.type === 'stt:result') {
          eventBus.emit('stt:result', { ...payload.data, _remote: true });
        }
      });

      conn.on('close', () => {
        if (!mounted) return;
        dataConnsRef.current.delete(remotePeerId);
      });

      conn.on('error', () => {
        if (!mounted) return;
        dataConnsRef.current.delete(remotePeerId);
      });
    }

    function attachCall(call: MediaConnection) {
      const remotePeerId = call.peer;
      const callMeta = call.metadata as { displayName?: string } | undefined;
      if (callMeta?.displayName) {
        upsertPeerName(remotePeerId, callMeta.displayName);
      }

      if (callsRef.current.has(remotePeerId)) {
        call.close();
        return;
      }

      callsRef.current.set(remotePeerId, call);

      call.on('stream', (remoteStream) => {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(remotePeerId, remoteStream);
          return next;
        });

        if (!knownPeersRef.current.has(remotePeerId)) {
          const name = peerNamesRef.current.get(remotePeerId) || `Peer ${remotePeerId.slice(-4)}`;
          eventBus.emit('room:participant-joined', {
            peerId: remotePeerId,
            displayName: name,
          });
          knownPeersRef.current.add(remotePeerId);
        }
      });

      call.on('close', () => {
        callsRef.current.delete(remotePeerId);
        removePeer(remotePeerId);
      });

      call.on('error', () => {
        callsRef.current.delete(remotePeerId);
        removePeer(remotePeerId);
      });
    }

    function dialPeer(remotePeerId: string) {
      if (remotePeerId === localPeerId || callsRef.current.has(remotePeerId)) {
        return;
      }
      const call = peer.call(remotePeerId, localStream!, {
        metadata: { displayName },
      });
      if (call) {
        attachCall(call);
      }
      if (!dataConnsRef.current.has(remotePeerId)) {
        const conn = peer.connect(remotePeerId, {
          reliable: true,
          metadata: { displayName },
        });
        attachDataConnection(conn);
      }
    }

    function discoverPeers() {
      const activePeer = getPeer();
      if (!activePeer) return;
      activePeer.listAllPeers((peerIds: string[]) => {
        peerIds
          .filter((peerId: string) => peerId.startsWith(roomPrefix) && peerId !== localPeerId)
          .forEach((peerId: string) => dialPeer(peerId));
      });
    }

    peer.on('open', () => {
      setIsConnected(true);
      eventBus.emit('room:connected');
      discoverPeers();
      pollId = setInterval(discoverPeers, 3000);
    });

    peer.on('call', (incomingCall: MediaConnection) => {
      incomingCall.answer(localStream);
      attachCall(incomingCall);
    });

    peer.on('connection', (conn: DataConnection) => {
      attachDataConnection(conn);
    });

    peer.on('error', (error: Error) => {
      console.error('PeerJS error:', error);
    });

    return () => {
      mounted = false;
      if (pollId) {
        clearInterval(pollId);
      }
      callsRef.current.forEach((call) => call.close());
      callsRef.current.clear();
      dataConnsRef.current.forEach((conn) => conn.close());
      dataConnsRef.current.clear();
      peerNamesRef.current.clear();
      knownPeersRef.current.clear();
      setRemoteStreams(new Map());
      setIsConnected(false);
      eventBus.emit('room:disconnected');
      destroyPeer();
    };
  }, [displayName, localPeerId, localStream, removePeer, roomId, setIsConnected, setRemoteStreams]);

  const disconnect = useCallback(() => {
    callsRef.current.forEach((call) => call.close());
    callsRef.current.clear();
    dataConnsRef.current.forEach((conn) => conn.close());
    dataConnsRef.current.clear();
    peerNamesRef.current.clear();
    knownPeersRef.current.clear();
    setRemoteStreams(new Map());
    setIsConnected(false);
    eventBus.emit('room:disconnected');
    destroyPeer();
  }, [setIsConnected, setRemoteStreams]);

  const sendChatMessage = useCallback((message: ChatMessage) => {
    const payload: PeerPayload = { type: 'chat:message', data: message };
    dataConnsRef.current.forEach((conn) => {
      if (conn.open) {
        conn.send(payload);
      }
    });
  }, []);

  const broadcastData = useCallback((payload: PeerPayload) => {
    dataConnsRef.current.forEach((conn) => {
      if (conn.open) {
        conn.send(payload);
      }
    });
  }, []);

  return { disconnect, sendChatMessage, broadcastData };
}
