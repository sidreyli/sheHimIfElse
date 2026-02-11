import Peer from 'peerjs/dist/bundler.cjs';
import { PEER_CLOUD, PEER_HOST, PEER_PATH, PEER_PORT, PEER_SECURE } from '../../../utils/constants';

let peerInstance: Peer | null = null;
let cachedIceServers: RTCIceServer[] | null = null;

const DEFAULT_STUN: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

async function fetchTurnServers(): Promise<RTCIceServer[]> {
  const apiKey = import.meta.env.VITE_METERED_API_KEY;
  if (!apiKey) {
    console.warn('[SignConnect] No TURN servers configured. Set VITE_METERED_API_KEY for cross-network connectivity.');
    return DEFAULT_STUN;
  }

  if (cachedIceServers) return cachedIceServers;

  try {
    const res = await fetch(
      `https://signconnect.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const servers: RTCIceServer[] = await res.json();
    cachedIceServers = [...DEFAULT_STUN, ...servers];
    console.log('[SignConnect] TURN servers configured:', servers.map((s) => s.urls));
    return cachedIceServers;
  } catch (err) {
    console.error('[SignConnect] Failed to fetch TURN credentials, using STUN only:', err);
    return DEFAULT_STUN;
  }
}

export async function createPeer(id: string): Promise<Peer> {
  if (peerInstance?.id === id && !peerInstance.destroyed) {
    return peerInstance;
  }

  if (peerInstance && !peerInstance.destroyed) {
    peerInstance.destroy();
  }

  const iceServers = await fetchTurnServers();

  peerInstance = new Peer(id, {
    host: PEER_HOST,
    port: PEER_CLOUD ? 443 : PEER_PORT,
    path: PEER_PATH,
    secure: PEER_SECURE,
    config: { iceServers },
  });

  return peerInstance;
}

export function getPeer(): Peer | null {
  return peerInstance;
}

export function destroyPeer() {
  if (peerInstance && !peerInstance.destroyed) {
    peerInstance.destroy();
  }
  peerInstance = null;
}
