import { createContext, useContext, useEffect, type ReactNode } from 'react';
import type { FontSize } from '../utils/accessibility';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface AccessibilityContextValue {
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  fontSize: FontSize;
  setFontSize: (v: FontSize) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [highContrast, setHighContrast] = useLocalStorage('sc-high-contrast', false);
  const [fontSize, setFontSize] = useLocalStorage<FontSize>('sc-font-size', 'normal');
  const [reducedMotion, setReducedMotion] = useLocalStorage('sc-reduced-motion', false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('sc-font-normal', 'sc-font-large', 'sc-font-extra-large');

    if (fontSize === 'large') {
      root.classList.add('sc-font-large');
    } else if (fontSize === 'extra-large') {
      root.classList.add('sc-font-extra-large');
    } else {
      root.classList.add('sc-font-normal');
    }
  }, [fontSize]);

  useEffect(() => {
    document.body.classList.toggle('sc-high-contrast', highContrast);
  }, [highContrast]);

  useEffect(() => {
    document.body.classList.toggle('sc-reduced-motion', reducedMotion);
  }, [reducedMotion]);

  return (
    <AccessibilityContext.Provider
      value={{ highContrast, setHighContrast, fontSize, setFontSize, reducedMotion, setReducedMotion }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibilityContext() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibilityContext must be used within AccessibilityProvider');
  return ctx;
}
