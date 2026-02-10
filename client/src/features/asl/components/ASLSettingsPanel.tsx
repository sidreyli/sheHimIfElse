import type { ASLConfig } from '../../../types/asl';

interface ASLSettingsPanelProps {
  config: ASLConfig;
  onConfigChange: (config: ASLConfig) => void;
}

export default function ASLSettingsPanel({ config, onConfigChange }: ASLSettingsPanelProps) {
  return (
    <fieldset className="space-y-4 rounded-xl border border-surface-600 bg-surface-800 p-4">
      <legend className="px-2 text-sm font-semibold text-accent-asl">ASL Settings</legend>

      {/* Enable/disable toggle */}
      <div className="flex items-center justify-between">
        <label htmlFor="asl-enabled" className="text-sm text-gray-300">
          Enable ASL Recognition
        </label>
        <button
          id="asl-enabled"
          role="switch"
          aria-checked={config.enabled}
          onClick={() => onConfigChange({ ...config, enabled: !config.enabled })}
          className={`relative h-7 w-12 rounded-full transition-colors ${
            config.enabled ? 'bg-accent-asl' : 'bg-surface-600'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
              config.enabled ? 'translate-x-5' : ''
            }`}
          />
          <span className="sr-only">{config.enabled ? 'Enabled' : 'Disabled'}</span>
        </button>
      </div>

      {/* Confidence threshold slider */}
      <div className="space-y-1">
        <label htmlFor="asl-confidence" className="flex items-center justify-between text-sm text-gray-300">
          <span>Confidence Threshold</span>
          <span className="font-mono text-accent-asl">{Math.round(config.confidenceThreshold * 100)}%</span>
        </label>
        <input
          id="asl-confidence"
          type="range"
          min={0.3}
          max={0.95}
          step={0.05}
          value={config.confidenceThreshold}
          onChange={(e) =>
            onConfigChange({ ...config, confidenceThreshold: parseFloat(e.target.value) })
          }
          className="w-full accent-accent-asl"
          aria-label={`Confidence threshold: ${Math.round(config.confidenceThreshold * 100)}%`}
        />
      </div>

      {/* Smoothing window slider */}
      <div className="space-y-1">
        <label htmlFor="asl-smoothing" className="flex items-center justify-between text-sm text-gray-300">
          <span>Smoothing Window</span>
          <span className="font-mono text-accent-asl">{config.smoothingWindow} frames</span>
        </label>
        <input
          id="asl-smoothing"
          type="range"
          min={3}
          max={15}
          step={1}
          value={config.smoothingWindow}
          onChange={(e) =>
            onConfigChange({ ...config, smoothingWindow: parseInt(e.target.value, 10) })
          }
          className="w-full accent-accent-asl"
          aria-label={`Smoothing window: ${config.smoothingWindow} frames`}
        />
      </div>
    </fieldset>
  );
}
