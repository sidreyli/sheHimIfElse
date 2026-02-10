# Demo Script

## Setup (before demo)
1. Start server: `cd server && npm run dev`
2. Start client: `cd client && npm run dev`
3. Open two browser tabs (Chrome recommended for STT)

## Demo Flow

### 1. Room Creation (30s)
- Tab 1: Enter name "Alice", click "Create New Room"
- Copy room code
- Tab 2: Enter name "Bob", paste room code, click "Join Room"
- Show: both participants see each other's video

### 2. ASL Recognition (1min)
- Alice signs ASL letters in front of camera
- Show: hand landmarks drawn on video overlay
- Show: recognized letter appears in ASL caption bar (green)
- Show: letter appears in Bob's unified transcript

### 3. Speech-to-Text (1min)
- Bob speaks into microphone
- Show: STT indicator active (pulsing mic)
- Show: transcribed text appears in transcript panel (amber)
- Show: text appears in unified transcript for both

### 4. ASL → TTS Bridge (30s)
- Alice signs a word
- Show: Bob's browser speaks the recognized sign aloud
- Highlight: deaf user's signs become speech for hearing user

### 5. Text Chat (30s)
- Alice types a message in chat
- Show: message appears in both tabs (blue)
- Show: message also appears in unified transcript

### 6. Accessibility (30s)
- Toggle high-contrast mode — show UI adapts
- Change font size — show text scales
- Show keyboard navigation through all controls

## Key Talking Points
- Inclusivity: bridges communication gap between deaf/hard-of-hearing and hearing users
- Real-time: all modalities (ASL, speech, chat) feed into one unified transcript
- Accessibility-first: WCAG AAA, keyboard-navigable, screen reader friendly
- Privacy: all processing happens in-browser (no server-side ML)
