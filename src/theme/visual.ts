import {Platform} from 'react-native';
import {fontFamily} from './typography';

export const visual = {
  ink: '#092331',
  deep: '#061824',
  rail: '#0b2d3c',
  signal: '#7be0cd',
  signalText: '#006455',
  ocean: '#126077',
  sheet: '#f4f8f9',
  line: '#d3e1e6',
  radius: {control: 8, panel: 16, hero: 20},
  spacing: {control: 12, panel: 20, page: 28},
  body: fontFamily,
  display: fontFamily,
  mono: Platform.select({web: "Consolas, 'SFMono-Regular', monospace", ios: 'Menlo', android: 'monospace'}),
  shadow: '0 12px 32px rgba(6, 35, 49, .09)',
} as const;
