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
  width: number;
  height: number;
}

export default function ASLOverlay({ landmarks, width, height }: ASLOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    if (!landmarks) return;

    for (const hand of landmarks) {
      // Draw connections
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      for (const [start, end] of HAND_CONNECTIONS) {
        const a = hand[start];
        const b = hand[end];
        if (!a || !b) continue;
        ctx.beginPath();
        ctx.moveTo(a.x * width, a.y * height);
        ctx.lineTo(b.x * width, b.y * height);
        ctx.stroke();
      }

      // Draw landmark points
      for (const point of hand) {
        ctx.fillStyle = '#a78bfa';
        ctx.beginPath();
        ctx.arc(point.x * width, point.y * height, 4, 0, 2 * Math.PI);
        ctx.fill();

        // White outline for visibility
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
      className="pointer-events-none absolute inset-0"
      style={{ width, height }}
    />
  );
}
