import { useEffect, useRef, type ReactNode } from 'react';
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = stream;
    void video.play().catch(() => {
      // autoplay may be blocked; user interaction will start playback
    });

    videoRefs.current?.set(peerId, video);
    onVideoRef?.(video);
    return () => {
      videoRefs.current?.delete(peerId);
      onVideoRef?.(null);
    };
  }, [peerId, stream, videoRefs, onVideoRef]);

  return (
    <article className="relative overflow-hidden rounded-2xl border border-surface-700 bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        aria-label={`Video feed from ${displayName}`}
        className="h-full min-h-[200px] w-full object-cover"
      />
      {overlay}
      <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
        {displayName}
      </div>
    </article>
  );
}
