type STTIndicatorProps = {
  isListening?: boolean;
};

export default function STTIndicator({ isListening = false }: STTIndicatorProps) {
  if (!isListening) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-accent-stt/10 px-3 py-1"
      aria-label="Speech recognition active"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
      </span>
      <svg
        className="h-3.5 w-3.5 text-amber-400"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Zm7-3a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.93V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.07A7 7 0 0 0 19 11Z" />
      </svg>
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
        Listening
      </span>
    </div>
  );
}
