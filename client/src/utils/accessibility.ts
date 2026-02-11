export type FontSize = 'normal' | 'large' | 'extra-large';
export type ColorBlindMode = 'off' | 'deuteranopia' | 'protanopia' | 'tritanopia' | 'achromatopsia';

export const FONT_SIZE_MAP: Record<FontSize, string> = {
  normal: 'text-base',
  large: 'text-lg',
  'extra-large': 'text-xl',
};

export const COLOR_BLIND_MODE_LABELS: Record<ColorBlindMode, string> = {
  off: 'Off',
  deuteranopia: 'Deuteranopia',
  protanopia: 'Protanopia',
  tritanopia: 'Tritanopia',
  achromatopsia: 'Achromatopsia',
};

export const COLOR_BLIND_MODES: ColorBlindMode[] = [
  'off',
  'deuteranopia',
  'protanopia',
  'tritanopia',
  'achromatopsia',
];

export function isColorBlindMode(value: string): value is ColorBlindMode {
  return COLOR_BLIND_MODES.includes(value as ColorBlindMode);
}

export function clampColorBlindIntensity(value: number): number {
  if (Number.isNaN(value)) return 100;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', priority);
  el.className = 'sr-only';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
