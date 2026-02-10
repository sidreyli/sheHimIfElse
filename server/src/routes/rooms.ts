import { Router } from 'express';
import { roomManager } from '../services/roomManager.js';

export const roomsRouter = Router();

// Create a room
roomsRouter.post('/', (req, res) => {
  const { roomName, hostId } = req.body;
  const room = roomManager.createRoom(roomName, hostId);
  res.status(201).json(room);
});

// Get room info
roomsRouter.get('/:id', (req, res) => {
  const room = roomManager.getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

// Delete room
roomsRouter.delete('/:id', (req, res) => {
  roomManager.deleteRoom(req.params.id);
  res.status(204).send();
});
