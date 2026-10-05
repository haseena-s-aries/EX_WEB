import React from 'react';
import {Platform, Pressable} from 'react-native';
import {SunIcon, MoonIcon} from './LoginArt';
import {setThemeMode, useThemeMode, ThemeMode} from '../theme/useThemeMode';

const PALETTE = {
  light: {bg: '#FFFFFF', pressed: '#F1F5F9', border: '#E2E8F0', moon: '#334155'},
  dark: {bg: '#111827', pressed: '#273449', border: '#1E293B', moon: '#334155'},
};

const web = (style: object) => Platform.select({web: style, default: {}}) as object;

type Props = {
  /** true (default): pinned to the top-right corner. false: sits in normal layout (e.g. inside a header). */
  floating?: boolean;
  size?: number;
  onChange?: (mode: ThemeMode) => void;
};

/** Round sun / moon button that switches the theme on every auth screen. */
export default function ThemeToggle({floating = true, size = 44, onChange}: Props) {
  const mode = useThemeMode();
  const dark = mode === 'dark';
  const p = dark ? PALETTE.dark : PALETTE.light;

  const toggle = () => {
    const next: ThemeMode = dark ? 'light' : 'dark';
    setThemeMode(next);
    onChange?.(next);
  };

  return (
    <Pressable
      onPress={toggle}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      style={({pressed}: any) => [
        floating
          ? {
              position: 'absolute',
              top: Platform.OS === 'web' ? 16 : 52,
              right: 16,
              zIndex: 10,
            }
          : null,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: p.border,
          backgroundColor: pressed ? p.pressed : p.bg,
        },
        web({
          cursor: 'pointer',
          boxShadow: dark
            ? '0 0 20px rgba(245,158,11,0.12)'
            : '0 2px 10px rgba(15,23,42,0.08)',
        }),
      ]}>
      {dark ? <SunIcon /> : <MoonIcon color={p.moon} cutColor={p.bg} />}
    </Pressable>
  );
}
