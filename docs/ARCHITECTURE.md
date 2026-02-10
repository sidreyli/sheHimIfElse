# Architecture

## Overview
SignConnect is a multimodal assistive communication platform with 4 independent feature modules that communicate via an event bus.

## Module Architecture
```
┌─────────────────────────────────────────────────────────┐
│                      RoomPage.tsx                        │
│  ┌──────────────┐  ┌──────────┐  ┌──────────┐          │
│  │  Video Grid   │  │  ASL     │  │  Speech  │          │
│  │  (Dev 1)      │  │  (Dev 2) │  │  (Dev 3) │          │
│  └──────┬───────┘  └────┬─────┘  └────┬─────┘          │
│         │               │              │                 │
│  ┌──────▼───────────────▼──────────────▼──────────────┐ │
│  │              Event Bus (mitt)                       │ │
│  └──────────────────────┬─────────────────────────────┘ │
│                         │                                │
│  ┌──────────────────────▼─────────────────────────────┐ │
│  │         Chat & Unified Transcript (Dev 4)          │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Event Flow
1. Video module provides streams + video refs via RoomContext
2. ASL module reads video frames → emits `asl:recognized`
3. Speech module listens for `asl:recognized` → speaks via TTS; also emits `stt:result` from mic
4. Chat module consumes all events → renders unified transcript

## No Cross-Module Imports
Modules in `features/` never import from each other. All communication goes through:
- **Event Bus** (`utils/eventBus.ts`) — typed pub/sub
- **RoomContext** — shared video streams and refs
