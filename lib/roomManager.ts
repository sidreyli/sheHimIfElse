import { Redis } from '@upstash/redis';

export interface Room {
  roomId: string;
  roomName: string;
  hostId: string;
  participants: string[];
  createdAt: number;
}

const ROOM_TTL_SECONDS = 24 * 60 * 60; // 24 hours

function getRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

function roomKey(roomId: string): string {
  return `room:${roomId}`;
}

export async function createRoom(roomName: string, hostId: string): Promise<Room> {
  const redis = getRedis();
  const roomId = crypto.randomUUID().slice(0, 8);
  const room: Room = {
    roomId,
    roomName: roomName || `Room ${roomId}`,
    hostId,
    participants: [],
    createdAt: Date.now(),
  };
  await redis.set(roomKey(roomId), JSON.stringify(room), { ex: ROOM_TTL_SECONDS });
  return room;
}

export async function getRoom(roomId: string): Promise<Room | null> {
  const redis = getRedis();
  const data = await redis.get<string>(roomKey(roomId));
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data as unknown as Room;
}

export async function deleteRoom(roomId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(roomKey(roomId));
}
