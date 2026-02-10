# API Reference

Base URL: `http://localhost:3001`

## Health
### GET /api/health
Returns server status.
```json
{ "status": "ok", "timestamp": 1234567890 }
```

## Rooms
### POST /api/rooms
Create a new room.
```json
// Request
{ "roomName": "My Room", "hostId": "peer-abc123" }

// Response (201)
{ "roomId": "a1b2c3d4", "roomName": "My Room", "hostId": "peer-abc123", "participants": [], "createdAt": 1234567890 }
```

### GET /api/rooms/:id
Get room info.
```json
// Response (200)
{ "roomId": "a1b2c3d4", "roomName": "My Room", "hostId": "peer-abc123", "participants": ["peer-abc123"], "createdAt": 1234567890 }
```

### DELETE /api/rooms/:id
Delete a room. Returns 204 No Content.

## PeerJS Signaling
WebSocket signaling is handled automatically by PeerJS at `/peerjs`.
