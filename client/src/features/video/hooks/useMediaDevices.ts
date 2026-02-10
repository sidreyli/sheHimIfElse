import { useCallback, useEffect, useState } from 'react';
import { useRoomContext } from '../../../contexts/RoomContext';

export function useMediaDevices() {
  const { localStream, setLocalStream } = useRoomContext();
  const [error, setError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  useEffect(() => {
    let mounted = true;
    let streamRef: MediaStream | null = null;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef = stream;
        setLocalStream(stream);
        setMicEnabled(stream.getAudioTracks().some((track) => track.enabled));
        setCameraEnabled(stream.getVideoTracks().some((track) => track.enabled));
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to access camera/microphone.';
        setError(message);
      }
    }

    void init();

    return () => {
      mounted = false;
      if (streamRef) {
        streamRef.getTracks().forEach((track) => track.stop());
      }
      setLocalStream(null);
    };
  }, [setLocalStream]);

  const toggleMic = useCallback(() => {
    if (!localStream) return;
    const audioTracks = localStream.getAudioTracks();
    if (!audioTracks.length) return;
    const nextEnabled = !audioTracks[0].enabled;
    audioTracks.forEach((track) => {
      track.enabled = nextEnabled;
    });
    setMicEnabled(nextEnabled);
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    const videoTracks = localStream.getVideoTracks();
    if (!videoTracks.length) return;
    const nextEnabled = !videoTracks[0].enabled;
    videoTracks.forEach((track) => {
      track.enabled = nextEnabled;
    });
    setCameraEnabled(nextEnabled);
  }, [localStream]);

  return {
    localStream,
    error,
    micEnabled,
    cameraEnabled,
    toggleMic,
    toggleCamera,
  };
}
