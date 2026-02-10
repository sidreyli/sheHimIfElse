<<<<<<< HEAD
import type { ChatMessage } from '../../../types';
import { SOURCE_LABELS } from '../../../utils/constants';

let permissionGranted = false;

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') {
    permissionGranted = true;
    return true;
  }
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  permissionGranted = result === 'granted';
  return permissionGranted;
}

export function notifyMessage(message: ChatMessage) {
  if (!permissionGranted || document.hasFocus()) return;

  const sourceLabel = SOURCE_LABELS[message.source];
  new Notification(`${sourceLabel} — ${message.senderName}`, {
    body: message.content,
    tag: message.id,
  });
}
=======
// TODO: Dev 4 — Browser notifications for new messages when tab is not focused
>>>>>>> clarence
