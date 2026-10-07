import React from 'react';
import {Text, View} from 'react-native';

export default function QcPendingBadge({count = 0, active = false}: {count?: number; active?: boolean}) {
  if (!Number.isFinite(count) || count <= 0) return null;
  return <View accessibilityLabel={`${count} inspections awaiting QC review`} style={{minWidth: 22, borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3, alignItems: 'center', backgroundColor: active ? '#242d52' : '#b8a5f8'}}>
    <Text style={{fontSize: 11, fontWeight: '800', color: active ? '#fff' : '#242d52'}}>{count}</Text>
  </View>;
}
