import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../lib/cors';
import { getRoom, deleteRoom } from '../../lib/roomManager';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  const id = req.query.id as string;

  if (req.method === 'GET') {
    const room = await getRoom(id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    return res.json(room);
  }

  if (req.method === 'DELETE') {
    await deleteRoom(id);
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
