import {typography} from '../theme/typography';
import React from 'react';
import {StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {visual} from '../theme/visual';

export default function ModuleHeading({eyebrow, title, description}: {
  eyebrow: string; title: string; description?: string;
}) {
  const {width} = useWindowDimensions();
  const compact = width < 620;
  return <View nativeID="ex-module-heading" style={[styles.shell, compact && styles.compact]}>
    <View pointerEvents="none" style={styles.radar}>
      <View style={styles.ring} /><View style={styles.ringInner} /><View style={styles.radarDot} />
    </View>
    <Text style={styles.eyebrow}>{eyebrow}</Text>
    <Text accessibilityRole="header" style={[styles.title, compact && styles.compactTitle]}>{title}</Text>
    {!!description && <Text style={styles.description}>{description}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  shell: {backgroundColor: visual.ink, borderRadius: visual.radius.hero, overflow: 'hidden',
    paddingHorizontal: 24, paddingVertical: 21, gap: 6, flexGrow: 1, minWidth: 0},
  compact: {paddingHorizontal: 16, paddingVertical: 17},
  eyebrow: {fontFamily: visual.mono, color: visual.signal, letterSpacing: 1.8, fontSize: 10, fontWeight: '700'},
  title: {...typography.page, color: '#f3fbfd', },
  compactTitle: {fontSize: 24},
  description: {...typography.body, color: '#b9d2dc', maxWidth: 650},
  radar: {position: 'absolute', right: -27, top: -68, width: 235, height: 235, borderRadius: 118, borderWidth: 1, borderColor: '#34728550', backgroundColor: '#12435662'},
  ring: {position: 'absolute', top: 28, left: 28, width: 178, height: 178, borderRadius: 90, borderWidth: 1, borderColor: '#60b6c649'},
  ringInner: {position: 'absolute', top: 61, left: 61, width: 112, height: 112, borderRadius: 56, borderWidth: 1, borderColor: '#60b6c649'},
  radarDot: {position: 'absolute', top: 112, left: 61, width: 6, height: 6, borderRadius: 3, backgroundColor: visual.signal},
});
