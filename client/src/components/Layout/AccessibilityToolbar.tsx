import { useAccessibility } from '../../hooks/useAccessibility';
import type { FontSize } from '../../utils/accessibility';

const FONT_SIZES: { label: string; value: FontSize }[] = [
  { label: 'A', value: 'normal' },
  { label: 'A+', value: 'large' },
  { label: 'A++', value: 'extra-large' },
];

export default function AccessibilityToolbar() {
  const { highContrast, setHighContrast, fontSize, setFontSize, reducedMotion, setReducedMotion } =
    useAccessibility();

  return (
    <nav aria-label="Accessibility controls" className="flex items-center gap-3 text-sm">
      {/* Font size selector */}
      <fieldset className="flex items-center gap-1">
        <legend className="sr-only">Font size</legend>
        {FONT_SIZES.map((fs) => (
          <button
            key={fs.value}
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
        onClick={() => setHighContrast(!highContrast)}
        aria-pressed={highContrast}
        className={`rounded px-3 py-1 transition-colors ${
          highContrast ? 'bg-yellow-400 text-black font-bold' : 'bg-surface-700 hover:bg-surface-600'
        }`}
      >
        Contrast
      </button>

      {/* Reduced motion toggle */}
      <button
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
