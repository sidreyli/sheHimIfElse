import type { ReactNode } from 'react';
import VideoTile from './VideoTile';

interface VideoGridProps {
  localPeerId: string;
  localDisplayName: string;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  remoteDisplayNames: Map<string, string>;
  error: string | null;
  isConnected: boolean;
  onLocalVideoRef?: (el: HTMLVideoElement | null) => void;
  /** Overlay element to render inside the local video tile */
  localOverlay?: ReactNode;
}

export default function VideoGrid({
  localPeerId,
  localDisplayName,
  localStream,
  remoteStreams,
  remoteDisplayNames,
  error,
  isConnected,
  onLocalVideoRef,
  localOverlay,
}: VideoGridProps) {
  return (
    <section className="flex h-full w-full flex-col gap-3 p-3" aria-label="Video grid">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          Media error: {error}
        </div>
      )}

      <div className="text-xs text-gray-400">
        {isConnected ? 'Connected to signaling server' : 'Connecting to signaling server...'}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
        {localStream ? (
          <VideoTile
            peerId={localPeerId}
            stream={localStream}
            displayName={`${localDisplayName} (You)`}
            muted
            onVideoRef={onLocalVideoRef}
            overlay={localOverlay}
          />
        ) : (
          <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-surface-700 bg-surface-800 text-sm text-gray-400">
            Waiting for camera and microphone permission...
          </div>
        )}

        {(() => { if (remoteStreams.size > 0) console.log(`[VideoGrid] Rendering ${remoteStreams.size} remote stream(s)`); return null; })()}
        {Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
          <VideoTile
            key={peerId}
            peerId={peerId}
            stream={stream}
            displayName={remoteDisplayNames.get(peerId) || `Peer ${peerId.slice(-4)}`}
          />
        ))}
      </div>
    </section>
  );
}
