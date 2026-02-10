import { API_BASE, MAX_PARTICIPANTS } from '../../../utils/constants';

export interface RoomDto {
  roomId: string;
  roomName: string;
  hostId: string;
  participants?: string[];
  createdAt: number;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function createRoom(roomName: string, hostId: string): Promise<RoomDto> {
  const response = await fetch(`${API_BASE}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomName, hostId }),
  });
  return readJson<RoomDto>(response);
}

export async function getRoom(roomId: string): Promise<RoomDto> {
  const response = await fetch(`${API_BASE}/api/rooms/${roomId}`);
  return readJson<RoomDto>(response);
}

export async function deleteRoom(roomId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/rooms/${roomId}`, {
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete room ${roomId}`);
  }
}

export function mapRoomName(room: Partial<RoomDto>, roomId: string) {
  return room.roomName || `Room ${roomId}`;
}

export function mapMaxParticipants() {
  return MAX_PARTICIPANTS;
}
