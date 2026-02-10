import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/Layout/AppShell';
import Button from '../components/common/Button';

export default function HomePage() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [displayName, setDisplayName] = useState('');

  function handleCreate() {
    const id = crypto.randomUUID().slice(0, 8);
    navigate(`/room/${id}?name=${encodeURIComponent(displayName || 'User')}`);
  }

  function handleJoin() {
    if (!roomId.trim()) return;
    navigate(`/room/${roomId.trim()}?name=${encodeURIComponent(displayName || 'User')}`);
  }

  return (
    <AppShell>
      <div className="flex flex-1 items-center justify-center">
        <section className="w-full max-w-md space-y-6 rounded-2xl border border-surface-600 bg-surface-800 p-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">
              <span className="text-accent-primary">Sign</span>Connect
            </h2>
            <p className="mt-2 text-surface-600 text-sm">
              Multimodal assistive communication — video, ASL, speech, and chat in one place.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium">Your Name</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="mt-1 block w-full rounded-lg border border-surface-600 bg-surface-700 px-4 py-3 text-white placeholder:text-gray-500 focus:border-accent-primary focus:outline-none"
              />
            </label>

            <Button onClick={handleCreate} className="w-full">
              Create New Room
            </Button>

            <div className="flex items-center gap-3">
              <hr className="flex-1 border-surface-600" />
              <span className="text-xs text-gray-400">or join existing</span>
              <hr className="flex-1 border-surface-600" />
            </div>

            <label className="block">
              <span className="text-sm font-medium">Room Code</span>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter room code"
                className="mt-1 block w-full rounded-lg border border-surface-600 bg-surface-700 px-4 py-3 text-white placeholder:text-gray-500 focus:border-accent-primary focus:outline-none"
              />
            </label>

            <Button onClick={handleJoin} variant="secondary" className="w-full" disabled={!roomId.trim()}>
              Join Room
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
