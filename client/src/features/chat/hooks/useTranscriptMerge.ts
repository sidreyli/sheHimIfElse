import { useState, useEffect, useCallback } from 'react';
import type { ChatMessage } from '../../../types';
import type { FeedItem } from '../components/MessageList';
import { eventBus } from '../../../utils/eventBus';

export function useTranscriptMerge() {
  const [items, setItems] = useState<FeedItem[]>([]);

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

  const addSystemMessage = useCallback((text: string) => {
    setItems((prev) => [
      ...prev,
      { type: 'system' as const, id: crypto.randomUUID(), text },
    ]);
  }, []);

  useEffect(() => {
    const handleChat = (msg: ChatMessage) => addMessage(msg);

    const handleASL = (pred: { letter: string; confidence: number; timestamp: number }) => {
      addMessage({
        id: crypto.randomUUID(),
        source: 'asl',
        senderId: 'asl-system',
        senderName: 'ASL',
        content: pred.letter,
        timestamp: pred.timestamp,
      });
    };

    const handleSTT = (entry: {
      id: string;
      text: string;
      speakerId: string;
      speakerName: string;
      timestamp: number;
    }) => {
      addMessage({
        id: entry.id,
        source: 'stt',
        senderId: entry.speakerId,
        senderName: entry.speakerName,
        content: entry.text,
        timestamp: entry.timestamp,
      });
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
  }, [addMessage, addSystemMessage]);

  return { items };
}
