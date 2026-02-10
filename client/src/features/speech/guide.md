# Speech Processing Module — Dev 3 Guide

## Your Files
```
features/speech/
├── components/
│   ├── TranscriptPanel.tsx      # Scrollable list of STT results
│   ├── STTIndicator.tsx         # Pulsing mic icon when STT is listening
│   ├── TTSControls.tsx          # Voice picker, rate/pitch/volume sliders
│   └── SpeechModeSelector.tsx   # Toggle: STT-only, TTS-only, both, off
├── hooks/
│   ├── useSpeechToText.ts       # Web Speech API wrapper
│   ├── useTextToSpeech.ts       # SpeechSynthesis wrapper
│   └── useSpeechPipeline.ts     # Orchestrates STT + TTS + events
├── services/
│   ├── sttService.ts            # Low-level SpeechRecognition management
│   ├── ttsService.ts            # Low-level SpeechSynthesis management
│   └── speechBridge.ts          # Listens to asl:recognized -> speaks via TTS
└── index.ts
```

## What to Build

### Phase 1: Standalone STT + TTS
1. **sttService.ts** — Create/configure a `SpeechRecognition` instance:
   ```ts
   const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
   recognition.continuous = true;
   recognition.interimResults = true;
   recognition.lang = 'en-US';
   ```
   Export: `startListening()`, `stopListening()`, `onResult(callback)`, `onError(callback)`.

2. **useSpeechToText.ts** — Hook wrapping sttService. Returns:
   ```ts
   { isListening, transcript, interimText, error, start(), stop() }
   ```
   When a final result arrives, emit:
   ```ts
   eventBus.emit('stt:result', { id, text, speakerId, speakerName, isFinal: true, timestamp });
   ```

3. **ttsService.ts** — Wrapper for `window.speechSynthesis`:
   - `speak(text, config?)` — Creates `SpeechSynthesisUtterance`, applies config
   - `getVoices()` — Returns available voices
   - `stop()` — Cancel current speech

4. **useTextToSpeech.ts** — Hook wrapping ttsService. Returns:
   ```ts
   { isSpeaking, voices, speak(text), stop(), config, setConfig }
   ```

5. **TranscriptPanel.tsx** — Renders a scrollable list of `TranscriptEntry` items. Auto-scrolls to bottom. Color-coded with `text-accent-stt`.

6. **STTIndicator.tsx** — Small pulsing indicator (e.g., mic icon with animated ring) when `isListening` is true.

### Phase 2: Cross-Module Integration
1. **speechBridge.ts** — The key integration piece:
   ```ts
   eventBus.on('asl:recognized', (prediction) => {
     if (ttsEnabled) {
       ttsService.speak(prediction.letter);
     }
   });
   ```
   This makes ASL signs get spoken aloud on the hearing user's side.

2. **useSpeechPipeline.ts** — Combines STT + TTS + bridge. Activates/deactivates based on user's selected mode.

3. Subscribe to `tts:speak` events from any module:
   ```ts
   eventBus.on('tts:speak', ({ text }) => ttsService.speak(text));
   ```

## Libraries
- **No external dependencies** — uses built-in Web Speech API
- `SpeechRecognition` for STT (Chrome/Edge support)
- `SpeechSynthesis` for TTS (all modern browsers)

## Events You Emit
```ts
eventBus.emit('stt:result', {
  id: crypto.randomUUID(),
  text: 'hello world',
  speakerId: localParticipant.id,
  speakerName: localParticipant.displayName,
  isFinal: true,
  timestamp: Date.now()
});
```

## Events You Consume
```ts
eventBus.on('asl:recognized', (prediction) => { /* speak via TTS */ });
eventBus.on('tts:speak', ({ text }) => { /* speak via TTS */ });
eventBus.on('chat:message', (msg) => { /* optionally read chat aloud */ });
```

## Browser Compatibility Note
- Web Speech API STT requires Chrome or Edge (not Firefox/Safari)
- TTS works in all modern browsers
- Show a friendly error if STT is not supported: "Speech recognition requires Chrome or Edge"

## Accessibility
- TranscriptPanel: `aria-live="polite"`, role="log"
- STTIndicator: `aria-label="Speech recognition active"` when listening
- TTSControls: All sliders need labels, voice dropdown needs label
- SpeechModeSelector: Use radio group with proper `fieldset`/`legend`
