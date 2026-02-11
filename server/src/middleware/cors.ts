import cors from 'cors';
import { config } from '../config.js';

const allowedOrigins = config.corsOrigin
  ? config.corsOrigin.split(',').map((o) => o.trim())
  : [];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else if (allowedOrigins.includes('*')) {
      callback(null, true);
    } else if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'DELETE'],
});
