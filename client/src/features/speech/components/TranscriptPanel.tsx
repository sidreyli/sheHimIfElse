import { useEffect, useRef, useState } from 'react';
import { eventBus } from '../../../utils/eventBus';
import type { TranscriptEntry } from '../../../types/speech';

export default function TranscriptPanel() {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleResult = (entry: TranscriptEntry) => {
      setEntries((prev) => [...prev, entry]);
    };

    eventBus.on('stt:result', handleResult);

    return () => {
      eventBus.off('stt:result', handleResult);
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [entries.length]);

  return (
    <div
      className="flex h-full flex-col rounded-xl border border-white/10 bg-white/5 p-4"
      role="log"
      aria-live="polite"
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/40">
        <span>Live Transcript</span>
        <span className="text-[0.65rem] text-white/30">STT</span>
      </div>
      <div className="mt-4 flex-1 overflow-y-auto pr-2">
        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 bg-white/5 px-3 py-2 text-xs text-white/40">
              Start speaking to see captions here.
            </div>
          ) : null}
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border border-amber-400/20 bg-accent-stt/10 px-3 py-2"
            >
              <div className="flex items-center justify-between text-[0.65rem] text-white/40">
                <span>{entry.speakerName}</span>
                <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="mt-1 text-sm font-medium text-accent-stt">{entry.text}</p>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
}
