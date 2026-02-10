<<<<<<< HEAD
import { useState, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, disabled = false }: MessageInputProps) {
  const [text, setText] = useState('');

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex items-center gap-2 border-t border-surface-700 px-3 py-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        aria-label="Type a message"
        disabled={disabled}
        className="flex-1 rounded-lg border border-surface-600 bg-surface-700 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-accent-chat focus:outline-none disabled:opacity-50"
      />
      <button
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        aria-label="Send message"
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg bg-accent-chat px-3 text-sm font-medium text-surface-900 transition-colors hover:bg-accent-chat/80 focus-visible:outline-2 focus-visible:outline-accent-chat disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Send size={16} aria-hidden="true" />
        <span>Send</span>
      </button>
    </div>
  );
=======
// TODO: Dev 4 — Text input + send button for chat messages
export default function MessageInput() {
  return <div>MessageInput placeholder</div>;
>>>>>>> clarence
}
