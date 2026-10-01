import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

/**
 * Icons and the refinery illustration used by LoginScreen.
 * Everything is drawn with plain <View>s so no icon / SVG package is needed.
 */

type IconProps = {size?: number; color?: string};

const STROKE = 1.5;

/* ------------------------------------------------------------------ */
/* Input icons                                                         */
/* ------------------------------------------------------------------ */

export function MailIcon({size = 18, color = '#94A3B8'}: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size * 0.72,
        borderWidth: STROKE,
        borderColor: color,
        borderRadius: 3,
        overflow: 'hidden',
        alignItems: 'center',
      }}>
      <View
        style={{
          width: size * 0.55,
          height: size * 0.55,
          borderRightWidth: STROKE,
          borderBottomWidth: STROKE,
          borderColor: color,
          transform: [{rotate: '45deg'}],
          marginTop: -size * 0.3,
        }}
      />
    </View>
  );
}

export function LockIcon({size = 18, color = '#94A3B8'}: IconProps) {
  return (
    <View style={{width: size, height: size, alignItems: 'center'}}>
      <View
        style={{
          width: size * 0.5,
          height: size * 0.45,
          borderWidth: STROKE,
          borderBottomWidth: 0,
          borderColor: color,
          borderTopLeftRadius: size * 0.25,
          borderTopRightRadius: size * 0.25,
          marginBottom: -1,
        }}
      />
      <View
        style={{
          width: size * 0.78,
          height: size * 0.5,
          borderWidth: STROKE,
          borderColor: color,
          borderRadius: 3,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View
          style={{
            width: 2,
            height: size * 0.16,
            borderRadius: 1,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

export function EyeIcon({
  size = 20,
  color = '#64748B',
  off = false,
}: IconProps & {off?: boolean}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <View
        style={{
          width: size,
          height: size * 0.6,
          borderRadius: size * 0.3,
          borderWidth: STROKE,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View
          style={{
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: size * 0.14,
            backgroundColor: color,
          }}
        />
      </View>
      {off ? (
        <View
          style={{
            position: 'absolute',
            width: size * 1.1,
            height: STROKE,
            backgroundColor: color,
            transform: [{rotate: '-45deg'}],
          }}
        />
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Brand mark                                                          */
/* ------------------------------------------------------------------ */

/** Regular hexagon built from three rotated rectangles. `size` = hexagon width. */
function Hexagon({size, color}: {size: number; color: string}) {
  const side = size / 2;
  const height = side * Math.sqrt(3);
  return (
    <View style={{width: size, height}}>
      {[0, 60, 120].map(deg => (
        <View
          key={deg}
          style={{
            position: 'absolute',
            left: (size - side) / 2,
            top: 0,
            width: side,
            height,
            backgroundColor: color,
            transform: [{rotate: `${deg}deg`}],
          }}
        />
      ))}
    </View>
  );
}

export function HexLogo({
  size = 40,
  holeColor = '#FFFFFF',
}: {
  size?: number;
  /** Colour of the inner hexagon; match the surface the logo sits on. */
  holeColor?: string;
}) {
  const h = (size / 2) * Math.sqrt(3);
  const center = (inner: number, color: string) => (
    <View
      style={{
        position: 'absolute',
        left: (size - inner) / 2,
        top: (h - (inner / 2) * Math.sqrt(3)) / 2,
      }}>
      <Hexagon size={inner} color={color} />
    </View>
  );
  return (
    <View style={{width: size, height: h}}>
      <Hexagon size={size} color="#D97706" />
      {center(size * 0.64, holeColor)}
      {center(size * 0.34, '#EA580C')}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Value-prop icons                                                    */
/* ------------------------------------------------------------------ */

export function ShieldIcon({size = 22, color = '#0F172A'}: IconProps) {
  return (
    <View
      style={{
        width: size * 0.82,
        height: size,
        borderWidth: STROKE,
        borderColor: color,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
        borderBottomLeftRadius: size * 0.45,
        borderBottomRightRadius: size * 0.45,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text
        style={{
          color,
          fontSize: size * 0.5,
          lineHeight: size * 0.6,
          fontWeight: '700',
        }}>
        ✓
      </Text>
    </View>
  );
}

export function BarsIcon({size = 22, color = '#0F172A'}: IconProps) {
  const bar = (h: number) => (
    <View
      style={{
        width: size * 0.22,
        height: size * h,
        borderWidth: STROKE,
        borderColor: color,
        borderRadius: 2,
      }}
    />
  );
  return (
    <View
      style={{
        width: size,
        height: size,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}>
      {bar(0.4)}
      {bar(0.7)}
      {bar(1)}
    </View>
  );
}

function Person({head, color}: {head: number; color: string}) {
  return (
    <View style={{alignItems: 'center'}}>
      <View
        style={{
          width: head,
          height: head,
          borderRadius: head / 2,
          borderWidth: STROKE,
          borderColor: color,
        }}
      />
      <View
        style={{
          width: head * 2,
          height: head,
          marginTop: 1.5,
          borderWidth: STROKE,
          borderBottomWidth: 0,
          borderColor: color,
          borderTopLeftRadius: head,
          borderTopRightRadius: head,
        }}
      />
    </View>
  );
}

export function PeopleIcon({size = 22, color = '#0F172A'}: IconProps) {
  return (
    <View
      style={{
        width: size * 1.3,
        height: size,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}>
      <View style={{marginRight: -size * 0.12}}>
        <Person head={size * 0.2} color={color} />
      </View>
      <Person head={size * 0.26} color={color} />
      <View style={{marginLeft: -size * 0.12}}>
        <Person head={size * 0.2} color={color} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* SSO + biometrics                                                    */
/* ------------------------------------------------------------------ */

export function GoogleMark({size = 18}: {size?: number}) {
  return (
    <Text
      style={{
        fontSize: size,
        lineHeight: size + 2,
        fontWeight: '800',
        color: '#4285F4',
      }}>
      G
    </Text>
  );
}

export function MicrosoftMark({size = 18}: {size?: number}) {
  const q = (size - 2) / 2;
  const sq = (color: string) => (
    <View style={{width: q, height: q, backgroundColor: color}} />
  );
  return (
    <View style={{width: size, height: size, flexWrap: 'wrap', gap: 2}}>
      {sq('#F25022')}
      {sq('#7FBA00')}
      {sq('#00A4EF')}
      {sq('#FFB900')}
    </View>
  );
}

export function FaceIdIcon({size = 48, color = '#0F172A'}: IconProps) {
  const c = size * 0.3;
  const corner = (pos: object, borders: object) => (
    <View
      style={[
        {
          position: 'absolute',
          width: c,
          height: c,
          borderColor: color,
          borderRadius: size * 0.14,
        },
        pos,
        borders,
      ]}
    />
  );
  return (
    <View style={{width: size, height: size}}>
      {corner({top: 0, left: 0}, {borderTopWidth: 2.5, borderLeftWidth: 2.5})}
      {corner({top: 0, right: 0}, {borderTopWidth: 2.5, borderRightWidth: 2.5})}
      {corner(
        {bottom: 0, left: 0},
        {borderBottomWidth: 2.5, borderLeftWidth: 2.5},
      )}
      {corner(
        {bottom: 0, right: 0},
        {borderBottomWidth: 2.5, borderRightWidth: 2.5},
      )}
      <View
        style={{
          position: 'absolute',
          top: size * 0.3,
          left: size * 0.3,
          width: 2.5,
          height: size * 0.12,
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.3,
          right: size * 0.3,
          width: 2.5,
          height: size * 0.12,
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.4,
          left: size * 0.5 - 1,
          width: 2,
          height: size * 0.14,
          borderRadius: 1,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.22,
          left: size * 0.3,
          width: size * 0.4,
          height: size * 0.12,
          borderBottomWidth: 2.5,
          borderBottomLeftRadius: size * 0.2,
          borderBottomRightRadius: size * 0.2,
          borderColor: color,
        }}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Theme toggle icons                                                  */
/* ------------------------------------------------------------------ */

export function SunIcon({size = 20, color = '#F59E0B'}: IconProps) {
  const core = size * 0.42;
  return (
    <View style={{width: size, height: size, alignItems: 'center', justifyContent: 'center'}}>
      {Array.from({length: 8}).map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            alignItems: 'center',
            transform: [{rotate: `${i * 45}deg`}],
          }}>
          <View style={{width: 2, height: size * 0.17, borderRadius: 1, backgroundColor: color}} />
        </View>
      ))}
      <View style={{width: core, height: core, borderRadius: core / 2, backgroundColor: color}} />
    </View>
  );
}

/** Crescent moon. `cutColor` must match the surface behind the icon. */
export function MoonIcon({
  size = 20,
  color = '#334155',
  cutColor = '#FFFFFF',
}: IconProps & {cutColor?: string}) {
  const d = size * 0.8;
  return (
    <View style={{width: size, height: size, alignItems: 'center', justifyContent: 'center'}}>
      <View style={{width: d, height: d, borderRadius: d / 2, backgroundColor: color}} />
      <View
        style={{
          position: 'absolute',
          width: d * 0.8,
          height: d * 0.8,
          borderRadius: d * 0.4,
          backgroundColor: cutColor,
          top: size * 0.02,
          right: size * 0.0,
        }}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Refinery illustration                                               */
/* ------------------------------------------------------------------ */

type TowerSpec = {r: number; w: number; h: number; c: string};

const DESKTOP_TOWERS: TowerSpec[] = [
  {r: 150, w: 54, h: 400, c: '#8E9FB4'},
  {r: 64, w: 46, h: 250, c: '#8E9FB4'},
  {r: 250, w: 22, h: 120, c: '#A5B3C4'},
  {r: 296, w: 16, h: 84, c: '#B3BFCD'},
  {r: 336, w: 18, h: 104, c: '#B3BFCD'},
];

const MOBILE_TOWERS: TowerSpec[] = [
  {r: 28, w: 20, h: 118, c: '#8E9FB4'},
  {r: 78, w: 16, h: 84, c: '#97A8BC'},
  {r: 128, w: 16, h: 96, c: '#97A8BC'},
  {r: 196, w: 18, h: 70, c: '#A5B3C4'},
  {r: 252, w: 16, h: 56, c: '#B3BFCD'},
  {r: 306, w: 18, h: 76, c: '#B3BFCD'},
];

function Tower({w, h, c}: {w: number; h: number; c: string}) {
  const bandGap = w > 30 ? 34 : 22;
  const bands = Math.floor(h / bandGap);
  return (
    <View
      style={{
        width: w,
        height: h,
        backgroundColor: c,
        borderTopLeftRadius: w / 2,
        borderTopRightRadius: w / 2,
        overflow: 'hidden',
      }}>
      <View style={[art.shine, {width: w * 0.28}]} />
      <View style={[art.shade, {width: w * 0.3}]} />
      {Array.from({length: bands}).map((_, i) => (
        <View key={i} style={[art.band, {top: (i + 1) * bandGap - 2}]} />
      ))}
    </View>
  );
}

/**
 * Stylised refinery skyline. Fills its parent (position: absolute) and sits on
 * a ground line `groundHeight` px from the bottom.
 */
export function RefineryScene({
  variant,
  groundHeight = 0,
}: {
  variant: 'desktop' | 'mobile';
  groundHeight?: number;
}) {
  const desktop = variant === 'desktop';
  const towers = desktop ? DESKTOP_TOWERS : MOBILE_TOWERS;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* low sun behind the towers */}
      <View
        style={[
          art.glow,
          desktop ? art.glowLarge : art.glowSmall,
          {bottom: groundHeight + (desktop ? 40 : 6)},
        ]}
      />
      <View
        style={[
          art.glow,
          desktop ? art.glowCoreLarge : art.glowCoreSmall,
          {bottom: groundHeight + (desktop ? 90 : 20)},
        ]}
      />

      {desktop ? (
        <View
          style={{
            position: 'absolute',
            right: 430,
            bottom: groundHeight,
            alignItems: 'center',
          }}>
          <View style={art.flame} />
          <View style={art.flareStack} />
        </View>
      ) : null}

      {towers.map(t => (
        <View
          key={t.r}
          style={{position: 'absolute', right: t.r, bottom: groundHeight}}>
          <Tower w={t.w} h={t.h} c={t.c} />
        </View>
      ))}

      {/* pipe rack in the foreground */}
      <View
        style={[
          art.pipe,
          {
            right: 0,
            width: desktop ? 340 : 360,
            bottom: groundHeight + (desktop ? 34 : 8),
            height: desktop ? 12 : 6,
          },
        ]}
      />
      <View
        style={[
          art.pipe,
          {
            right: 0,
            width: desktop ? 260 : 300,
            bottom: groundHeight + (desktop ? 62 : 16),
            height: desktop ? 9 : 4,
            backgroundColor: '#8A9BB0',
          },
        ]}
      />
    </View>
  );
}

const art = StyleSheet.create({
  shine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  shade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.18)',
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(15,23,42,0.22)',
  },
  glow: {position: 'absolute'},
  glowLarge: {
    right: 40,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(251,191,36,0.16)',
  },
  glowCoreLarge: {
    right: 110,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(253,186,116,0.30)',
  },
  glowSmall: {
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(251,191,36,0.16)',
  },
  glowCoreSmall: {
    left: 0,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(253,186,116,0.30)',
  },
  flareStack: {width: 3, height: 150, backgroundColor: '#64748B'},
  flame: {
    width: 10,
    height: 16,
    borderRadius: 6,
    backgroundColor: '#F59E0B',
    marginBottom: 1,
  },
  pipe: {
    position: 'absolute',
    backgroundColor: '#7B8DA3',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
});
