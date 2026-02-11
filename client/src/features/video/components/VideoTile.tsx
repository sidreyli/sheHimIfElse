import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRoomContext } from '../../../contexts/RoomContext';

interface VideoTileProps {
  peerId: string;
  stream: MediaStream;
  displayName: string;
  muted?: boolean;
  onVideoRef?: (el: HTMLVideoElement | null) => void;
  /** Optional overlay rendered inside the tile's relative container (e.g. ASL skeleton) */
  overlay?: ReactNode;
}

export default function VideoTile({ peerId, stream, displayName, muted = false, onVideoRef, overlay }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { videoRefs } = useRoomContext();
  const [isMirrored, setIsMirrored] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    console.log(`[VideoTile] Mounting for ${peerId.slice(-6)}, tracks:`, {
      video: stream.getVideoTracks().map(t => ({ label: t.label, enabled: t.enabled, readyState: t.readyState })),
      audio: stream.getAudioTracks().map(t => ({ label: t.label, enabled: t.enabled, readyState: t.readyState })),
      active: stream.active,
    });

    video.srcObject = stream;
    void video.play().catch((err) => {
      console.error(`[VideoTile] Play failed for ${peerId.slice(-6)}:`, err);
    });

    videoRefs.current?.set(peerId, video);
    onVideoRef?.(video);
    return () => {
      videoRefs.current?.delete(peerId);
      onVideoRef?.(null);
    };
  }, [peerId, stream, videoRefs, onVideoRef]);

  return (
    <article className="relative overflow-hidden rounded-2xl border border-surface-700 bg-surface-900">
      <div className={`h-full min-h-[200px] w-full ${isMirrored ? '-scale-x-100 transform' : ''}`}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          aria-label={`Video feed from ${displayName}`}
          className="h-full min-h-[200px] w-full object-cover"
        />
        {overlay}
      </div>

      <div className="absolute bottom-3 left-3 rounded-md bg-pink-950/60 px-2 py-1 text-xs text-pink-50">
        {displayName}
      </div>
      <button
        type="button"
        onClick={() => setIsMirrored((prev) => !prev)}
        aria-pressed={isMirrored}
        aria-label={`${isMirrored ? 'Unmirror' : 'Mirror'} ${displayName} video`}
        className="absolute bottom-3 right-3 min-h-[36px] rounded-md border border-surface-600 bg-surface-800 px-2 py-1 text-xs font-medium text-pink-900 hover:bg-surface-700"
      >
        {isMirrored ? 'Unmirror' : 'Mirror'}
      </button>
    </article>
  );
}
