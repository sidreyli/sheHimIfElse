interface MediaControlsProps {
  micEnabled: boolean;
  cameraEnabled: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onLeave: () => void;
}

export default function MediaControls({
  micEnabled,
  cameraEnabled,
  onToggleMic,
  onToggleCamera,
  onLeave,
}: MediaControlsProps) {
  const baseBtn =
    'min-h-11 min-w-11 rounded-lg border border-surface-600 px-3 py-2 text-sm font-medium transition-colors';

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
        aria-pressed={!micEnabled}
        onClick={onToggleMic}
        className={`${baseBtn} ${micEnabled ? 'bg-surface-700 text-white' : 'bg-amber-500/20 text-amber-200'}`}
      >
        {micEnabled ? 'Mic On' : 'Mic Off'}
      </button>

      <button
        type="button"
        aria-label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
        aria-pressed={!cameraEnabled}
        onClick={onToggleCamera}
        className={`${baseBtn} ${cameraEnabled ? 'bg-surface-700 text-white' : 'bg-amber-500/20 text-amber-200'}`}
      >
        {cameraEnabled ? 'Camera On' : 'Camera Off'}
      </button>

      <button
        type="button"
        aria-label="Leave room"
        onClick={onLeave}
        className={`${baseBtn} border-red-500/40 bg-red-500/20 text-red-200`}
      >
        Leave
      </button>
    </div>
  );
}
