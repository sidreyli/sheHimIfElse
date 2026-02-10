# Video Calling Module — Dev 1 Guide

## Your Files
```
features/video/
├── components/
│   ├── VideoGrid.tsx        # 2x2 grid rendering all participants
│   ├── VideoTile.tsx        # Single video element + name overlay + mute icon
│   ├── LocalPreview.tsx     # Camera preview before joining
│   ├── MediaControls.tsx    # Mute mic, toggle camera, screen share, leave
│   └── RoomLobby.tsx        # Create/join room UI (may replace HomePage logic)
├── hooks/
│   ├── usePeerConnection.ts # Manages PeerJS connections for each remote user
│   ├── useMediaDevices.ts   # getUserMedia, device enumeration, track toggling
│   └── useRoom.ts           # Room lifecycle: create via API, join, leave, cleanup
├── services/
│   ├── peerService.ts       # Singleton PeerJS Peer instance
│   └── roomService.ts       # fetch() calls to server/src/routes/rooms.ts
└── index.ts                 # Public exports
```

## Also Owned: `server/` (entire backend)

## What to Build

### Phase 1: Basic Video Calling
1. **peerService.ts** — Create a PeerJS `Peer` instance connecting to the backend PeerServer at `localhost:3001/peerjs`. Export functions: `createPeer(id)`, `destroyPeer()`, `getPeer()`.
2. **useMediaDevices.ts** — Hook that calls `navigator.mediaDevices.getUserMedia({ video: true, audio: true })`, returns `{ localStream, toggleMic(), toggleCamera(), error }`.
3. **usePeerConnection.ts** — Hook that:
   - Listens for incoming calls (`peer.on('call', ...)`)
   - Answers with `localStream`
   - Calls remote peers when they join
   - Stores remote streams in `RoomContext.remoteStreams`
4. **VideoTile.tsx** — Takes a `MediaStream` prop, renders `<video autoPlay playsInline>`, attaches stream via ref. Shows participant name overlay.
5. **VideoGrid.tsx** — Reads from `RoomContext`, renders up to 4 `VideoTile`s in a 2x2 CSS grid.
6. **MediaControls.tsx** — Buttons for mute/unmute, camera on/off, leave room. Each button needs: icon + text label, `aria-pressed` state, min 44px touch target.

### Phase 2: Integration
- Register each `<video>` element in `RoomContext.videoRefs` so the ASL module can read frames from any participant's video.
- Emit `room:participant-joined` and `room:participant-left` events via `eventBus`.
- Wire up `useRoom.ts` to call the backend API for room creation/joining.

## Key Context You Provide to Other Modules
- `RoomContext.localStream` — the local MediaStream (ASL module reads this)
- `RoomContext.videoRefs` — Map<peerId, HTMLVideoElement> (ASL module reads frames from these)
- `RoomContext.remoteStreams` — Map<peerId, MediaStream>

## Libraries
- `peerjs` (client) — WebRTC peer connections
- `peer` (server) — ExpressPeerServer for signaling

## Events You Emit
```ts
eventBus.emit('room:participant-joined', { peerId, displayName });
eventBus.emit('room:participant-left', { peerId });
eventBus.emit('room:connected');
eventBus.emit('room:disconnected');
```

## Events You May Consume
None — video module is the foundation layer.

## Server Endpoints to Create
- `POST /api/rooms` — Create a room, returns `{ roomId, roomName }`
- `GET /api/rooms/:id` — Get room info + participant list
- `DELETE /api/rooms/:id` — Clean up room
- `GET /api/health` — Health check

## Accessibility Requirements
- All buttons must have `aria-label` and visible text labels
- Video tiles need `aria-label="Video feed from {name}"`
- Keyboard: Tab navigates controls, Enter/Space activates
- Mute/camera buttons use `aria-pressed`
