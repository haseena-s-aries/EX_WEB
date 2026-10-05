import React from 'react';
import {Text, View} from 'react-native';

/** Circular progress built from rotated tick marks (no SVG dependency). */
export default function ProgressRing({
  pct,
  color,
  track,
  textColor,
  size = 64,
  label,
}: {
  pct: number;
  color: string;
  track: string;
  textColor: string;
  size?: number;
  label?: string;
}) {
  const segments = 40;
  const clamped = Math.max(0, Math.min(100, pct));
  const lit = Math.round((clamped / 100) * segments);
  return (
    <View style={{width: size, height: size, alignItems: 'center', justifyContent: 'center'}}>
      {Array.from({length: segments}).map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            alignItems: 'center',
            transform: [{rotate: `${(i * 360) / segments}deg`}],
          }}>
          <View
            style={{
              width: 4,
              height: size * 0.13,
              borderRadius: 2,
              backgroundColor: i < lit ? color : track,
            }}
          />
        </View>
      ))}
      <Text style={{color: textColor, fontSize: 13, fontWeight: '800'}}>{label ?? `${clamped}%`}</Text>
    </View>
  );
}
