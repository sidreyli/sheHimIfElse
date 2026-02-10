import { useState } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../components/Layout/AppShell';
import { VideoGrid, MediaControls } from '../features/video';
import { ASLCaptionBar } from '../features/asl';
import { STTIndicator } from '../features/speech';
import { ChatPanel, UnifiedTranscript } from '../features/chat';

type SidebarTab = 'chat' | 'transcript';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [activeTab, setActiveTab] = useState<SidebarTab>('chat');

  return (
    <AppShell>
      {/* Center: Video grid area */}
      <section className="flex flex-1 flex-col" aria-label="Video call area">
        <div className="flex flex-1 items-center justify-center">
          <VideoGrid />
        </div>

        {/* ASL caption bar */}
        <ASLCaptionBar />

        {/* Bottom controls */}
        <nav className="flex items-center justify-center gap-4 border-t border-surface-700 bg-surface-800 px-4 py-3">
          <MediaControls />
          <STTIndicator />
          <span className="rounded-lg bg-surface-700 px-4 py-2 text-sm text-gray-400">
            Room: {roomId}
          </span>
        </nav>
      </section>

      {/* Right sidebar: Chat / Transcript */}
      <aside
        className="flex w-80 flex-col border-l border-surface-700 bg-surface-800"
        aria-label="Chat and transcript"
      >
        {/* Tabs */}
        <div className="flex border-b border-surface-700" role="tablist" aria-label="Sidebar tabs">
          <button
            role="tab"
            aria-selected={activeTab === 'chat'}
            aria-controls="panel-chat"
            id="tab-chat"
            onClick={() => setActiveTab('chat')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'chat'
                ? 'text-accent-chat border-b-2 border-accent-chat'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Chat
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'transcript'}
            aria-controls="panel-transcript"
            id="tab-transcript"
            onClick={() => setActiveTab('transcript')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'transcript'
                ? 'text-accent-primary border-b-2 border-accent-primary'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Transcript
          </button>
        </div>

        {/* Tab panels */}
        <div
          id="panel-chat"
          role="tabpanel"
          aria-labelledby="tab-chat"
          className={`flex flex-1 flex-col overflow-hidden ${activeTab !== 'chat' ? 'hidden' : ''}`}
        >
          <ChatPanel />
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
