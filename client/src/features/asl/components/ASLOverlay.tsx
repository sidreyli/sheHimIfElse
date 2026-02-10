import { useEffect, useRef } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

/** MediaPipe hand connections (pairs of landmark indices to draw lines between) */
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // index
  [0, 9], [9, 10], [10, 11], [11, 12],  // middle
  [0, 13], [13, 14], [14, 15], [15, 16],// ring
  [0, 17], [17, 18], [18, 19], [19, 20],// pinky
  [5, 9], [9, 13], [13, 17],            // palm
];

interface ASLOverlayProps {
  landmarks: NormalizedLandmark[][] | null;
  /** Native video width (for aspect ratio calculation) */
  width: number;
  /** Native video height (for aspect ratio calculation) */
  height: number;
}

/**
 * Compute the visible region of an object-cover video within its container.
 * Returns the offset and scale to map normalised landmark coords into the
 * container's coordinate space.
 */
function computeObjectCoverTransform(
  videoW: number,
  videoH: number,
  containerW: number,
  containerH: number,
) {
  const videoAspect = videoW / videoH;
  const containerAspect = containerW / containerH;

  let scale: number;
  let offsetX = 0;
  let offsetY = 0;

  if (videoAspect > containerAspect) {
    // Video is wider → height fills, sides cropped
    scale = containerH / videoH;
    offsetX = (containerW - videoW * scale) / 2;
  } else {
    // Video is taller → width fills, top/bottom cropped
    scale = containerW / videoW;
    offsetY = (containerH - videoH * scale) / 2;
  }

  return { offsetX, offsetY, scaledW: videoW * scale, scaledH: videoH * scale };
}

export default function ASLOverlay({ landmarks, width, height }: ASLOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use the canvas element's actual display size so drawing matches on screen
    const rect = canvas.getBoundingClientRect();
    const dw = rect.width;
    const dh = rect.height;

    // Set canvas resolution to match display size (1:1 CSS pixels)
    canvas.width = dw;
    canvas.height = dh;
    ctx.clearRect(0, 0, dw, dh);

    if (!landmarks || width === 0 || height === 0) return;

    // Map normalised [0-1] MediaPipe coords into the object-cover visible area
    const { offsetX, offsetY, scaledW, scaledH } = computeObjectCoverTransform(
      width,
      height,
      dw,
      dh,
    );

    /** Convert a normalised landmark coordinate to canvas pixel */
    const toX = (nx: number) => offsetX + nx * scaledW;
    const toY = (ny: number) => offsetY + ny * scaledH;

    for (const hand of landmarks) {
      // Draw connections
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      for (const [start, end] of HAND_CONNECTIONS) {
        const a = hand[start];
        const b = hand[end];
        if (!a || !b) continue;
        ctx.beginPath();
        ctx.moveTo(toX(a.x), toY(a.y));
        ctx.lineTo(toX(b.x), toY(b.y));
        ctx.stroke();
      }

      // Draw landmark points
      for (const point of hand) {
        ctx.fillStyle = '#a78bfa';
        ctx.beginPath();
        ctx.arc(toX(point.x), toY(point.y), 4, 0, 2 * Math.PI);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }, [landmarks, width, height]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
