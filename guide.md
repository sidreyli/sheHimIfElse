# SignConnect — Team Development Guide

## Quick Start
```bash
# Terminal 1: Server
cd server && npm install && npm run dev

# Terminal 2: Client
cd client && npm install && npm run dev
```

Open http://localhost:5173 to see the app.

---

## Team Assignments

| Dev | Module | Files You Own | Guide |
|-----|--------|---------------|-------|
| **Dev 1** | Video Calling + Backend | `client/src/features/video/`, `server/` | [video/guide.md](client/src/features/video/guide.md) |
| **Dev 2** | ASL Recognition + ML | `client/src/features/asl/`, `ml/` | [asl/guide.md](client/src/features/asl/guide.md) |
| **Dev 3** | Speech Processing | `client/src/features/speech/` | [speech/guide.md](client/src/features/speech/guide.md) |
| **Dev 4** | Chat, UI & Accessibility | `client/src/features/chat/`, `components/`, `pages/`, `docs/` | [chat/guide.md](client/src/features/chat/guide.md) |

**Read your guide.md** — it has detailed instructions on what to build, which events to emit/consume, and accessibility requirements.

---

## What's Already Done (Phase 0)

Everything you need to start working in parallel is set up:

### Shared Types (`client/src/types/`)
- `room.ts` — `Participant`, `RoomConfig`, `RoomState`
- `message.ts` — `ChatMessage`, `MessageSource` ('chat' | 'asl' | 'stt')
- `asl.ts` — `ASLPrediction`, `HandLandmark`, `ASLConfig`
- `speech.ts` — `TranscriptEntry`, `TTSConfig`, `STTConfig`
- `events.ts` — `EventMap` with all cross-module event definitions

### Event Bus (`client/src/utils/eventBus.ts`)
Typed pub/sub using `mitt`. This is how modules communicate:
```ts
import { eventBus } from '../../utils/eventBus';

// Emit (from your module)
eventBus.emit('asl:recognized', { letter: 'A', confidence: 0.95, ... });

// Subscribe (from another module)
eventBus.on('stt:result', (entry) => { /* handle */ });

// Cleanup (in useEffect return)
eventBus.off('stt:result', handler);
```

### Event Contract
| Event | Emitter | Consumers | Payload |
|-------|---------|-----------|---------|
| `asl:recognized` | Dev 2 | Dev 3, Dev 4 | `ASLPrediction` |
| `stt:result` | Dev 3 | Dev 4 | `TranscriptEntry` |
| `chat:message` | Dev 4 | Dev 3 (optional) | `ChatMessage` |
| `tts:speak` | Any | Dev 3 | `{ text, priority? }` |
| `room:participant-joined` | Dev 1 | Dev 4 | `{ peerId, displayName }` |
| `room:participant-left` | Dev 1 | Dev 4 | `{ peerId }` |

### RoomContext (`client/src/contexts/RoomContext.tsx`)
Provides shared state that multiple modules need:
- `localStream` — local user's MediaStream (Dev 1 sets, Dev 2 reads)
- `remoteStreams` — Map of peer streams (Dev 1 sets)
- `videoRefs` — Map<peerId, HTMLVideoElement> (Dev 1 registers, Dev 2 reads for ASL)
- `participants` — current participant list
- `isConnected` — connection state

### Shared UI Components (`client/src/components/`)
- `Layout/AppShell.tsx` — Full page wrapper with header
- `Layout/Header.tsx` — Top bar with logo + accessibility toolbar
- `Layout/AccessibilityToolbar.tsx` — Font size, high contrast, reduced motion
- `common/Button.tsx` — Styled button with variants (primary/secondary/danger/ghost)
- `common/Modal.tsx` — Dialog component using `<dialog>` element
- `common/Toast.tsx` — Non-blocking notification with auto-dismiss
- `common/Loader.tsx` — Skeleton loading state

### Pages
- `pages/HomePage.tsx` — Landing page with create/join room
- `pages/RoomPage.tsx` — Room layout with placeholder slots for each module

### Server (`server/`)
- Express + PeerServer running on port 3001
- Room CRUD API: `POST /api/rooms`, `GET /api/rooms/:id`, `DELETE /api/rooms/:id`
- Health check: `GET /api/health`
- PeerJS signaling at `/peerjs`

### Tailwind Theme
Custom colors for source coding are configured:
- `accent-chat` (blue) — chat messages
- `accent-asl` (green) — ASL translations
- `accent-stt` (amber) — speech transcriptions
- `accent-primary` (purple) — primary brand color
- `surface-900/800/700/600` — dark theme surfaces

---

## Rules

1. **Only edit files in your assigned module**. Shared code is frozen after Phase 0.
2. **Never import from another feature module**. Use `eventBus` or `RoomContext` instead.
3. **Use the color constants** from `utils/constants.ts` for source coding.
4. **Accessibility**: Every interactive element needs `aria-label`, keyboard support, and 44px min touch target.
5. **Export from index.ts**: Your module's `index.ts` is what `RoomPage.tsx` imports.

---

## Integration Checklist (Phase 2)

When you're ready to integrate, uncomment the imports in `pages/RoomPage.tsx` and wire your components into the layout:

- [ ] Dev 1: `VideoGrid` in center area, `MediaControls` in bottom bar
- [ ] Dev 2: `ASLOverlay` positioned over video tiles, `ASLCaptionBar` below grid
- [ ] Dev 3: `STTIndicator` in bottom bar, `TranscriptPanel` available in sidebar
- [ ] Dev 4: `ChatPanel` + `UnifiedTranscript` as tabbed sidebar, wire up `useTranscriptMerge`

---

## Docs
- [Architecture](docs/ARCHITECTURE.md) — system design and event flow
- [API Reference](docs/API.md) — server endpoints
- [Setup](docs/SETUP.md) — installation instructions
- [Demo Script](docs/DEMO_SCRIPT.md) — hackathon presentation guide
