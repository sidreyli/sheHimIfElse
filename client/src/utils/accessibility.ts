export type FontSize = 'normal' | 'large' | 'extra-large';

export const FONT_SIZE_MAP: Record<FontSize, string> = {
  normal: 'text-base',
  large: 'text-lg',
  'extra-large': 'text-xl',
};

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
