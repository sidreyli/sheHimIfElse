import { useState } from 'react';
import type { ChatMessage } from '../../../types';
import MessageList, { type FeedItem } from './MessageList';
import MessageInput from './MessageInput';
import { eventBus } from '../../../utils/eventBus';

const HARDCODED_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    source: 'chat',
    senderId: 'user-1',
    senderName: 'Alice',
    content: 'Hey everyone! Can you see my video?',
    timestamp: Date.now() - 120000,
  },
  {
    id: '2',
    source: 'asl',
    senderId: 'asl-system',
    senderName: 'ASL',
    content: 'H-E-L-L-O',
    timestamp: Date.now() - 90000,
  },
  {
    id: '3',
    source: 'stt',
    senderId: 'user-2',
    senderName: 'Bob',
    content: 'Yes, I can see you clearly!',
    timestamp: Date.now() - 60000,
  },
  {
    id: '4',
    source: 'chat',
    senderId: 'user-2',
    senderName: 'Bob',
    content: 'The ASL recognition is working great today.',
    timestamp: Date.now() - 30000,
  },
];

interface ChatPanelProps {
  messages?: ChatMessage[];
  onSend?: (content: string) => void;
}

export default function ChatPanel({ messages, onSend }: ChatPanelProps) {
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(HARDCODED_MESSAGES);

  const displayMessages = messages ?? localMessages;

  function handleSend(content: string) {
    // Read the typed message aloud via TTS
    eventBus.emit('tts:speak', { text: content });

    if (onSend) {
      onSend(content);
      return;
    }
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      source: 'chat',
      senderId: 'local-user',
      senderName: 'You',
      content,
      timestamp: Date.now(),
    };
    setLocalMessages((prev) => [...prev, msg]);
  }

  const items: FeedItem[] = displayMessages.map((msg) => ({
    type: 'message' as const,
    data: msg,
  }));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <MessageList items={items} />
      <MessageInput onSend={handleSend} />
    </div>
  );
}
