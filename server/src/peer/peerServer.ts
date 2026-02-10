import { ExpressPeerServer } from 'peer';
import type { Server } from 'http';

export function setupPeerServer(server: Server) {
  const peerServer = ExpressPeerServer(server, {
    path: '/peerjs',
    allow_discovery: true,
  });

  peerServer.on('connection', (client) => {
    console.log(`Peer connected: ${client.getId()}`);
  });

  peerServer.on('disconnect', (client) => {
    console.log(`Peer disconnected: ${client.getId()}`);
  });

  return peerServer;
}
