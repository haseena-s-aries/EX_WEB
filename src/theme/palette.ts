/** Shared Ex-Survey colour tokens (dark = field palette, light = daylight palette). */
export const DARK = {
  bg: '#0B111E',
  card: '#131C2E',
  bar: '#0F172A',
  elevated: '#1E293B',
  border: '#1E293B',
  borderActive: '#334155',
  text: '#F8FAFC',
  secondary: '#94A3B8',
  muted: '#64748B',
  amber: '#F59E0B',
  yellow: '#FBBF24',
  critical: '#EF4444',
  success: '#10B981',
  cyan: '#38BDF8',
  indigo: '#818CF8',
  onAmber: '#0B111E',
  shadow: '0 8px 24px rgba(0,0,0,0.35)',
};

export const LIGHT: typeof DARK = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  bar: '#FFFFFF',
  elevated: '#EEF2FA',
  border: '#CBD5E1',
  borderActive: '#94A3B8',
  text: '#0F172A',
  secondary: '#475569',
  muted: '#64748B',
  amber: '#D97706',
  yellow: '#F59E0B',
  critical: '#DC2626',
  success: '#059669',
  cyan: '#0284C7',
  indigo: '#4F46E5',
  onAmber: '#FFFFFF',
  shadow: '0 2px 8px rgba(15,23,42,0.05)',
};

export type Colors = typeof DARK;

/** Append an alpha channel (hex) to a #RRGGBB colour. */
export const tint = (hex: string, alpha = '22') => `${hex}${alpha}`;
