# SignConnect

Multimodal assistive communication platform that bridges video calling, American Sign Language recognition, speech processing, and text chat into one unified experience.

Proud to announce that the website is hosted live using multiple technologies such as vercel, render, upstash redis and metered (which has rate limits)
live link @ https://she-him-if-else.vercel.app

Built for the **Beyond Binary** hackathon.

## Features

- **Video Calling** — Peer-to-peer WebRTC video via PeerJS
- **ASL Recognition** — Real-time hand landmark detection (MediaPipe + ONNX) translates sign language to text
- **Speech Processing** — Speech-to-text and text-to-speech with sentence buffering
- **Unified Transcript** — All modalities merged into a single color-coded chat feed
- **Accessibility** — Font scaling, high contrast, reduced motion, keyboard navigation, ARIA labels

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Express, PeerJS Server, Google Gemini API |
| ML/Vision | MediaPipe Tasks Vision, ONNX Runtime Web |
| Communication | WebRTC (PeerJS), mitt event bus |

## Quick Start

```bash
# Server
cd server
npm install
npm run dev          # http://localhost:3001

# Client (separate terminal)
cd client
npm install
npm run dev          # http://localhost:5173
```

### Environment Variables

Create `server/.env`:

```
PORT=3001
CORS_ORIGIN=http://localhost:5173
GEMINI_API_KEY=your-key-here
```

## Project Structure

```
├── client/src/
│   ├── features/
│   │   ├── video/       # WebRTC video calling
│   │   ├── asl/         # ASL hand recognition
│   │   ├── speech/      # STT / TTS
│   │   └── chat/        # Unified transcript & chat UI
│   ├── components/      # Shared UI (Layout, Modal, Button)
│   ├── contexts/        # RoomContext, AccessibilityContext
│   ├── pages/           # HomePage, RoomPage
│   ├── types/           # Shared TypeScript types & event map
│   └── utils/           # Event bus, constants
├── server/src/
│   ├── routes/          # API endpoints (rooms, asl, health)
│   ├── services/        # Business logic
│   ├── peer/            # PeerJS signaling server
│   └── middleware/      # CORS, rate limiting
├── ml/                  # Python ML pipeline (optional)
└── docs/                # Architecture, API, setup guides
```

## Architecture

Four independent feature modules communicate through a typed event bus — no direct imports between modules.

```
Video → captures streams
  ↓
ASL → reads frames → emits asl:recognized
  ↓
Speech → listens to ASL → TTS; emits stt:result from mic
  ↓
Chat → consumes all events → renders unified transcript
```

## Team

| Module | Owner |
|--------|-------|
| Video & Rooms | Dev 1 |
| ASL Recognition | Dev 2 |
| Speech Processing | Dev 3 |
| Chat & Transcript | Dev 4 |

## License

MIT
