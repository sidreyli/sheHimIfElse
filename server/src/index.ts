import express from 'express';
import { createServer } from 'http';
import { config } from './config.js';
import { corsMiddleware } from './middleware/cors.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { healthRouter } from './routes/health.js';
import { roomsRouter } from './routes/rooms.js';
import { setupPeerServer } from './peer/peerServer.js';

const app = express();
const server = createServer(app);

// Middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(rateLimiter);

// Routes
app.use('/api/health', healthRouter);
app.use('/api/rooms', roomsRouter);

// PeerJS signaling server
setupPeerServer(server);

server.listen(config.port, () => {
  console.log(`SignConnect server running on http://localhost:${config.port}`);
  console.log(`PeerJS server at /peerjs`);
});
