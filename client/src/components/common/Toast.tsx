import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'error';
  duration?: number;
  onDismiss: () => void;
}

const COLORS = {
  info: 'bg-accent-chat/20 border-accent-chat/40',
  success: 'bg-accent-asl/20 border-accent-asl/40',
  error: 'bg-red-500/20 border-red-500/40',
};

export default function Toast({ message, type = 'info', duration = 4000, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 right-4 z-50 rounded-lg border px-4 py-3 shadow-lg ${COLORS[type]}`}
    >
      {message}
    </div>
  );
}
