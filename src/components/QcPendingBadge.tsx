import React from 'react';
import {Text, View} from 'react-native';
import {DARK, LIGHT} from '../theme/palette';
import {useThemeMode} from '../theme/useThemeMode';

export default function QcPendingBadge({count = 0, active = false}: {count?: number; active?: boolean}) {
  const c = useThemeMode() === 'dark' ? DARK : LIGHT;
  if (!Number.isFinite(count) || count <= 0) return null;
  // Same amber pill as the phone drawer's QC Pending counter.
  return <View accessibilityLabel={`${count} inspections awaiting QC review`} style={{minWidth: 24, height: 22, borderRadius: 11, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: c.amber, opacity: active ? 1 : 0.92}}>
    <Text style={{fontSize: 11.5, fontWeight: '800', color: c.onAmber}}>{count > 99 ? '99+' : count}</Text>
  </View>;
}
