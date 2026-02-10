import { useTranscriptMerge } from '../hooks/useTranscriptMerge';
import MessageList from './MessageList';

export default function UnifiedTranscript() {
  const { items } = useTranscriptMerge();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <MessageList items={items} />
    </div>
  );
}
