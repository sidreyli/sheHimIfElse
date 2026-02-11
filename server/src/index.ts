import express from 'express';
import { createServer } from 'http';
import { config } from './config.js';
import { corsMiddleware } from './middleware/cors.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { healthRouter } from './routes/health.js';
import { roomsRouter } from './routes/rooms.js';
import { aslRouter } from './routes/asl.js';
import { setupPeerServer } from './peer/peerServer.js';

const app = express();
const server = createServer(app);

// Middleware
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' })); // Increased for base64 video frames
app.use(rateLimiter);

// Routes
app.use('/api/health', healthRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/asl', aslRouter);

// PeerJS signaling server
app.use(setupPeerServer(server));

server.listen(config.port, () => {
  console.log(`SignConnect server running on http://localhost:${config.port}`);
  console.log(`PeerJS server at /peerjs`);
});
