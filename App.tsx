// import React, {useEffect, useState} from 'react';
// import {Platform, Pressable, StyleSheet, Text, View} from 'react-native';
// import AppNavigator from './src/navigation/AppNavigator';

// type ThemeMode = 'light' | 'dark';

// const darkThemeCss = `
//   html[data-exsurvey-theme="dark"],
//   html[data-exsurvey-theme="dark"] body,
//   html[data-exsurvey-theme="dark"] #root {
//     background: #101426 !important;
//     color-scheme: dark;
//   }
//   html[data-exsurvey-theme="dark"] [style*="linear-gradient(135deg"] {
//     background-image: linear-gradient(135deg, #101426 0%, #202043 56%, #1b3451 100%) !important;
//   }
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(255, 255, 255)"],
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(247, 249, 255)"],
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(244, 246, 251)"],
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(248, 249, 252)"],
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(251, 251, 253)"],
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(250, 251, 253)"] {
//     background-color: #1b2238 !important;
//   }
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(248, 249, 252)"],
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(251, 251, 253)"],
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(250, 251, 253)"] {
//     background-color: #151b2e !important;
//   }
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(220, 232, 255)"],
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(233, 229, 255)"],
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(215, 231, 255)"],
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(240, 238, 255)"],
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(233, 237, 255)"],
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(236, 250, 250)"] {
//     background-color: #292943 !important;
//   }
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(255, 240, 215)"] { background-color: #403522 !important; }
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(241, 234, 243)"] { background-color: #352b40 !important; }
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(229, 238, 247)"] { background-color: #263449 !important; }
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(253, 232, 226)"],
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(253, 236, 235)"] { background-color: #432d37 !important; }
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(228, 241, 232)"] { background-color: #273446 !important; }
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(236, 238, 244)"],
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(238, 240, 245)"],
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(238, 240, 246)"],
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(240, 241, 246)"] { background-color: #252d43 !important; }

//   html[data-exsurvey-theme="dark"] [style*="color: rgb(36, 45, 82)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(37, 47, 80)"] { color: #edf0ff !important; }
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(42, 45, 59)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(52, 56, 81)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(59, 63, 89)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(61, 65, 89)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(66, 71, 96)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(73, 77, 99)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(74, 79, 99)"] { color: #d5ddf7 !important; }
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(91, 97, 120)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(106, 111, 131)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(112, 117, 137)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(115, 120, 140)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(116, 121, 140)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(122, 127, 147)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(123, 128, 146)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(125, 129, 146)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(129, 134, 151)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(131, 135, 152)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(133, 137, 154)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(138, 143, 163)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(146, 150, 166)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(149, 153, 169)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(151, 155, 170)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(154, 160, 180)"] { color: #aeb8d5 !important; }
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(101, 117, 108)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(122, 133, 125)"],
//   html[data-exsurvey-theme="dark"] [style*="color: rgb(139, 149, 142)"] { color: #aeb8d5 !important; }

//   html[data-exsurvey-theme="dark"] [style*="border-color: rgb(229, 233, 246)"],
//   html[data-exsurvey-theme="dark"] [style*="border-color: rgb(220, 229, 221)"],
//   html[data-exsurvey-theme="dark"] [style*="border-color: rgb(217, 220, 232)"],
//   html[data-exsurvey-theme="dark"] [style*="border-color: rgb(201, 204, 224)"],
//   html[data-exsurvey-theme="dark"] [style*="border-bottom-color: rgb(240, 241, 246)"],
//   html[data-exsurvey-theme="dark"] [style*="border-top-color: rgb(236, 238, 244)"] { border-color: #343d5a !important; }
//   html[data-exsurvey-theme="dark"] input::placeholder { color: #8791b2 !important; }
//   html[data-exsurvey-theme="dark"] select { background-color: #151b2e !important; color: #edf0ff !important; border-color: #343d5a !important; }
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(184, 165, 248)"] { color: #242d52 !important; }
//   html[data-exsurvey-theme="dark"] [style*="background-color: rgb(184, 165, 248)"] * { color: #242d52 !important; }
// `;

// const darkBackgroundColors: Record<string, string> = {
//   '#fff': '#1b2238', '#ffffff': '#1b2238',
//   '#f7f9ff': '#101426', '#f4f6fb': '#101426',
//   '#dce8ff': '#101426', '#e9e5ff': '#101426', '#d7e7ff': '#101426',
//   '#f8f9fc': '#151b2e', '#fbfbfd': '#151b2e', '#fafbfd': '#151b2e',
//   '#f0eeff': '#292943', '#e9edff': '#292943', '#b8a5f8': '#7165a7',
//   '#fff0d7': '#403522', '#f1eaf3': '#352b40', '#e5eef7': '#263449',
//   '#fde8e2': '#432d37', '#fdeceb': '#432d37', '#e4f1e8': '#273446',
//   '#eafafa': '#213747', '#eceef4': '#252d43', '#eef0f5': '#252d43',
//   '#eef0f6': '#252d43', '#f0f1f6': '#252d43',
// };

// const darkTextColors: Record<string, string> = {
//   '#242d52': '#edf0ff', '#252f50': '#edf0ff',
//   '#2a2d3b': '#d5ddf7', '#343851': '#d5ddf7', '#3b3f59': '#d5ddf7',
//   '#3d4159': '#d5ddf7', '#424760': '#d5ddf7', '#494d63': '#d5ddf7',
//   '#4a4f63': '#d5ddf7',
//   '#5b6178': '#aeb8d5', '#65756c': '#aeb8d5', '#6a6f83': '#aeb8d5',
//   '#707589': '#aeb8d5', '#73788c': '#aeb8d5', '#74798c': '#aeb8d5',
//   '#7a7f93': '#aeb8d5', '#7a857d': '#aeb8d5', '#7b8092': '#aeb8d5',
//   '#7d8192': '#aeb8d5', '#818697': '#aeb8d5', '#838798': '#aeb8d5',
//   '#85899a': '#aeb8d5', '#8a8fa3': '#aeb8d5', '#8b958e': '#aeb8d5',
//   '#9296a6': '#aeb8d5', '#9599a9': '#aeb8d5', '#9599aa': '#aeb8d5',
//   '#979baa': '#aeb8d5', '#9aa0b4': '#aeb8d5',
//   '#a75a0b': '#f2bb66', '#ba4e3c': '#f09a88',
//   '#8053a6': '#c7a0f0', '#3b68aa': '#91b7f3',
// };

// const darkBorderColors: Record<string, string> = {
//   '#e5e9f6': '#343d5a', '#dce5dd': '#343d5a', '#d9dce8': '#343d5a',
//   '#c9cce0': '#343d5a', '#e1e8e1': '#343d5a',
// };

// function normalizeColor(value: string) {
//   const rgb = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
//   if (!rgb) return value.toLowerCase();
//   return `#${rgb.slice(1, 4).map(part => Number(part).toString(16).padStart(2, '0')).join('')}`;
// }

// function collectDarkRules(): string {
//   if (typeof document === 'undefined') return '';
//   const rules: string[] = [];
//   const inspect = (ruleList: CSSRuleList) => {
//     for (let ruleIndex = 0; ruleIndex < ruleList.length; ruleIndex += 1) {
//       const rule = ruleList.item(ruleIndex);
//       if (!rule) continue;
//       const nested = (rule as CSSGroupingRule).cssRules;
//       if (nested) inspect(nested);
//       const cssRule = rule as CSSStyleRule;
//       if (!cssRule.selectorText || !cssRule.style) continue;
//       const declarations: string[] = [];
//       for (let propertyIndex = 0; propertyIndex < cssRule.style.length; propertyIndex += 1) {
//         const property = cssRule.style.item(propertyIndex);
//         const value = cssRule.style.getPropertyValue(property).trim();
//         if (property === 'background-image' && value.includes('linear-gradient')) {
//           declarations.push('background-image: linear-gradient(135deg, #101426 0%, #202043 56%, #1b3451 100%) !important');
//           continue;
//         }
//         const outputProperty = property === 'background' ? 'background-color' : property;
//         const colorKey = normalizeColor(value);
//         let replacement: string | undefined;
//         if (outputProperty === 'background-color') replacement = darkBackgroundColors[colorKey];
//         else if (outputProperty === 'color') replacement = darkTextColors[colorKey];
//         else replacement = darkBorderColors[colorKey];
//         if (!replacement) continue;
//         if (['background-color', 'color', 'border-color', 'border-top-color', 'border-bottom-color', 'outline-color'].includes(outputProperty)) {
//           declarations.push(`${outputProperty}: ${replacement} !important`);
//         }
//       }
//       if (declarations.length) {
//         const selectors = cssRule.selectorText.split(',').map(selector => `html[data-exsurvey-theme="dark"] ${selector.trim()}`);
//         rules.push(`${selectors.join(', ')} { ${declarations.join('; ')}; }`);
//       }
//     }
//   };
//   for (let sheetIndex = 0; sheetIndex < document.styleSheets.length; sheetIndex += 1) {
//     const sheet = document.styleSheets.item(sheetIndex);
//     if (!sheet) continue;
//     try {
//       inspect(sheet.cssRules);
//     } catch {
//       // Ignore cross-origin stylesheets; app-owned rules remain themeable.
//     }
//   }
//   return rules.join('\n');
// }

// function getInitialTheme(): ThemeMode {
//   if (Platform.OS !== 'web' || typeof window === 'undefined') return 'light';
//   try {
//     return window.localStorage.getItem('exsurvey-theme') === 'dark' ? 'dark' : 'light';
//   } catch {
//     return 'light';
//   }
// }

// export default function App() {
//   const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

//   useEffect(() => {
//     if (Platform.OS !== 'web' || typeof document === 'undefined') return;
//     let style = document.getElementById('exsurvey-theme-styles') as HTMLStyleElement | null;
//     if (!style) {
//       style = document.createElement('style');
//       style.id = 'exsurvey-theme-styles';
//       document.head.appendChild(style);
//     }
//     style.textContent = `${darkThemeCss}\n${collectDarkRules()}`;
//     document.documentElement.dataset.exsurveyTheme = theme;
//     try {
//       window.localStorage.setItem('exsurvey-theme', theme);
//     } catch {
//       // Keep the theme switch usable when storage is unavailable.
//     }
//   }, [theme]);

//   const toggleTheme = () => setTheme(current => (current === 'light' ? 'dark' : 'light'));

//   return (
//     <View style={styles.app}>
//       <AppNavigator />
//       <Pressable
//         accessibilityRole="button"
//         accessibilityLabel={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
//         onPress={toggleTheme}
//         style={styles.themeToggle}>
//         <Text style={styles.themeIcon}>{theme === 'light' ? '☾' : '☼'}</Text>
//         <Text style={styles.themeLabel}>{theme === 'light' ? 'Dark theme' : 'Light theme'}</Text>
//       </Pressable>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   app: {flex: 1, minHeight: '100%' as any},
//   themeToggle: {
//     position: 'absolute',
//     right: 22,
//     bottom: 22,
//     zIndex: 9999,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     paddingHorizontal: 15,
//     paddingVertical: 11,
//     borderRadius: 24,
//     backgroundColor: '#b8a5f8',
//     elevation: 8,
//     ...Platform.select({web: {boxShadow: '0 6px 20px rgba(36, 45, 82, 0.24)'}, default: {shadowColor: '#242d52', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: {width: 0, height: 4}}}),
//   },
//   themeIcon: {fontSize: 16, lineHeight: 18, color: '#242d52', fontWeight: '800'},
//   themeLabel: {fontSize: 12, color: '#242d52', fontWeight: '800'},
// });



import React, {useEffect} from 'react';
import {useThemeMode} from './src/theme/useThemeMode';
import {Platform, StyleSheet, View} from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

type ThemeMode = 'light' | 'dark';

const darkThemeCss = `
  html[data-exsurvey-theme="dark"],
  html[data-exsurvey-theme="dark"] body,
  html[data-exsurvey-theme="dark"] #root {
    background: #101426 !important;
    color-scheme: dark;
  }
  html[data-exsurvey-theme="dark"] [style*="linear-gradient(135deg"] {
    background-image: linear-gradient(135deg, #101426 0%, #202043 56%, #1b3451 100%) !important;
  }
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(255, 255, 255)"],
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(247, 249, 255)"],
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(244, 246, 251)"],
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(248, 249, 252)"],
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(251, 251, 253)"],
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(250, 251, 253)"] {
    background-color: #1b2238 !important;
  }
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(248, 249, 252)"],
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(251, 251, 253)"],
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(250, 251, 253)"] {
    background-color: #151b2e !important;
  }
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(220, 232, 255)"],
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(233, 229, 255)"],
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(215, 231, 255)"],
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(240, 238, 255)"],
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(233, 237, 255)"],
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(236, 250, 250)"] {
    background-color: #292943 !important;
  }
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(255, 240, 215)"] { background-color: #403522 !important; }
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(241, 234, 243)"] { background-color: #352b40 !important; }
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(229, 238, 247)"] { background-color: #263449 !important; }
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(253, 232, 226)"],
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(253, 236, 235)"] { background-color: #432d37 !important; }
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(228, 241, 232)"] { background-color: #273446 !important; }
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(236, 238, 244)"],
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(238, 240, 245)"],
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(238, 240, 246)"],
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(240, 241, 246)"] { background-color: #252d43 !important; }

  html[data-exsurvey-theme="dark"] [style*="color: rgb(36, 45, 82)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(37, 47, 80)"] { color: #edf0ff !important; }
  html[data-exsurvey-theme="dark"] [style*="color: rgb(42, 45, 59)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(52, 56, 81)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(59, 63, 89)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(61, 65, 89)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(66, 71, 96)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(73, 77, 99)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(74, 79, 99)"] { color: #d5ddf7 !important; }
  html[data-exsurvey-theme="dark"] [style*="color: rgb(91, 97, 120)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(106, 111, 131)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(112, 117, 137)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(115, 120, 140)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(116, 121, 140)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(122, 127, 147)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(123, 128, 146)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(125, 129, 146)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(129, 134, 151)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(131, 135, 152)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(133, 137, 154)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(138, 143, 163)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(146, 150, 166)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(149, 153, 169)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(151, 155, 170)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(154, 160, 180)"] { color: #aeb8d5 !important; }
  html[data-exsurvey-theme="dark"] [style*="color: rgb(101, 117, 108)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(122, 133, 125)"],
  html[data-exsurvey-theme="dark"] [style*="color: rgb(139, 149, 142)"] { color: #aeb8d5 !important; }

  html[data-exsurvey-theme="dark"] [style*="border-color: rgb(229, 233, 246)"],
  html[data-exsurvey-theme="dark"] [style*="border-color: rgb(220, 229, 221)"],
  html[data-exsurvey-theme="dark"] [style*="border-color: rgb(217, 220, 232)"],
  html[data-exsurvey-theme="dark"] [style*="border-color: rgb(201, 204, 224)"],
  html[data-exsurvey-theme="dark"] [style*="border-bottom-color: rgb(240, 241, 246)"],
  html[data-exsurvey-theme="dark"] [style*="border-top-color: rgb(236, 238, 244)"] { border-color: #343d5a !important; }
  html[data-exsurvey-theme="dark"] input::placeholder { color: #8791b2 !important; }
  html[data-exsurvey-theme="dark"] select { background-color: #151b2e !important; color: #edf0ff !important; border-color: #343d5a !important; }
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(184, 165, 248)"] { color: #242d52 !important; }
  html[data-exsurvey-theme="dark"] [style*="background-color: rgb(184, 165, 248)"] * { color: #242d52 !important; }
`;

const darkBackgroundColors: Record<string, string> = {
  '#fff': '#1b2238', '#ffffff': '#1b2238',
  '#f7f9ff': '#101426', '#f4f6fb': '#101426',
  '#dce8ff': '#101426', '#e9e5ff': '#101426', '#d7e7ff': '#101426',
  '#f8f9fc': '#151b2e', '#fbfbfd': '#151b2e', '#fafbfd': '#151b2e',
  '#f0eeff': '#292943', '#e9edff': '#292943', '#b8a5f8': '#7165a7',
  '#fff0d7': '#403522', '#f1eaf3': '#352b40', '#e5eef7': '#263449',
  '#fde8e2': '#432d37', '#fdeceb': '#432d37', '#e4f1e8': '#273446',
  '#eafafa': '#213747', '#eceef4': '#252d43', '#eef0f5': '#252d43',
  '#eef0f6': '#252d43', '#f0f1f6': '#252d43',
};

const darkTextColors: Record<string, string> = {
  '#242d52': '#edf0ff', '#252f50': '#edf0ff',
  '#2a2d3b': '#d5ddf7', '#343851': '#d5ddf7', '#3b3f59': '#d5ddf7',
  '#3d4159': '#d5ddf7', '#424760': '#d5ddf7', '#494d63': '#d5ddf7',
  '#4a4f63': '#d5ddf7',
  '#5b6178': '#aeb8d5', '#65756c': '#aeb8d5', '#6a6f83': '#aeb8d5',
  '#707589': '#aeb8d5', '#73788c': '#aeb8d5', '#74798c': '#aeb8d5',
  '#7a7f93': '#aeb8d5', '#7a857d': '#aeb8d5', '#7b8092': '#aeb8d5',
  '#7d8192': '#aeb8d5', '#818697': '#aeb8d5', '#838798': '#aeb8d5',
  '#85899a': '#aeb8d5', '#8a8fa3': '#aeb8d5', '#8b958e': '#aeb8d5',
  '#9296a6': '#aeb8d5', '#9599a9': '#aeb8d5', '#9599aa': '#aeb8d5',
  '#979baa': '#aeb8d5', '#9aa0b4': '#aeb8d5',
  '#a75a0b': '#f2bb66', '#ba4e3c': '#f09a88',
  '#8053a6': '#c7a0f0', '#3b68aa': '#91b7f3',
};

const darkBorderColors: Record<string, string> = {
  '#e5e9f6': '#343d5a', '#dce5dd': '#343d5a', '#d9dce8': '#343d5a',
  '#c9cce0': '#343d5a', '#e1e8e1': '#343d5a',
};

function normalizeColor(value: string) {
  const rgb = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!rgb) return value.toLowerCase();
  return `#${rgb.slice(1, 4).map(part => Number(part).toString(16).padStart(2, '0')).join('')}`;
}

function collectDarkRules(): string {
  if (typeof document === 'undefined') return '';
  const rules: string[] = [];
  const inspect = (ruleList: CSSRuleList) => {
    for (let ruleIndex = 0; ruleIndex < ruleList.length; ruleIndex += 1) {
      const rule = ruleList.item(ruleIndex);
      if (!rule) continue;
      const nested = (rule as CSSGroupingRule).cssRules;
      if (nested) inspect(nested);
      const cssRule = rule as CSSStyleRule;
      if (!cssRule.selectorText || !cssRule.style) continue;
      const declarations: string[] = [];
      for (let propertyIndex = 0; propertyIndex < cssRule.style.length; propertyIndex += 1) {
        const property = cssRule.style.item(propertyIndex);
        const value = cssRule.style.getPropertyValue(property).trim();
        if (property === 'background-image' && value.includes('linear-gradient(135deg')) {
          declarations.push('background-image: linear-gradient(135deg, #101426 0%, #202043 56%, #1b3451 100%) !important');
          continue;
        }
        const outputProperty = property === 'background' ? 'background-color' : property;
        const colorKey = normalizeColor(value);
        let replacement: string | undefined;
        if (outputProperty === 'background-color') replacement = darkBackgroundColors[colorKey];
        else if (outputProperty === 'color') replacement = darkTextColors[colorKey];
        else replacement = darkBorderColors[colorKey];
        if (!replacement) continue;
        if (['background-color', 'color', 'border-color', 'border-top-color', 'border-bottom-color', 'outline-color'].includes(outputProperty)) {
          declarations.push(`${outputProperty}: ${replacement} !important`);
        }
      }
      if (declarations.length) {
        const selectors = cssRule.selectorText.split(',').map(selector => `html[data-exsurvey-theme="dark"] ${selector.trim()}`);
        rules.push(`${selectors.join(', ')} { ${declarations.join('; ')}; }`);
      }
    }
  };
  for (let sheetIndex = 0; sheetIndex < document.styleSheets.length; sheetIndex += 1) {
    const sheet = document.styleSheets.item(sheetIndex);
    if (!sheet) continue;
    if ((sheet.ownerNode as Element | null)?.id === 'exsurvey-theme-styles') continue;
    try {
      inspect(sheet.cssRules);
    } catch {
      // Ignore cross-origin stylesheets; app-owned rules remain themeable.
    }
  }
  return rules.join('\n');
}

export default function App() {
  const theme = useThemeMode();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const apply = () => {
      let style = document.getElementById('exsurvey-theme-styles') as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement('style');
        style.id = 'exsurvey-theme-styles';
        document.head.appendChild(style);
      }
      style.textContent = `${darkThemeCss}\n${collectDarkRules()}`;
    };

    document.documentElement.dataset.exsurveyTheme = theme;
    apply();

    // Re-collect when the theme is switched, and (debounced) as new screens
    // render in dark mode, so their styles get dark equivalents too.
    window.addEventListener('exsurvey-theme-change', apply);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new MutationObserver(() => {
      if (document.documentElement.dataset.exsurveyTheme !== 'dark') return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(apply, 400);
    });
    observer.observe(document.getElementById('root') || document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      window.removeEventListener('exsurvey-theme-change', apply);
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [theme]);

  return (
    <View style={styles.app}>
      <AppNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  app: {flex: 1, minHeight: '100%' as any},
});
