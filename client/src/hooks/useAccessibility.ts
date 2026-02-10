import { useAccessibilityContext } from '../contexts/AccessibilityContext';
import { FONT_SIZE_MAP } from '../utils/accessibility';

export function useAccessibility() {
  const ctx = useAccessibilityContext();

  return {
    ...ctx,
    fontSizeClass: FONT_SIZE_MAP[ctx.fontSize],
  };
}
