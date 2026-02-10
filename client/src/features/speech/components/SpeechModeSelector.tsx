import { useId, useState } from 'react';
import type { SpeechMode } from '../hooks/useSpeechPipeline';

type SpeechModeSelectorProps = {
  mode?: SpeechMode;
  onChange?: (mode: SpeechMode) => void;
};

const modeLabels: Array<{ value: SpeechMode; label: string; description: string }> = [
  { value: 'off', label: 'Off', description: 'Disable both speech features.' },
  { value: 'stt', label: 'STT Only', description: 'Speech to text only.' },
  { value: 'tts', label: 'TTS Only', description: 'Text to speech only.' },
  { value: 'both', label: 'Both', description: 'Enable STT and TTS.' },
];

export default function SpeechModeSelector({ mode, onChange }: SpeechModeSelectorProps) {
  const [internalMode, setInternalMode] = useState<SpeechMode>('off');
  const currentMode = mode ?? internalMode;
  const groupId = useId();

  const handleChange = (nextMode: SpeechMode) => {
    if (mode === undefined) {
      setInternalMode(nextMode);
    }

    onChange?.(nextMode);
  };

  return (
    <fieldset className="rounded-xl border border-white/10 bg-white/5 p-4">
      <legend className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
        Speech Mode
      </legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {modeLabels.map((option) => {
          const optionId = `${groupId}-${option.value}`;
          const isSelected = currentMode === option.value;

          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition ${
                isSelected
                  ? 'border-amber-300/60 bg-accent-stt/10 text-white'
                  : 'border-white/10 text-white/70 hover:border-white/20'
              }`}
            >
              <input
                id={optionId}
                type="radio"
                name={groupId}
                value={option.value}
                checked={isSelected}
                onChange={() => handleChange(option.value)}
                className="mt-1 h-4 w-4 accent-amber-400"
              />
              <span>
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="block text-xs text-white/50">{option.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
