import { createContext, useContext, useEffect, type ReactNode } from 'react';
import {
  clampColorBlindIntensity,
  isColorBlindMode,
  type ColorBlindMode,
  type FontSize,
} from '../utils/accessibility';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface AccessibilityContextValue {
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  colorBlindMode: ColorBlindMode;
  setColorBlindMode: (v: ColorBlindMode) => void;
  colorBlindIntensity: number;
  setColorBlindIntensity: (v: number) => void;
  fontSize: FontSize;
  setFontSize: (v: FontSize) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

type RGB = [number, number, number];

const BASE_ACCENTS: Record<'chat' | 'asl' | 'stt', RGB> = {
  chat: [96, 165, 250],
  asl: [52, 211, 153],
  stt: [251, 191, 36],
};

const COLOR_BLIND_TARGETS: Record<Exclude<ColorBlindMode, 'off'>, Record<'chat' | 'asl' | 'stt', RGB>> = {
  deuteranopia: {
    chat: [47, 107, 255],
    asl: [255, 107, 0],
    stt: [184, 50, 232],
  },
  protanopia: {
    chat: [0, 130, 255],
    asl: [255, 170, 0],
    stt: [140, 90, 255],
  },
  tritanopia: {
    chat: [0, 166, 255],
    asl: [255, 87, 125],
    stt: [255, 198, 0],
  },
  achromatopsia: {
    chat: [224, 224, 224],
    asl: [170, 170, 170],
    stt: [118, 118, 118],
  },
};

function blendChannel(base: number, target: number, intensity: number): number {
  return Math.round(base + (target - base) * intensity);
}

function blendColor(base: RGB, target: RGB, intensity: number): RGB {
  return [
    blendChannel(base[0], target[0], intensity),
    blendChannel(base[1], target[1], intensity),
    blendChannel(base[2], target[2], intensity),
  ];
}

function rgbToCss(rgb: RGB): string {
  return `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [highContrast, setHighContrast] = useLocalStorage('sc-high-contrast', false);
  const [legacyColorBlind] = useLocalStorage('sc-color-blind', false);
  const [rawColorBlindMode, setRawColorBlindMode] = useLocalStorage<string>('sc-color-blind-mode', 'off');
  const [rawColorBlindIntensity, setRawColorBlindIntensity] = useLocalStorage<number>('sc-color-blind-intensity', 100);
  const [fontSize, setFontSize] = useLocalStorage<FontSize>('sc-font-size', 'normal');
  const [reducedMotion, setReducedMotion] = useLocalStorage('sc-reduced-motion', false);
  const colorBlindMode =
    isColorBlindMode(rawColorBlindMode)
      ? rawColorBlindMode
      : legacyColorBlind
        ? 'deuteranopia'
        : 'off';
  const colorBlindIntensity = clampColorBlindIntensity(rawColorBlindIntensity);

  const setColorBlindMode = (value: ColorBlindMode) => {
    setRawColorBlindMode(value);
  };

  const setColorBlindIntensity = (value: number) => {
    setRawColorBlindIntensity(clampColorBlindIntensity(value));
  };

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
    const body = document.body;
    const enabled = colorBlindMode !== 'off';
    body.classList.toggle('sc-color-blind', enabled);

    if (!enabled) {
      body.style.removeProperty('--sc-accent-chat-rgb');
      body.style.removeProperty('--sc-accent-asl-rgb');
      body.style.removeProperty('--sc-accent-stt-rgb');
      body.removeAttribute('data-sc-color-blind-mode');
      return;
    }

    const target = COLOR_BLIND_TARGETS[colorBlindMode];
    const intensity = colorBlindIntensity / 100;
    body.setAttribute('data-sc-color-blind-mode', colorBlindMode);
    body.style.setProperty('--sc-accent-chat-rgb', rgbToCss(blendColor(BASE_ACCENTS.chat, target.chat, intensity)));
    body.style.setProperty('--sc-accent-asl-rgb', rgbToCss(blendColor(BASE_ACCENTS.asl, target.asl, intensity)));
    body.style.setProperty('--sc-accent-stt-rgb', rgbToCss(blendColor(BASE_ACCENTS.stt, target.stt, intensity)));
  }, [colorBlindMode, colorBlindIntensity]);

  useEffect(() => {
    document.body.classList.toggle('sc-reduced-motion', reducedMotion);
  }, [reducedMotion]);

  return (
    <AccessibilityContext.Provider
      value={{
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
      }}
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
