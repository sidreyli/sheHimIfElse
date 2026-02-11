import Peer from 'peerjs/dist/bundler.cjs';
import { PEER_CLOUD, PEER_HOST, PEER_PATH, PEER_PORT, PEER_SECURE } from '../../../utils/constants';

let peerInstance: Peer | null = null;

export function createPeer(id: string): Peer {
  if (peerInstance?.id === id && !peerInstance.destroyed) {
    return peerInstance;
  }

  if (peerInstance && !peerInstance.destroyed) {
    peerInstance.destroy();
  }

  peerInstance = new Peer(id, {
    host: PEER_HOST,
    port: PEER_CLOUD ? 443 : PEER_PORT,
    path: PEER_PATH,
    secure: PEER_SECURE,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
      ],
    },
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
