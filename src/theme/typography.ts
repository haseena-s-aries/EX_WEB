import {Platform, type TextStyle} from 'react-native';

// Web fonts are bundled with the app (public/fonts); native keeps its platform
// font until Montserrat is registered in the native application bundles.
export const fontFamily = Platform.select({
  web: 'Montserrat, "Segoe UI", sans-serif',
  ios: 'System',
  android: 'sans-serif',
});

export const typography = {
  page: {fontFamily, fontSize: 34, lineHeight: 42, fontWeight: '800', letterSpacing: -0.6},
  section: {fontFamily, fontSize: 22, lineHeight: 30, fontWeight: '700'},
  card: {fontFamily, fontSize: 17, lineHeight: 25, fontWeight: '700'},
  kpi: {fontFamily, fontSize: 34, lineHeight: 42, fontWeight: '800', fontVariant: ['tabular-nums']},
  navigation: {fontFamily, fontSize: 14, lineHeight: 21, fontWeight: '600'},
  button: {fontFamily, fontSize: 14, lineHeight: 20, fontWeight: '700'},
  label: {fontFamily, fontSize: 13, lineHeight: 19, fontWeight: '600'},
  body: {fontFamily, fontSize: 14, lineHeight: 21, fontWeight: '400'},
  table: {fontFamily, fontSize: 13, lineHeight: 20, fontWeight: '500'},
  badge: {fontFamily, fontSize: 11, lineHeight: 17, fontWeight: '700'},
} satisfies Record<string, TextStyle>;
