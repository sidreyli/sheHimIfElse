import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { ExpressPeerServer } from 'peer';

const app = express();
const server = createServer(app);

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin }));

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

app.use(peerServer);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`PeerJS signaling server running on port ${PORT}`);
});
