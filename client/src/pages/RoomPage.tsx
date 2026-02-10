<<<<<<< HEAD
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
=======
import { useParams } from 'react-router-dom';
import AppShell from '../components/Layout/AppShell';

// Feature module barrel imports — each dev fills in their module
// import { VideoGrid, MediaControls } from '../features/video';
// import { ASLOverlay, ASLCaptionBar } from '../features/asl';
// import { TranscriptPanel, STTIndicator } from '../features/speech';
// import { ChatPanel, UnifiedTranscript } from '../features/chat';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
>>>>>>> clarence

  return (
    <AppShell>
      {/* Center: Video grid area */}
      <section className="flex flex-1 flex-col" aria-label="Video call area">
        <div className="flex flex-1 items-center justify-center">
<<<<<<< HEAD
          <VideoGrid />
        </div>

        {/* ASL caption bar */}
        <ASLCaptionBar />

        {/* Bottom controls */}
        <nav className="flex items-center justify-center gap-4 border-t border-surface-700 bg-surface-800 px-4 py-3">
          <MediaControls />
          <STTIndicator />
=======
          {/* TODO: Dev 1 — <VideoGrid /> goes here */}
          <div className="grid grid-cols-2 gap-4 p-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex h-48 w-72 items-center justify-center rounded-xl border border-surface-600 bg-surface-800"
              >
                <span className="text-gray-500">Participant {i}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ASL caption bar */}
        <div
          aria-live="polite"
          className="border-t border-surface-700 bg-surface-800 px-4 py-2 text-center text-accent-asl"
        >
          {/* TODO: Dev 2 — <ASLCaptionBar /> goes here */}
          ASL captions will appear here
        </div>

        {/* Bottom controls */}
        <nav className="flex items-center justify-center gap-4 border-t border-surface-700 bg-surface-800 px-4 py-3">
          {/* TODO: Dev 1 — <MediaControls /> goes here */}
>>>>>>> clarence
          <span className="rounded-lg bg-surface-700 px-4 py-2 text-sm text-gray-400">
            Room: {roomId}
          </span>
        </nav>
      </section>

      {/* Right sidebar: Chat / Transcript */}
<<<<<<< HEAD
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
=======
      <aside className="flex w-80 flex-col border-l border-surface-700 bg-surface-800" aria-label="Chat and transcript">
        {/* TODO: Dev 4 — <ChatPanel /> + <UnifiedTranscript /> tabbed here */}
        <div className="flex border-b border-surface-700">
          <button className="flex-1 px-4 py-2 text-sm font-medium text-accent-chat">Chat</button>
          <button className="flex-1 px-4 py-2 text-sm font-medium text-gray-400">Transcript</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-center text-sm text-gray-500">Messages will appear here</p>
>>>>>>> clarence
        </div>
      </aside>
    </AppShell>
  );
}
