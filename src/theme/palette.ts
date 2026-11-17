/** Shared Ex-Survey colour tokens (dark = field palette, light = daylight palette). */
export const DARK = {
  bg: '#071b26',
  card: '#102b38',
  bar: '#092331',
  elevated: '#1a3b49',
  border: '#1a3b49',
  borderActive: '#3c6272',
  text: '#f0f6f8',
  secondary: '#acc6d1',
  muted: '#7396a7',
  amber: '#F59E0B',
  yellow: '#FBBF24',
  critical: '#EF4444',
  success: '#10B981',
  cyan: '#63d1eb',
  indigo: '#35788b',
  onAmber: '#071b26',
  shadow: '0 8px 24px rgba(0,0,0,0.35)',
};

export const LIGHT: typeof DARK = {
  bg: '#f0f6f8',
  card: '#FFFFFF',
  bar: '#FFFFFF',
  elevated: '#e5eff2',
  border: '#d3e1e6',
  borderActive: '#acc6d1',
  text: '#092331',
  secondary: '#456270',
  muted: '#7396a7',
  amber: '#D97706',
  yellow: '#F59E0B',
  critical: '#DC2626',
  success: '#059669',
  cyan: '#126077',
  indigo: '#0b596a',
  onAmber: '#FFFFFF',
  shadow: '0 2px 8px rgba(15,23,42,0.05)',
};

export type Colors = typeof DARK;

/** Append an alpha channel (hex) to a #RRGGBB colour. */
export const tint = (hex: string, alpha = '22') => `${hex}${alpha}`;
