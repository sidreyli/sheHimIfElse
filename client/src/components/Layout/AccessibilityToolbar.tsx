import { useAccessibility } from '../../hooks/useAccessibility';
import { COLOR_BLIND_MODE_LABELS, COLOR_BLIND_MODES, type ColorBlindMode, type FontSize } from '../../utils/accessibility';

const FONT_SIZES: { label: string; value: FontSize }[] = [
  { label: 'A', value: 'normal' },
  { label: 'A+', value: 'large' },
  { label: 'A++', value: 'extra-large' },
];

export default function AccessibilityToolbar() {
  const {
    highContrast,
    setHighContrast,
    colorBlindMode,
    setColorBlindMode,
    colorBlindIntensity,
    setColorBlindIntensity,
    fontSize,
    setFontSize,
    reducedMotion,
    setReducedMotion,
  } = useAccessibility();

  return (
    <nav aria-label="Accessibility controls" className="flex flex-wrap items-center gap-3 text-sm">
      {/* Font size selector */}
      <fieldset className="flex items-center gap-1">
        <legend className="sr-only">Font size</legend>
        {FONT_SIZES.map((fs) => (
          <button
            key={fs.value}
            type="button"
            onClick={() => setFontSize(fs.value)}
            aria-pressed={fontSize === fs.value}
            className={`min-w-[36px] rounded px-2 py-1 transition-colors ${
              fontSize === fs.value
                ? 'bg-accent-primary text-surface-900 font-bold'
                : 'bg-surface-700 hover:bg-surface-600'
            }`}
          >
            {fs.label}
          </button>
        ))}
      </fieldset>

      {/* High contrast toggle */}
      <button
        type="button"
        onClick={() => setHighContrast(!highContrast)}
        aria-pressed={highContrast}
        className={`rounded px-3 py-1 transition-colors ${
          highContrast ? 'bg-yellow-400 text-black font-bold' : 'bg-surface-700 hover:bg-surface-600'
        }`}
      >
        Contrast
      </button>

      {/* Color-blind profile and intensity controls */}
      <label className="flex min-h-[44px] items-center gap-2 rounded bg-surface-700 px-2 py-1">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-300">Color Vision</span>
        <select
          aria-label="Color blind mode"
          value={colorBlindMode}
          onChange={(e) => setColorBlindMode(e.target.value as ColorBlindMode)}
          className="min-h-[32px] rounded border border-surface-600 bg-surface-800 px-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-primary"
        >
          {COLOR_BLIND_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {COLOR_BLIND_MODE_LABELS[mode]}
            </option>
          ))}
        </select>
      </label>

      {colorBlindMode !== 'off' && (
        <label className="flex min-h-[44px] items-center gap-2 rounded bg-surface-700 px-2 py-1">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-300">Intensity</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            aria-label="Color blind intensity"
            value={colorBlindIntensity}
            onChange={(e) => setColorBlindIntensity(Number(e.target.value))}
            className="h-2 w-24 accent-accent-primary"
          />
          <span className="w-10 text-right text-xs font-semibold text-cyan-300">{colorBlindIntensity}%</span>
        </label>
      )}

      {/* Reduced motion toggle */}
      <button
        type="button"
        onClick={() => setReducedMotion(!reducedMotion)}
        aria-pressed={reducedMotion}
        className={`rounded px-3 py-1 transition-colors ${
          reducedMotion ? 'bg-accent-primary text-surface-900 font-bold' : 'bg-surface-700 hover:bg-surface-600'
        }`}
      >
        Reduce Motion
      </button>
    </nav>
  );
}
