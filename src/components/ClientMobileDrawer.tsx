import React, {useEffect, useRef} from 'react';
import {Animated, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View} from 'react-native';
import {ClientSection} from '../api/clientDashboard';
import {useDashboardPresentation} from './DashboardPresentation';
import {tint} from '../theme/palette';

export const CLIENT_DRAWER_MENU: Array<{key: ClientSection; label: string; icon: string}> = [
  {key: 'Dashboard', label: 'Dashboard', icon: '⌂'}, {key: 'Projects', label: 'My Projects', icon: '▦'},
  {key: 'Progress', label: 'Survey Progress', icon: '▤'}, {key: 'Defects', label: 'Defects & Recommendations', icon: '⚠'},
  {key: 'QcStatus', label: 'QC Status', icon: '✓'}, {key: 'Reports', label: 'Reports & Certificates', icon: '↗'},
  {key: 'Notifications', label: 'Notifications', icon: '♧'}, {key: 'Profile', label: 'Profile', icon: '◎'},
];
export default function ClientMobileDrawer({open, role, name, companyName, active, counts, onClose, onNavigate, onLogout}: {
  open: boolean; role: string; name: string; companyName?: string; active: ClientSection;
  counts: Partial<Record<ClientSection, number>>; onClose: () => void; onNavigate: (section: ClientSection) => void; onLogout?: () => void;
}) {
  const {c} = useDashboardPresentation(); const {width} = useWindowDimensions(); const drawerWidth = Math.min(width * .84, 420);
  const slide = useRef(new Animated.Value(-drawerWidth)).current;
  useEffect(() => {if (open) {slide.setValue(-drawerWidth); Animated.timing(slide, {toValue: 0, duration: 220, useNativeDriver: Platform.OS !== 'web'}).start();}}, [open, drawerWidth, slide]);
  if (role.toLowerCase() !== 'client') return null;
  const item = (entry: typeof CLIENT_DRAWER_MENU[number]) => {
    const selected = active === entry.key; const count = counts[entry.key] || 0;
    return <TouchableOpacity key={entry.key} accessibilityRole="button" accessibilityLabel={entry.label} accessibilityState={{selected}} onPress={() => {onNavigate(entry.key); onClose();}} style={[styles.item, {backgroundColor: selected ? tint(c.amber, '22') : 'transparent', borderLeftColor: selected ? c.amber : 'transparent'}]}>
      <Text style={[styles.icon, {color: selected ? c.amber : c.muted}]}>{entry.icon}</Text><Text style={[styles.label, {color: selected ? c.amber : c.text, fontWeight: selected ? '800' : '600'}]}>{entry.label}</Text>{count > 0 && <View style={[styles.badge, {backgroundColor: c.elevated}]}><Text style={{color: c.text, fontSize: 11, fontWeight: '800'}}>{count}</Text></View>}
    </TouchableOpacity>;
  };
  return <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}><View style={styles.overlay}>
    <Pressable accessibilityRole="button" accessibilityLabel="Close client navigation overlay" onPress={onClose} style={[StyleSheet.absoluteFill, {left: drawerWidth}]} />
    <Animated.View style={[styles.drawer, {width: drawerWidth, backgroundColor: c.card, transform: [{translateX: slide}]}]}><SafeAreaView style={{flex: 1}}>
      <View style={[styles.brand, {borderBottomColor: c.border}]}><View style={{flex: 1}}><Text style={{fontSize: 19, fontWeight: '900', color: c.text}}>EX-SURVEY</Text><Text style={{fontSize: 10, color: c.muted, letterSpacing: 1, marginTop: 4}}>SURVEY CLIENT PORTAL</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close client navigation" onPress={onClose} style={styles.close}><Text style={{fontSize: 22, color: c.secondary}}>×</Text></TouchableOpacity></View>
      <ScrollView contentContainerStyle={{paddingHorizontal: 12, paddingBottom: 16}}><View style={[styles.profile, {borderBottomColor: c.border}]}><View style={[styles.avatar, {backgroundColor: tint(c.amber, '22')}]}><Text style={{color: c.amber, fontSize: 20, fontWeight: '800'}}>{name.trim().charAt(0).toUpperCase()}</Text></View><View style={{flex: 1, minWidth: 0}}><Text style={{color: c.text, fontWeight: '800', fontSize: 15}}>{name}</Text>{!!companyName && <Text style={{color: c.secondary, fontSize: 12, marginTop: 4}}>{companyName}</Text>}<Text style={{color: c.amber, fontSize: 10, fontWeight: '800', marginTop: 6}}>CLIENT</Text></View></View>
      <Text style={[styles.group, {color: c.muted}]}>PRIMARY</Text>{CLIENT_DRAWER_MENU.filter(entry => entry.key !== 'Profile').map(item)}<Text style={[styles.group, {color: c.muted}]}>ACCOUNT</Text>{item(CLIENT_DRAWER_MENU[7])}</ScrollView>
      {!!onLogout && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Logout" onPress={() => {onClose(); onLogout();}} style={[styles.logout, {borderTopColor: c.border}]}><Text style={{color: c.critical, fontSize: 22}}>⏻</Text><Text style={{color: c.critical, fontWeight: '800', fontSize: 14}}>Logout</Text></TouchableOpacity>}
    </SafeAreaView></Animated.View>
  </View></Modal>;
}
const styles = StyleSheet.create({overlay: {flex: 1, backgroundColor: 'rgba(11,17,30,.54)'}, drawer: {height: '100%'}, brand: {paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8}, close: {width: 44, height: 44, justifyContent: 'center', alignItems: 'center'}, profile: {flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, marginBottom: 8}, avatar: {width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center'}, group: {fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 18, marginBottom: 8, paddingLeft: 12}, item: {minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, borderLeftWidth: 4, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginBottom: 4}, icon: {width: 22, fontSize: 20, textAlign: 'center'}, label: {fontSize: 13, flex: 1, minWidth: 0}, badge: {minWidth: 24, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 12, alignItems: 'center'}, logout: {borderTopWidth: 1, minHeight: 58, flexDirection: 'row', gap: 12, alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12}});
