import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../components/Layout/AppShell';
import { VideoGrid, MediaControls, useRoom } from '../features/video';
import { ASLCaptionBar, ASLOverlay, ASLSettingsPanel, useASLVisionPipeline } from '../features/asl';
import { STTIndicator, SpeechModeSelector, TTSControls } from '../features/speech';
import { useSpeechPipeline } from '../features/speech/hooks/useSpeechPipeline';
import { ChatPanel, UnifiedTranscript } from '../features/chat';
import { announceToScreenReader } from '../utils/accessibility';
import { formatRoomCode, toSpokenRoomCode } from '../utils/roomCode';
import type { ASLConfig } from '../types/asl';

type SidebarTab = 'chat' | 'transcript' | 'settings';

export default function RoomPage() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('chat');
  const { roomId = '' } = useParams<{ roomId: string }>();
  const displayRoomCode = formatRoomCode(roomId);
  const spokenRoomCode = toSpokenRoomCode(roomId);
  const {
    localPeerId,
    displayName,
    localStream,
    remoteStreams,
    remoteDisplayNames,
    isConnected,
    error,
    micEnabled,
    cameraEnabled,
    toggleMic,
    toggleCamera,
    chatMessages,
    sendChat,
    leaveRoom,
  } = useRoom();

  // ASL pipeline — runs on local video
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [aslConfig, setAslConfig] = useState<ASLConfig>({
    enabled: true,
    confidenceThreshold: 0.6,
    smoothingWindow: 8,
  });
  const asl = useASLVisionPipeline(localVideoRef, aslConfig);

  // Speech pipeline
  const speech = useSpeechPipeline();

  // Disable TTS when mic is off, enable when mic is on
  const savedSpeechMode = useRef(speech.mode);
  useEffect(() => {
    if (!micEnabled) {
      savedSpeechMode.current = speech.mode;
      if (speech.mode === 'tts' || speech.mode === 'both') {
        speech.setMode('off');
      }
      speech.tts.stop();
    } else {
      if (savedSpeechMode.current === 'tts' || savedSpeechMode.current === 'both') {
        speech.setMode(savedSpeechMode.current);
      }
    }
  }, [micEnabled]);

  // Attach localVideoRef to the first video element when localStream is available
  // We use a callback ref pattern in VideoGrid's local tile
  const handleLocalVideoRef = useCallback((el: HTMLVideoElement | null) => {
    localVideoRef.current = el;
  }, []);

  async function handleCopyRoomCode() {
    try {
      await navigator.clipboard.writeText(displayRoomCode);
      announceToScreenReader('Room code copied.');
    } catch {
      announceToScreenReader('Copy failed. You can select the room code manually.', 'assertive');
    }
  }

  return (
    <AppShell>
      <section className="flex flex-1 flex-col" aria-label="Video call area">
        <div className="relative flex flex-1 items-center justify-center">
          <VideoGrid
            localPeerId={localPeerId}
            localDisplayName={displayName}
            localStream={localStream}
            remoteStreams={remoteStreams}
            remoteDisplayNames={remoteDisplayNames}
            isConnected={isConnected}
            error={error}
            onLocalVideoRef={handleLocalVideoRef}
            localOverlay={
              <ASLOverlay
                landmarks={asl.landmarks}
                width={localVideoRef.current?.videoWidth || 640}
                height={localVideoRef.current?.videoHeight || 480}
              />
            }
          />
        </div>

        {/* ASL status bar */}
        <ASLCaptionBar />

        <nav className="flex items-center justify-center gap-4 border-t border-surface-700 bg-surface-800 px-4 py-3">
          <MediaControls
            micEnabled={micEnabled}
            cameraEnabled={cameraEnabled}
            onToggleMic={toggleMic}
            onToggleCamera={toggleCamera}
            onLeave={leaveRoom}
          />
          <STTIndicator isListening={speech.stt.isListening} />
          {asl.isLoading && (
            <span className="text-xs text-accent-asl animate-pulse">Loading hand tracker...</span>
          )}
          {asl.isRecognizing && (
            <span className="text-xs text-accent-asl animate-pulse">🔍 Recognizing...</span>
          )}
          {asl.error && (
            <span className="max-w-[200px] truncate text-xs text-amber-300" title={asl.error}>
              {asl.error}
            </span>
          )}
          <div className="flex items-center gap-2">
            <span
              className="rounded-lg bg-surface-700 px-4 py-2 font-mono text-sm tracking-[0.2em] text-gray-300"
              aria-label={`Room code ${spokenRoomCode}`}
            >
              {displayRoomCode}
            </span>
            <button
              type="button"
              onClick={handleCopyRoomCode}
              aria-label={`Copy room code ${spokenRoomCode}`}
              className="min-h-[44px] rounded-lg border border-surface-600 bg-surface-700 px-3 py-2 text-sm text-white transition-colors hover:bg-surface-600"
            >
              Copy
            </button>
          </div>
        </nav>
      </section>

      <aside className="flex w-full max-w-sm flex-col border-l border-surface-700 bg-surface-800">
        <div className="flex border-b border-surface-700" role="tablist" aria-label="Sidebar tabs">
          <button
            role="tab"
            id="tab-chat"
            aria-selected={activeTab === 'chat'}
            aria-controls="panel-chat"
            onClick={() => setActiveTab('chat')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'chat'
                ? 'border-b-2 border-accent-chat text-accent-chat'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Chat
          </button>
          <button
            role="tab"
            id="tab-transcript"
            aria-selected={activeTab === 'transcript'}
            aria-controls="panel-transcript"
            onClick={() => setActiveTab('transcript')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'transcript'
                ? 'border-b-2 border-accent-primary text-accent-primary'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Transcript
          </button>
          <button
            role="tab"
            id="tab-settings"
            aria-selected={activeTab === 'settings'}
            aria-controls="panel-settings"
            onClick={() => setActiveTab('settings')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'border-b-2 border-accent-asl text-accent-asl'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Settings
          </button>
        </div>

        <div
          id="panel-chat"
          role="tabpanel"
          aria-labelledby="tab-chat"
          className={`flex flex-1 flex-col overflow-hidden ${activeTab !== 'chat' ? 'hidden' : ''}`}
        >
          <ChatPanel messages={chatMessages} onSend={sendChat} micEnabled={micEnabled} speakText={speech.tts.speak} />
        </div>

        <div
          id="panel-transcript"
          role="tabpanel"
          aria-labelledby="tab-transcript"
          className={`flex flex-1 flex-col overflow-hidden ${activeTab !== 'transcript' ? 'hidden' : ''}`}
        >
          <UnifiedTranscript />
        </div>

        <div
          id="panel-settings"
          role="tabpanel"
          aria-labelledby="tab-settings"
          className={`flex flex-1 flex-col gap-4 overflow-y-auto p-3 ${activeTab !== 'settings' ? 'hidden' : ''}`}
        >
          <ASLSettingsPanel config={aslConfig} onConfigChange={setAslConfig} />
          <SpeechModeSelector mode={speech.mode} onChange={speech.setMode} />
          <TTSControls tts={speech.tts} />
        </div>
      </aside>
    </AppShell>
  );
}
