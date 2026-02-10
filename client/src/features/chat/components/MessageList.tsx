import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../../types';
import MessageBubble from './MessageBubble';
import SystemMessage from './SystemMessage';

export interface MessageItem {
  type: 'message';
  data: ChatMessage;
}

export interface SystemItem {
  type: 'system';
  id: string;
  text: string;
}

export type FeedItem = MessageItem | SystemItem;

interface MessageListProps {
  items: FeedItem[];
}

export default function MessageList({ items }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items.length]);

  return (
    <div
      className="flex-1 overflow-y-auto space-y-2 p-3"
      role="log"
      aria-live="polite"
      aria-label="Messages"
    >
      {items.length === 0 && (
        <p className="text-center text-sm text-gray-500 pt-8">
          No messages yet. Start the conversation!
        </p>
      )}
      {items.map((item) => {
        if (item.type === 'system') {
          return <SystemMessage key={item.id} text={item.text} />;
        }
        return <MessageBubble key={item.data.id} message={item.data} />;
      })}
      <div ref={bottomRef} />
    </div>
  );
}
