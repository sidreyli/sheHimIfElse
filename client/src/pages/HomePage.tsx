import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/Layout/AppShell';
import Button from '../components/common/Button';
import { announceToScreenReader } from '../utils/accessibility';
import {
  formatRoomCode,
  generateRoomCode,
  isValidRoomCode,
  normalizeRoomCode,
  toSpokenRoomCode,
} from '../utils/roomCode';

export default function HomePage() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roomCodeError, setRoomCodeError] = useState('');

  const formattedRoomId = useMemo(() => formatRoomCode(roomId), [roomId]);
  const canJoin = isValidRoomCode(formattedRoomId);

  function handleCreate() {
    const code = generateRoomCode();
    announceToScreenReader(`Room code created: ${toSpokenRoomCode(code)}.`);
    navigate(`/room/${code}?name=${encodeURIComponent(displayName || 'User')}`);
  }

  function handleJoin() {
    if (!canJoin) {
      const message = 'Enter an 8-character room code. Hyphen is optional.';
      setRoomCodeError(message);
      announceToScreenReader(message, 'assertive');
      return;
    }

    setRoomCodeError('');
    navigate(`/room/${formattedRoomId}?name=${encodeURIComponent(displayName || 'User')}`);
  }

  function handleRoomCodeChange(value: string) {
    const formatted = formatRoomCode(normalizeRoomCode(value));
    setRoomId(formatted);
    if (roomCodeError) {
      setRoomCodeError('');
    }
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
                value={formattedRoomId}
                onChange={(e) => handleRoomCodeChange(e.target.value)}
                placeholder="ABCD-EFGH"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                aria-label="Room code"
                aria-describedby="room-code-help room-code-sr-help"
                aria-invalid={roomCodeError ? 'true' : 'false'}
                className="mt-1 block w-full rounded-lg border border-surface-600 bg-surface-700 px-4 py-3 font-mono tracking-[0.2em] uppercase text-white placeholder:text-gray-500 focus:border-accent-primary focus:outline-none"
              />
              <p id="room-code-help" className="mt-2 text-xs text-gray-400">
                8 characters; you can type with or without hyphen.
              </p>
              <p id="room-code-sr-help" className="sr-only">
                Room code format is four characters, dash, four characters.
              </p>
              {roomCodeError && (
                <p role="alert" className="mt-2 text-xs text-red-300">
                  {roomCodeError}
                </p>
              )}
            </label>

            <Button onClick={handleJoin} variant="secondary" className="w-full" disabled={!canJoin}>
              Join Room
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
