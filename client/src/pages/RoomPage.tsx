import { useState } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../components/Layout/AppShell';
import { VideoGrid, MediaControls, useRoom } from '../features/video';
import { ASLCaptionBar } from '../features/asl';
import { STTIndicator } from '../features/speech';
import { ChatPanel, UnifiedTranscript } from '../features/chat';
import { announceToScreenReader } from '../utils/accessibility';
import { formatRoomCode, toSpokenRoomCode } from '../utils/roomCode';

type SidebarTab = 'chat' | 'transcript';

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
        <div className="flex flex-1 items-center justify-center">
          <VideoGrid
            localPeerId={localPeerId}
            localDisplayName={displayName}
            localStream={localStream}
            remoteStreams={remoteStreams}
            remoteDisplayNames={remoteDisplayNames}
            isConnected={isConnected}
            error={error}
          />
        </div>
        <ASLCaptionBar />

        <nav className="flex items-center justify-center gap-4 border-t border-surface-700 bg-surface-800 px-4 py-3">
          <MediaControls
            micEnabled={micEnabled}
            cameraEnabled={cameraEnabled}
            onToggleMic={toggleMic}
            onToggleCamera={toggleCamera}
            onLeave={leaveRoom}
          />
          <STTIndicator />
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
        </div>

        <div
          id="panel-chat"
          role="tabpanel"
          aria-labelledby="tab-chat"
          className={`flex flex-1 flex-col overflow-hidden ${activeTab !== 'chat' ? 'hidden' : ''}`}
        >
          <ChatPanel messages={chatMessages} onSend={sendChat} />
        </div>

        <div
          id="panel-transcript"
          role="tabpanel"
          aria-labelledby="tab-transcript"
          className={`flex flex-1 flex-col overflow-hidden ${activeTab !== 'transcript' ? 'hidden' : ''}`}
        >
          <UnifiedTranscript />
        </div>
      </aside>
    </AppShell>
  );
}
