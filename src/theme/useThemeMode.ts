import {useEffect, useState} from 'react';
import {Platform, useColorScheme} from 'react-native';

export type ThemeMode = 'light' | 'dark';
export const DEFAULT_THEME_MODE: ThemeMode = 'dark';

/** Same key App.tsx uses for the rest of the web app. */
export const THEME_STORAGE_KEY = 'exsurvey-theme';

export function readStoredTheme(): ThemeMode | null {
  if (Platform.OS !== 'web') {
    return null;
  }
  try {
    const v = (globalThis as any).localStorage?.getItem(THEME_STORAGE_KEY);
    return v === 'dark' || v === 'light' ? v : null;
  } catch {
    return null;
  }
}

/* Shared in-memory store so every auth screen (login, OTP, sign-up) switches
 * together - on web and on native. Web additionally persists the choice. */
let current: ThemeMode | null = readStoredTheme();
const listeners = new Set<() => void>();

/** Switch theme everywhere. Web also saves it and tells App.tsx's dark CSS. */
export function setThemeMode(mode: ThemeMode) {
  current = mode;
  if (Platform.OS === 'web') {
    const g = globalThis as any;
    try {
      g.localStorage?.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // storage unavailable (private mode etc.) - still works for this visit
    }
    if (g.document?.documentElement) {
      g.document.documentElement.dataset.exsurveyTheme = mode;
    }
    g.dispatchEvent?.(new g.Event('exsurvey-theme-change'));
  }
  listeners.forEach(l => l());
}

/**
 * Resolves the active theme: the person's choice (toggle) wins, then an
 * explicit `preferred` mode, then the default. System mode is opt-in.
 */
export function useThemeMode(preferred?: ThemeMode | 'system'): ThemeMode {
  const system = useColorScheme();
  const [chosen, setChosen] = useState<ThemeMode | null>(current);

  useEffect(() => {
    const sync = () => setChosen(current);
    listeners.add(sync);
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, []);

  if (chosen) {
    return chosen;
  }
  if (preferred === 'light' || preferred === 'dark') {
    return preferred;
  }
  return preferred === 'system' ? (system === 'dark' ? 'dark' : 'light') : DEFAULT_THEME_MODE;
}
