# Chat & UI Shell Module — Dev 4 Guide

## Your Files
```
features/chat/
├── components/
│   ├── ChatPanel.tsx            # Container: MessageList + MessageInput
│   ├── MessageList.tsx          # Scrollable chat messages, auto-scroll
│   ├── MessageInput.tsx         # Text input + send button
│   ├── MessageBubble.tsx        # Single message, color-coded by source
│   ├── SystemMessage.tsx        # "User joined", "ASL started" etc.
│   └── UnifiedTranscript.tsx    # Merged feed: chat + ASL + STT chronologically
├── hooks/
│   ├── useChat.ts               # Chat state + send/receive via DataConnection
│   └── useTranscriptMerge.ts    # Merges all event sources into one feed
├── services/
│   ├── chatService.ts           # PeerJS DataConnection messaging
│   └── notificationService.ts   # Browser notification API
└── index.ts
```

## Also Owned: `components/` (shared UI), `pages/`, `docs/`

## What to Build

### Phase 1: Chat UI with Hardcoded Data
1. **MessageBubble.tsx** — Renders a single message. Props: `ChatMessage`. Color-coded border/badge:
   - `chat` → blue (`accent-chat`)
   - `asl` → green (`accent-asl`)
   - `stt` → amber (`accent-stt`)
   Use constants from `utils/constants.ts` (SOURCE_COLORS, SOURCE_BG_COLORS, SOURCE_LABELS).

2. **SystemMessage.tsx** — Centered, dimmed text for system events (e.g., "Alice joined the room").

3. **MessageList.tsx** — Scrollable container rendering `MessageBubble` and `SystemMessage` items. Auto-scrolls to newest message. Use `role="log"` and `aria-live="polite"`.

4. **MessageInput.tsx** — Text input + Send button. Enter key sends. Min 44px touch target on button. `aria-label="Type a message"`.

5. **ChatPanel.tsx** — Composes MessageList + MessageInput. Takes up the right sidebar.

6. **Start with hardcoded messages** to verify the UI looks right before wiring up real data.

### Phase 2: Integration
1. **useChat.ts** — Hook that:
   - Maintains message state: `ChatMessage[]`
   - Sends messages via PeerJS DataConnection (from Dev 1's peer service)
   - Receives messages from DataConnection
   - On send, emits: `eventBus.emit('chat:message', msg)`

2. **useTranscriptMerge.ts** — The **key integration hook**:
   ```ts
   // Subscribe to ALL event sources
   eventBus.on('chat:message', (msg) => addToFeed(msg));
   eventBus.on('asl:recognized', (pred) => addToFeed({
     id: crypto.randomUUID(),
     source: 'asl',
     content: pred.letter,
     timestamp: pred.timestamp,
     ...
   }));
   eventBus.on('stt:result', (entry) => addToFeed({
     id: entry.id,
     source: 'stt',
     content: entry.text,
     timestamp: entry.timestamp,
     ...
   }));
   ```
   Returns a sorted `ChatMessage[]` feed.

3. **UnifiedTranscript.tsx** — Uses `useTranscriptMerge` to render the merged feed. Same UI as MessageList but shows ALL sources with color coding.

4. **chatService.ts** — Low-level DataConnection management:
   - `sendMessage(conn, message)` — serialize and send
   - `onMessage(conn, callback)` — deserialize incoming
   - Handle connection lifecycle

### Tabbed Sidebar
The right sidebar in `RoomPage.tsx` should have tabs:
- **Chat** tab — shows ChatPanel (only chat messages)
- **Transcript** tab — shows UnifiedTranscript (all sources merged)

## Libraries
- `react-router-dom` — Routing (already set up in App.tsx)
- `lucide-react` — Icons (Send, MessageSquare, etc.)
- `mitt` — Already provided via `eventBus`

## Events You Emit
```ts
eventBus.emit('chat:message', {
  id: crypto.randomUUID(),
  source: 'chat',
  senderId: localParticipant.id,
  senderName: localParticipant.displayName,
  content: 'Hello!',
  timestamp: Date.now()
});
```

## Events You Consume
```ts
eventBus.on('asl:recognized', (pred) => { /* add to unified transcript */ });
eventBus.on('stt:result', (entry) => { /* add to unified transcript */ });
eventBus.on('room:participant-joined', ({ displayName }) => { /* system message */ });
eventBus.on('room:participant-left', ({ peerId }) => { /* system message */ });
```

## Accessibility
- MessageList: `role="log"`, `aria-live="polite"`
- MessageInput: `aria-label="Type a message"`, Enter to send
- MessageBubble: include source label for screen readers (e.g., "ASL: A")
- UnifiedTranscript: `aria-live="polite"`, `role="log"`
- Tab navigation between Chat/Transcript tabs
- All interactive elements min 44px
