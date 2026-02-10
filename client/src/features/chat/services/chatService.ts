import type { DataConnection } from 'peerjs';
import type { ChatMessage } from '../../../types';

interface ChatPayload {
  type: 'chat:message';
  data: ChatMessage;
}

export function sendMessage(conn: DataConnection, message: ChatMessage) {
  const payload: ChatPayload = { type: 'chat:message', data: message };
  conn.send(payload);
}

export function onMessage(
  conn: DataConnection,
  callback: (message: ChatMessage) => void,
) {
  conn.on('data', (raw) => {
    const payload = raw as ChatPayload;
    if (payload?.type === 'chat:message' && payload.data) {
      callback(payload.data);
    }
  });
}
