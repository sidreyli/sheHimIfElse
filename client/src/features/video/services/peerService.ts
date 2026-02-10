import Peer from 'peerjs/dist/bundler.cjs';
import { PEER_HOST, PEER_PATH, PEER_PORT } from '../../../utils/constants';

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
    port: PEER_PORT,
    path: PEER_PATH,
    secure: false,
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
