import { useState, useCallback } from 'react';
import type { ChatMessage } from '../../../types';
import { eventBus } from '../../../utils/eventBus';

interface UseChatOptions {
  senderId: string;
  senderName: string;
}

export function useChat({ senderId, senderName }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const sendMessage = useCallback(
    (content: string) => {
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        source: 'chat',
        senderId,
        senderName,
        content,
        timestamp: Date.now(),
      };
      addMessage(msg);
      eventBus.emit('chat:message', msg);
      return msg;
    },
    [senderId, senderName, addMessage],
  );

  return { messages, sendMessage, addMessage };
}
