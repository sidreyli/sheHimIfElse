interface Room {
  roomId: string;
  roomName: string;
  hostId: string;
  participants: string[];
  createdAt: number;
}

class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom(roomName: string, hostId: string): Room {
    const roomId = crypto.randomUUID().slice(0, 8);
    const room: Room = {
      roomId,
      roomName: roomName || `Room ${roomId}`,
      hostId,
      participants: [],
      createdAt: Date.now(),
    };
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }

  addParticipant(roomId: string, peerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.participants.length >= 4) return false;
    room.participants.push(peerId);
    return true;
  }

  removeParticipant(roomId: string, peerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.participants = room.participants.filter((p) => p !== peerId);
  }
}

export const roomManager = new RoomManager();
