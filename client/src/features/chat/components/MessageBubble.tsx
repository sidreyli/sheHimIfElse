import type { ChatMessage } from '../../../types';
import { SOURCE_COLORS, SOURCE_BG_COLORS, SOURCE_LABELS } from '../../../utils/constants';

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const sourceColor = SOURCE_COLORS[message.source];
  const sourceBg = SOURCE_BG_COLORS[message.source];
  const sourceLabel = SOURCE_LABELS[message.source];

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`rounded-lg border px-3 py-2 ${sourceBg}`}
      role="article"
      aria-label={`${sourceLabel} message from ${message.senderName}: ${message.content}`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className={`text-xs font-semibold ${sourceColor}`}>
          {sourceLabel}
        </span>
        <span className="text-xs font-medium text-gray-300">
          {message.senderName}
        </span>
        <span className="ml-auto text-xs text-gray-500">{time}</span>
      </div>
      <p className="text-sm text-gray-100 break-words">{message.content}</p>
    </div>
  );
}
