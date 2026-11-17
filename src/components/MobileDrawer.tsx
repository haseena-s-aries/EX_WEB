import {typography} from '../theme/typography';
import {useUserAccessCounts} from '../api/userAccess';
import {useSessionProfile} from '../api/profileState';
import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, Image, Modal, Platform, Pressable, ScrollView, Text, TouchableOpacity, useWindowDimensions, View} from 'react-native';
import {Colors, tint} from '../theme/palette';
import {useThemeMode} from '../theme/useThemeMode';

const ARIES_LOGO = require('../assets/aries-logo.png');

export type AppTab = 'Home' | 'Surveys' | 'Equipment' | 'User' | 'QCReview' | 'QCPending' | 'Reports' | 'Checklists';

type Item = {key: AppTab | 'Settings'; label: string; hint: string; glyph: string; tone: keyof Colors};

const WORKSPACE: Item[] = [
  {key: 'Home', label: 'Home', hint: 'Dashboard & site operations', glyph: '⌂', tone: 'amber'},
  {key: 'Surveys', label: 'Surveys', hint: 'Projects and areas', glyph: '▤', tone: 'cyan'},
  {key: 'Equipment', label: 'HAER', hint: 'Verified items & status', glyph: '⬡', tone: 'indigo'},
  {key: 'Checklists', label: 'Checklists', hint: 'Equipment checkpoint categories', glyph: '☑', tone: 'cyan'},
  {key: 'Reports', label: 'Reports', hint: 'Inspection reports', glyph: '↗', tone: 'success'},
];
const QUALITY: Item[] = [
  {key: 'QCPending', label: 'QC Pending', hint: 'Awaiting review', glyph: '▤', tone: 'amber'},
  {key: 'QCReview', label: 'QC Reviewed List', hint: 'Assignments & approvals', glyph: '✓', tone: 'success'},
];
const ADMIN: Item[] = [{key: 'User', label: 'User Management', hint: 'Approve and assign users', glyph: '☻', tone: 'cyan'}];

const web = (style: object) => Platform.select({web: style, default: {}}) as object;

/* ------------------------------------------------------------------ */
/* Hamburger button (drawn with views so it is crisp in both themes)   */
/* ------------------------------------------------------------------ */
export function MenuButton({onPress, c, size = 38, badge = 0}: {onPress: () => void; c: Colors; size?: number; badge?: number}) {
  const bar = {height: 2.5, borderRadius: 2, backgroundColor: c.text};
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      style={({pressed}: any) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: pressed ? c.elevated : c.card,
        },
        web({cursor: 'pointer', boxShadow: c.shadow}),
      ]}>
      <View style={{gap: 4, alignItems: 'flex-start'}}>
        <View style={[bar, {width: 17}]} />
        <View style={[bar, {width: 12, backgroundColor: c.amber}]} />
        <View style={[bar, {width: 17}]} />
      </View>
      {badge > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 11,
            height: 11,
            borderRadius: 6,
            backgroundColor: c.amber,
            borderWidth: 2,
            borderColor: c.bg,
          }}
        />
      ) : null}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Drawer                                                              */
/* ------------------------------------------------------------------ */
type Props = {
  visible: boolean;
  onClose: () => void;
  active: AppTab;
  onChange: (tab: AppTab) => void;
  onLogout: () => void;
  c: Colors;
  onSettings: () => void;
  settingsOpen?: boolean;
  showQc?: boolean;
  qcPendingCount?: number;
  /** Limit the menu to these tabs (native build only has some of the screens). */
  tabs?: AppTab[];
};

export default function MobileDrawer({visible, onClose, active, onChange, onLogout, c, onSettings, settingsOpen, showQc, qcPendingCount = 0, tabs}: Props) {
  const profile=useSessionProfile(); const counts=useUserAccessCounts(['admin','manager'].includes(profile?.role.toLowerCase()||''));
  const {width} = useWindowDimensions();
  const drawerW = Math.min(330, Math.round(width * 0.86));
  const dark = useThemeMode() === 'dark';
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web'}).start();
    } else {
      Animated.timing(progress, {toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: Platform.OS !== 'web'}).start(({finished}) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, progress]);

  // Esc closes + stop the page behind from scrolling (web)
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const g = globalThis as any;
    const onKey = (e: any) => { if (e.key === 'Escape') onClose(); };
    const prev = g.document?.body?.style?.overflow;
    g.addEventListener?.('keydown', onKey);
    if (g.document?.body) g.document.body.style.overflow = 'hidden';
    return () => {
      g.removeEventListener?.('keydown', onKey);
      if (g.document?.body) g.document.body.style.overflow = prev || '';
    };
  }, [visible, onClose]);

  if (!mounted) return null;

  const translateX = progress.interpolate({inputRange: [0, 1], outputRange: [-drawerW, 0]});
  const accentText = dark ? c.yellow : c.amber;

  const go = (tab: AppTab) => {
    onClose();
    if (tab !== active) onChange(tab);
  };

  const renderItem = (item: Item) => {
    const on = settingsOpen ? item.key === 'Settings' : item.key === active;
    const toneColor = c[item.tone] as string;
    const count = item.key === 'QCPending' ? qcPendingCount : item.key === 'User' ? counts.pendingRegistrations : 0;
    return (
      <TouchableOpacity
        key={item.key}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityState={{selected: on}}
        accessibilityLabel={item.label}
        onPress={() => {if (item.key === 'Settings') {onClose(); onSettings();} else go(item.key);}}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 10,
            paddingHorizontal: 10,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: on ? tint(c.amber, '55') : 'transparent',
            backgroundColor: on ? tint(c.amber, dark ? '1F' : '17') : 'transparent',
          },
          web({cursor: 'pointer'}),
        ]}>
        {on ? <View style={{position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2, backgroundColor: c.amber}} /> : null}
        <View style={{width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: tint(toneColor, dark ? '26' : '1A')}}>
          <Text style={{fontSize: 19, color: toneColor}}>{item.glyph}</Text>
        </View>
        <View style={{flex: 1, minWidth: 0}}>
          <Text style={{...typography.navigation, flexShrink: 1, fontWeight: on ? '700' : '600', color: on ? accentText : c.text}}>{item.label}</Text>
          <Text numberOfLines={1} style={{fontSize: 11.5, color: c.muted, marginTop: 1}}>{item.hint}</Text>
        </View>
        {count > 0 ? (
          <View style={{minWidth: 24, height: 22, borderRadius: 11, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: c.amber}}>
            <Text style={{fontSize: 11.5, fontWeight: '800', color: c.onAmber}}>{count > 99 ? '99+' : count}</Text>
          </View>
        ) : (
          <Text style={{fontSize: 18, color: on ? c.amber : c.border}}>›</Text>
        )}
      </TouchableOpacity>
    );
  };

  const section = (label: string, all: Item[]) => {
    const items = tabs ? all.filter(i => i.key !== 'Settings' && tabs.includes(i.key)) : all;
    if (items.length === 0) return null;
    return (
    <View key={label} style={{marginTop: 18}}>
      <Text style={{fontSize: 10.5, fontWeight: '800', letterSpacing: 1.4, color: c.muted, marginBottom: 8, marginLeft: 10}}>{label}</Text>
      <View style={{gap: 4}}>{items.map(renderItem)}</View>
    </View>
    );
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={{flex: 1}}>
        <Animated.View style={[{position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, opacity: progress, backgroundColor: dark ? 'rgba(0,0,0,0.65)' : 'rgba(15,23,42,0.42)'}, web({backdropFilter: 'blur(2px)'})]}>
          <Pressable accessibilityLabel="Close menu" style={{flex: 1}} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: drawerW,
              backgroundColor: dark ? c.bar : c.card,
              borderRightWidth: 1,
              borderRightColor: c.border,
              transform: [{translateX}],
            },
            web({boxShadow: dark ? '12px 0 40px rgba(0,0,0,0.55)' : '12px 0 40px rgba(15,23,42,0.18)'}),
          ]}>
          {/* amber safety stripe */}
          <View style={{height: 4, backgroundColor: c.amber}} />

          {/* brand */}
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14}}>
            <View style={{width: 78, height: 44, borderRadius: 8, backgroundColor: '#FFFFFF', padding: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
              <Image source={ARIES_LOGO} style={{width: '100%', height: '100%'}} resizeMode="contain" accessibilityLabel="Aries logo" />
            </View>
            <View style={{flex: 1}}>
              <Text style={{color: c.text, fontSize: 20, fontWeight: '800'}}>Ex-Survey</Text>
              {/* <Text style={{color: c.secondary, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, marginTop: 1}}>ATEX & IECEx INSPECTIONS</Text> */}
            </View>
            <TouchableOpacity
              accessibilityLabel="Close menu"
              onPress={onClose}
              style={[{width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.elevated}, web({cursor: 'pointer'})]}>
              <Text style={{color: c.secondary, fontSize: 16, fontWeight: '800'}}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* scrollable options */}
          <ScrollView style={{flex: 1}} contentContainerStyle={{paddingHorizontal: 12, paddingBottom: 16}} showsVerticalScrollIndicator={false}>
            {section('WORKSPACE', WORKSPACE)}
            {showQc ? section('QUALITY CONTROL', QUALITY) : null}
            {showQc ? section('ADMINISTRATION', ADMIN) : null}
            <View style={{marginTop: 12}}>{renderItem({key: 'Settings', label: 'Settings', hint: 'Appearance preferences', glyph: '⚙', tone: 'cyan'})}</View>
          </ScrollView>

          {/* footer */}
          <View style={{borderTopWidth: 1, borderTopColor: c.border, padding: 14, gap: 10, paddingBottom: Platform.OS === 'web' ? 14 : 28}}>
            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Log out"
              onPress={() => { onClose(); onLogout(); }}
              style={[
                {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: tint(c.critical, '66'), backgroundColor: tint(c.critical, dark ? '1F' : '12')},
                web({cursor: 'pointer'}),
              ]}>
              <Text style={{fontSize: 16, color: c.critical}}>⏻</Text>
              <Text style={{fontSize: 14.5, fontWeight: '800', color: c.critical}}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
