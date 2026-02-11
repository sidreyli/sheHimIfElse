export const API_BASE = import.meta.env.VITE_API_URL || '';
export const PEER_CLOUD = import.meta.env.VITE_PEER_CLOUD === 'true';

const DEFAULT_PEER_HOST = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
/** Strip any protocol prefix (https://, http://) so PeerJS gets a bare hostname */
function stripProtocol(h: string): string {
  return h.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}
export const PEER_HOST = stripProtocol(import.meta.env.VITE_PEER_HOST || DEFAULT_PEER_HOST);
export const PEER_PORT = Number(import.meta.env.VITE_PEER_PORT || 3001);
export const PEER_PATH = '/peerjs';
export const PEER_SECURE =
  PEER_CLOUD || (typeof window !== 'undefined' && window.location.protocol === 'https:');

export const MAX_PARTICIPANTS = 4;

/** Source color classes for Tailwind */
export const SOURCE_COLORS = {
  chat: 'text-accent-chat',
  asl: 'text-accent-asl',
  stt: 'text-accent-stt',
} as const;

export const SOURCE_BG_COLORS = {
  chat: 'bg-accent-chat/10 border-accent-chat/30',
  asl: 'bg-accent-asl/10 border-accent-asl/30',
  stt: 'bg-accent-stt/10 border-accent-stt/30',
} as const;

export const SOURCE_LABELS = {
  chat: 'Chat',
  asl: 'ASL',
  stt: 'Speech',
} as const;
