<<<<<<< HEAD
import { useId } from 'react';
import type { TTSConfig } from '../../../types/speech';
import { useTextToSpeech } from '../hooks/useTextToSpeech';

type TTSControlsProps = {
  tts?: ReturnType<typeof useTextToSpeech>;
};

export default function TTSControls({ tts }: TTSControlsProps) {
  const internalTTS = useTextToSpeech();
  const { voices, config, setConfig } = tts ?? internalTTS;

  const voiceId = useId();
  const rateId = useId();
  const pitchId = useId();
  const volumeId = useId();

  const handleConfigChange = (partial: Partial<TTSConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">Text to Speech</p>
          <p className="mt-1 text-sm text-white/70">Tune voice and playback</p>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor={voiceId} className="text-xs font-semibold uppercase tracking-[0.15em] text-white/50">
          Voice
        </label>
        <select
          id={voiceId}
          value={config.voice ?? ''}
          onChange={(event) =>
            handleConfigChange({
              voice: event.target.value ? event.target.value : null,
            })
          }
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
        >
          <option value="">Default</option>
          {voices.map((voice) => (
            <option key={voice.name} value={voice.name}>
              {voice.name} ({voice.lang})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor={rateId} className="text-xs font-semibold uppercase tracking-[0.15em] text-white/50">
              Rate
            </label>
            <span className="text-xs text-white/40">{config.rate.toFixed(2)}x</span>
          </div>
          <input
            id={rateId}
            type="range"
            min={0.5}
            max={2}
            step={0.05}
            value={config.rate}
            onChange={(event) => handleConfigChange({ rate: Number(event.target.value) })}
            className="mt-2 w-full accent-amber-400"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor={pitchId} className="text-xs font-semibold uppercase tracking-[0.15em] text-white/50">
              Pitch
            </label>
            <span className="text-xs text-white/40">{config.pitch.toFixed(2)}</span>
          </div>
          <input
            id={pitchId}
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={config.pitch}
            onChange={(event) => handleConfigChange({ pitch: Number(event.target.value) })}
            className="mt-2 w-full accent-amber-400"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor={volumeId} className="text-xs font-semibold uppercase tracking-[0.15em] text-white/50">
              Volume
            </label>
            <span className="text-xs text-white/40">{Math.round(config.volume * 100)}%</span>
          </div>
          <input
            id={volumeId}
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={config.volume}
            onChange={(event) => handleConfigChange({ volume: Number(event.target.value) })}
            className="mt-2 w-full accent-amber-400"
          />
        </div>
      </div>
    </div>
  );
=======
// TODO: Dev 3 — TTS voice selection, rate, volume controls
export default function TTSControls() {
  return <div>TTS controls placeholder</div>;
>>>>>>> clarence
}
