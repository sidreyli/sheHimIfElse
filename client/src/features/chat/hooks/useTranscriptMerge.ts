import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChatMessage } from '../../../types';
import type { ASLPrediction } from '../../../types/asl';
import type { FeedItem } from '../components/MessageList';
import { eventBus } from '../../../utils/eventBus';

const STT_BUFFER_TIMEOUT = 5000;
const ASL_BUFFER_TIMEOUT = 3000;

interface BufferEntry {
  messageId: string;
  timestamp: number;
}

export function useTranscriptMerge() {
  const [items, setItems] = useState<FeedItem[]>([]);

  // Track the last buffered message per speaker+source so we can append
  const sttBufferRef = useRef<Map<string, BufferEntry>>(new Map());
  const aslBufferRef = useRef<Map<string, BufferEntry>>(new Map());

  const addMessage = useCallback((msg: ChatMessage) => {
    setItems((prev) => {
      if (prev.some((item) => item.type === 'message' && item.data.id === msg.id)) {
        return prev;
      }
      const next: FeedItem[] = [...prev, { type: 'message', data: msg }];
      next.sort((a, b) => {
        const tsA = a.type === 'message' ? a.data.timestamp : 0;
        const tsB = b.type === 'message' ? b.data.timestamp : 0;
        return tsA - tsB;
      });
      return next;
    });
  }, []);

  const updateMessage = useCallback((id: string, appendText: string, newTimestamp: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.type === 'message' && item.data.id === id) {
          return {
            ...item,
            data: {
              ...item.data,
              content: item.data.content + ' ' + appendText,
              timestamp: newTimestamp,
            },
          };
        }
        return item;
      }),
    );
  }, []);

  const addSystemMessage = useCallback((text: string) => {
    setItems((prev) => [
      ...prev,
      { type: 'system' as const, id: crypto.randomUUID(), text },
    ]);
  }, []);

  useEffect(() => {
    const handleChat = (msg: ChatMessage) => addMessage(msg);

    const handleASL = (pred: ASLPrediction) => {
      const isRemote = !!pred._remote;
      const senderId = isRemote ? `remote-asl-${pred.speakerName ?? 'unknown'}` : 'local-asl';
      const senderName = isRemote
        ? `${pred.speakerName ?? 'Peer'} (ASL)`
        : 'You (ASL)';

      const bufferKey = senderId;
      const existing = aslBufferRef.current.get(bufferKey);

      if (existing && pred.timestamp - existing.timestamp < ASL_BUFFER_TIMEOUT) {
        // Append to existing bubble
        existing.timestamp = pred.timestamp;
        updateMessage(existing.messageId, pred.letter, pred.timestamp);
      } else {
        // Start a new bubble
        const id = crypto.randomUUID();
        aslBufferRef.current.set(bufferKey, { messageId: id, timestamp: pred.timestamp });
        addMessage({
          id,
          source: 'asl',
          senderId,
          senderName,
          content: pred.letter,
          timestamp: pred.timestamp,
        });
      }
    };

    const handleSTT = (entry: {
      id: string;
      text: string;
      speakerId: string;
      speakerName: string;
      timestamp: number;
    }) => {
      const bufferKey = entry.speakerId;
      const existing = sttBufferRef.current.get(bufferKey);

      if (existing && entry.timestamp - existing.timestamp < STT_BUFFER_TIMEOUT) {
        // Append to existing bubble
        existing.timestamp = entry.timestamp;
        updateMessage(existing.messageId, entry.text, entry.timestamp);
      } else {
        // Start a new bubble
        const id = entry.id;
        sttBufferRef.current.set(bufferKey, { messageId: id, timestamp: entry.timestamp });
        addMessage({
          id,
          source: 'stt',
          senderId: entry.speakerId,
          senderName: entry.speakerName,
          content: entry.text,
          timestamp: entry.timestamp,
        });
      }
    };

    const handleJoin = ({ displayName }: { displayName: string }) => {
      addSystemMessage(`${displayName} joined the room`);
    };

    const handleLeave = ({ peerId }: { peerId: string }) => {
      addSystemMessage(`${peerId} left the room`);
    };

    eventBus.on('chat:message', handleChat);
    eventBus.on('asl:recognized', handleASL);
    eventBus.on('stt:result', handleSTT);
    eventBus.on('room:participant-joined', handleJoin);
    eventBus.on('room:participant-left', handleLeave);

    return () => {
      eventBus.off('chat:message', handleChat);
      eventBus.off('asl:recognized', handleASL);
      eventBus.off('stt:result', handleSTT);
      eventBus.off('room:participant-joined', handleJoin);
      eventBus.off('room:participant-left', handleLeave);
    };
  }, [addMessage, updateMessage, addSystemMessage]);

  return { items };
}
