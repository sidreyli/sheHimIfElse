<<<<<<< HEAD
import { useTranscriptMerge } from '../hooks/useTranscriptMerge';
import MessageList from './MessageList';

export default function UnifiedTranscript() {
  const { items } = useTranscriptMerge();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <MessageList items={items} />
    </div>
  );
=======
// TODO: Dev 4 — Merged feed showing chat + ASL + STT messages in chronological order
export default function UnifiedTranscript() {
  return <div role="log" aria-live="polite">UnifiedTranscript placeholder</div>;
>>>>>>> clarence
}
