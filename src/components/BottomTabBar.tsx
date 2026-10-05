import React from 'react';
import {Platform, Text, TouchableOpacity, View} from 'react-native';
import {Colors} from '../theme/palette';

export type AppTab = 'Home' | 'Surveys' | 'Equipment' | 'User';

const TABS: {key: AppTab; label: string; glyph: string}[] = [
  {key: 'Home', label: 'Home', glyph: '⌂'},
  {key: 'Surveys', label: 'Surveys', glyph: '▤'},
  {key: 'Equipment', label: 'Equipment', glyph: '⬡'},
  {key: 'User', label: 'User', glyph: '☻'},
];

type Props = {
  active: AppTab;
  onChange: (tab: AppTab) => void;
  c: Colors;
  /** When set, a Logout button is added as the last item of the bar. */
  onLogout?: () => void;
};

/** Bottom navigation for the mobile layout: Home / Surveys / Equipment / User. */
export default function BottomTabBar({active, onChange, c, onLogout}: Props) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: c.bar,
          borderTopWidth: 1,
          borderTopColor: c.border,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'web' ? 10 : 20,
          paddingHorizontal: 8,
        },
        Platform.select({
          web: {position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50} as object,
          default: {},
        }),
      ]}>
      {TABS.map(tab => {
        const on = tab.key === active;
        const color = on ? c.yellow : c.muted;
        return (
          <TouchableOpacity
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{selected: on}}
            accessibilityLabel={tab.label}
            onPress={() => onChange(tab.key)}
            style={{flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 3}}>
            <Text style={{fontSize: 22, lineHeight: 26, color}}>{tab.glyph}</Text>
            <Text style={{fontSize: 11.5, fontWeight: on ? '800' : '600', color}}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
      {onLogout ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Log out"
          onPress={onLogout}
          style={{flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 3}}>
          <Text style={{fontSize: 22, lineHeight: 26, color: c.critical}}>⏻</Text>
          <Text style={{fontSize: 11.5, fontWeight: '600', color: c.critical}}>Logout</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
