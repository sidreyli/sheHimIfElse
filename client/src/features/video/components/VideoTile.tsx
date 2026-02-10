import { useEffect, useRef } from 'react';
import { useRoomContext } from '../../../contexts/RoomContext';

interface VideoTileProps {
  peerId: string;
  stream: MediaStream;
  displayName: string;
  muted?: boolean;
}

export default function VideoTile({ peerId, stream, displayName, muted = false }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { videoRefs } = useRoomContext();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = stream;
    void video.play().catch(() => {
      // autoplay may be blocked; user interaction will start playback
    });

    videoRefs.current.set(peerId, video);
    return () => {
      videoRefs.current.delete(peerId);
    };
  }, [peerId, stream, videoRefs]);

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
      <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
        {displayName}
      </div>
    </article>
  );
}
