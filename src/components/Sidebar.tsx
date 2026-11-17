import {typography} from '../theme/typography';
import {useUserAccessCounts} from '../api/userAccess';
import {visual} from '../theme/visual';
import React, {useMemo} from 'react';
import {View, Text, TouchableOpacity, ScrollView, Platform, Image} from 'react-native';
import QcPendingBadge from './QcPendingBadge';
import {Colors, DARK, LIGHT, tint} from '../theme/palette';
import {useThemeMode} from '../theme/useThemeMode';

const ARIES_LOGO = require('../assets/aries-logo.png');
const MARINE_PHOTO = require('../assets/landing/industry-1.jpg');
const OFFSHORE_PHOTO = require('../assets/landing/industry-3.jpg');

type NavItem = {
  key: string;
  label: string;
  hint: string;
  icon: string;
  tone: keyof Colors;
  adminOnly?: boolean;
};

// Same labels, glyphs and accent tones as the phone drawer (MobileDrawer) so both read as one app.
const NAV_ITEMS: NavItem[] = [
  {key: 'Dashboard', label: 'Home', hint: 'Dashboard & site operations', icon: '⌂', tone: 'amber'},
  {key: 'Projects', label: 'Surveys', hint: 'Projects and areas', icon: '▤', tone: 'cyan'},
  {key: 'AdminEquipmentList', label: 'HAER', hint: 'Equipment register and reference documents', icon: '⬡', tone: 'indigo', adminOnly: true},
  {key: 'EquipmentIdentification', label: 'Scan equipment', hint: 'RFID, NFC, QR and manual lookup', icon: '⌕', tone: 'indigo', adminOnly: true},
  {key: 'InspectionPlanning', label: 'Planning', hint: 'Campaigns and work packages', icon: '◷', tone: 'amber', adminOnly: true},
  {key: 'DefectRegister', label: 'Defects', hint: 'Rectification and verification', icon: '⚠', tone: 'amber', adminOnly: true},
  {key: 'Reports', label: 'Reports', hint: 'Inspection reports', icon: '↗', tone: 'success'},
  {key: 'ChecklistAdmin', label: 'Checklists', hint: 'Controlled checklist versions', icon: '☷', tone: 'cyan', adminOnly: true},
  {key: 'ManagerQcReview', label: 'QC Reviewed List', hint: 'Monitor and review inspections', icon: '✓', tone: 'amber', adminOnly: true},
  {key: 'QcPending', label: 'QC Pending', hint: 'Awaiting review', icon: '▤', tone: 'amber', adminOnly: true},
  {key: 'UserManagement', label: 'User Management', hint: 'Approve and assign users', icon: '☻', tone: 'cyan', adminOnly: true},
  {key: 'Settings', label: 'Settings', hint: 'Appearance preferences', icon: '⚙', tone: 'cyan'},
];

type Props = {
  active: string;
  workspaceColor?: string;
  operationsStyle?: boolean;
  onSettings: () => void;
  settingsOpen?: boolean;
  userRole: string;
  onNavigate: (key: string) => void;
  onLogout: () => void;
  qcPendingCount?: number;
  /** Notification bell, shown beside the Ex-Survey title in the brand row. */
  notification?: React.ReactNode;
};

const web = (style: object) => Platform.select({web: style, default: {}}) as object;

export default function Sidebar({active, onSettings, settingsOpen, userRole, onNavigate, onLogout, qcPendingCount, notification, workspaceColor, operationsStyle}: Props) {
  const isAdminOrManager = userRole === 'Admin' || userRole === 'Manager';
  const accessCounts=useUserAccessCounts(isAdminOrManager);
  const dark = useThemeMode() === 'dark';
  const c: Colors = dark ? DARK : LIGHT;
  const accentText = dark ? c.yellow : c.amber;
  const items = useMemo(
    () =>
      NAV_ITEMS.filter(
        item => !item.adminOnly || isAdminOrManager || (['AdminEquipmentList','ChecklistAdmin'].includes(item.key) && userRole.toLowerCase() === 'surveyor') || (item.key === 'EquipmentIdentification' && ['qc','surveyor'].includes(userRole.toLowerCase())) || (item.key === 'QcPending' && userRole.toLowerCase() === 'qc') || (item.key === 'ChecklistAdmin' && userRole.toLowerCase() === 'qc') || (item.key === 'InspectionPlanning' && ['qc', 'surveyor'].includes(userRole.toLowerCase())) || (item.key === 'DefectRegister' && ['qc', 'surveyor'].includes(userRole.toLowerCase())),
      ),
    [isAdminOrManager, userRole],
  );

  const firstQualityItem = items.find(item => item.key === 'ManagerQcReview' || item.key === 'QcPending')?.key;
  const groups: Record<string, string> = operationsStyle
    ? {Projects: 'OPERATIONS', DefectRegister: 'QUALITY & COMPLIANCE', ManagerQcReview: 'QC OPERATIONS', UserManagement: 'ADMINISTRATION'}
    : {[firstQualityItem ?? '']: 'QUALITY CONTROL', UserManagement: 'ADMINISTRATION'};

  if (userRole.toLowerCase() === 'client') return <View nativeID="ex-client-sidebar" style={[{width: 248, flexShrink: 0,
    backgroundColor: dark ? '#071A27' : c.card, borderRightWidth: 1, borderRightColor: dark ? '#304F60' : c.border},
    web({position: 'sticky', top: 0, height: '100vh', alignSelf: 'flex-start'})]}>
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, padding: 22, borderBottomWidth: 1, borderBottomColor: c.border}}>
      <Image source={ARIES_LOGO} resizeMode="contain" accessibilityLabel="Ex-Survey logo" style={{width: 52, height: 44}} />
      <View style={{flex: 1}}><Text style={{color: c.text, fontSize: 23, fontWeight: '800'}}>Ex-Survey</Text><Text style={{color: c.secondary, fontSize: 10, marginTop: 4}}>Industrial Survey & Inspection</Text></View>
    </View>
    <ScrollView style={{flex: 1}} contentContainerStyle={{padding: 14, gap: 7}}><Text style={{color: c.secondary, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, padding: 10, marginTop: 12}}>CLIENT WORKSPACE</Text>
      {([['Dashboard', 'Dashboard', '⌂'], ['Projects', 'Projects', '▤'], ['Defects', 'Defects', '⚠'], ['Reports', 'Reports', '↗'], ['Notifications', 'Notifications', '♧']] as const).map(([key, title, icon]) =>
        <TouchableOpacity key={key} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{selected: !settingsOpen && active === key}} onPress={() => onNavigate(key)}
          style={{flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 50, paddingHorizontal: 14, borderRadius: 9,
            borderLeftWidth: 3, borderLeftColor: !settingsOpen && active === key ? c.cyan : 'transparent', backgroundColor: !settingsOpen && active === key ? tint(c.cyan, '24') : 'transparent'}}>
          <Text style={{color: c.cyan, fontSize: 23, width: 25, textAlign: 'center'}}>{icon}</Text><Text style={{color: c.text, fontSize: 15, fontWeight: active === key ? '700' : '500'}}>{title}</Text>
        </TouchableOpacity>)}
    </ScrollView>
    <View style={{padding: 18, gap: 8, borderTopWidth: 1, borderTopColor: c.border}}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Settings" onPress={onSettings} style={{padding: 12, minHeight: 44, flexDirection: 'row', gap: 14}}><Text style={{color: c.cyan, fontSize: 20}}>⚙</Text><Text style={{color: c.text, fontSize: 15}}>Settings</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Logout" onPress={onLogout} style={{padding: 12, minHeight: 44, flexDirection: 'row', gap: 14}}><Text style={{color: c.critical, fontSize: 20}}>⏻</Text><Text style={{color: c.critical, fontSize: 15}}>Logout</Text></TouchableOpacity>
    </View>
  </View>;

  return (
    <View nativeID={operationsStyle ? 'ex-operations-sidebar' : 'ex-sidebar'}
      style={[
        {
          width: workspaceColor ? 250 : 248,
          backgroundColor: workspaceColor || (dark ? c.bar : c.card),
          borderRightWidth: 1,
          borderRightColor: workspaceColor && dark ? '#284654' : c.border,
          flexShrink: 0,
        },
        // Fixed to the viewport so the sidebar keeps its size however long the page grows.
        web({boxShadow: c.shadow, position: 'sticky', top: 0, height: '100vh', alignSelf: 'flex-start'}),
      ]}>
      {/* amber safety stripe */}
      {!workspaceColor && <View style={{height: 4, backgroundColor: c.amber}} />}

      {/* brand */}
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 24, paddingBottom: 22, borderBottomWidth: workspaceColor ? 1 : 0, borderBottomColor: dark ? '#263648' : c.border}}>
        <View style={{width: 60, height: 36, borderRadius: 8, backgroundColor: '#FFFFFF', padding: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
          <Image source={ARIES_LOGO} style={{width: '100%', height: '100%'}} resizeMode="contain" accessibilityLabel="Aries logo" />
        </View>
        <View style={{flex: 1}}>
          <Text style={{color: workspaceColor && dark ? '#ffffff' : c.text, fontSize: 20, fontWeight: '800'}}>Ex-Survey</Text>
          <Text style={{color: workspaceColor && dark ? '#a9c2d3' : c.secondary, fontSize: 10, marginTop: 3}}>
            {operationsStyle ? 'Industrial Survey & Inspection' : 'FIELD OPERATIONS'}
          </Text>
        </View>
        {notification}
      </View>

      {/* nav */}
      <ScrollView style={{flex: 1}} contentContainerStyle={{paddingHorizontal: 12, paddingBottom: 16}} showsVerticalScrollIndicator={false}>
        {!operationsStyle && <Text style={{fontSize: 10.5, fontWeight: '800', letterSpacing: 1.4, color: c.muted, marginTop: 18, marginBottom: 8, marginLeft: 10}}>
          WORKSPACE
        </Text>}
        <View style={{gap: 4, paddingTop: operationsStyle ? 12 : 0}}>
          {items.map(item => {
            const on = settingsOpen ? item.key === 'Settings' : active === item.key;
            const toneColor = c[item.tone] as string;
            const isQc = item.key === 'QcPending';
            return (
              <React.Fragment key={item.key}>
                {groups[item.key] &&
                  <Text style={{fontFamily: typography.label.fontFamily, fontSize: 11, letterSpacing: 1.2, fontWeight: '700',
                    color: operationsStyle ? (dark ? '#67e6f2' : c.secondary) : workspaceColor && dark ? '#9dbdc8' : c.secondary, paddingLeft: 10, marginTop: 13, marginBottom: 2}}>
                    {groups[item.key]}
                  </Text>}
              <TouchableOpacity
                nativeID={operationsStyle && on ? 'ex-operations-selected-nav' : undefined}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{selected: on}}
                onPress={() => item.key === 'Settings' ? onSettings() : onNavigate(item.key)}
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: operationsStyle ? 4 : workspaceColor ? 6 : 8,
                    paddingHorizontal: 10,
                    borderRadius: workspaceColor ? 8 : 14,
                    borderWidth: 1,
                    borderColor: on && operationsStyle ? (dark ? '#00D9EE' : c.cyan) : on && !workspaceColor ? tint(c.amber, '55') : 'transparent',
                    backgroundColor: on ? (operationsStyle && !dark ? tint(c.cyan, '24') : workspaceColor ? '#72c8d325' : tint(c.amber, dark ? '1F' : '17')) : 'transparent',
                  },
                  web({cursor: 'pointer'}),
                ]}>
                {on && !workspaceColor ? (
                  <View style={{position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2, backgroundColor: c.amber}} />
                ) : null}
                <View
                  style={{
                    width: workspaceColor ? 24 : 40,
                    height: workspaceColor ? 32 : 40,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: workspaceColor ? 'transparent' : tint(toneColor, dark ? '26' : '1A'),
                  }}>
                  <Text style={{fontSize: 19, color: operationsStyle ? (dark ? '#00D9EE' : c.cyan) : workspaceColor && dark ? (on ? visual.signal : '#a4c4cf') : toneColor}}>{item.icon}</Text>
                </View>
                <View style={{flex: 1, minWidth: 0}}>
                  <Text style={{...typography.navigation, flexShrink: 1, fontWeight: on ? '700' : '600', color: workspaceColor && dark ? (on ? '#ffffff' : '#c6d3e2') : operationsStyle && !dark ? c.text : on ? accentText : c.text}}>
                    {operationsStyle && isAdminOrManager && item.key === 'Dashboard' ? 'Dashboard' : item.label}
                  </Text>
                  {!workspaceColor && <Text numberOfLines={1} style={{fontSize: 11.5, color: c.muted, marginTop: 1}}>
                    {item.hint}
                  </Text>}
                </View>
                {item.key==='UserManagement'&&accessCounts.pendingRegistrations>0 ? <QcPendingBadge count={accessCounts.pendingRegistrations} active={on}/> : isQc ? (
                  <QcPendingBadge count={qcPendingCount} active={on} />
                ) : (
                  workspaceColor ? (on ? <View style={{width: 7, height: 7, borderRadius: 4, backgroundColor: visual.signal}} /> : null) : <Text style={{fontSize: 18, color: on ? c.amber : c.border}}>›</Text>
                )}
              </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>
      {operationsStyle && dark && <View nativeID="ex-operations-sidebar-photo" pointerEvents="none" style={{height: 116, overflow: 'hidden'}}>
        <Image source={userRole.toLowerCase() === 'surveyor' ? OFFSHORE_PHOTO : MARINE_PHOTO}
          resizeMode="cover" style={{width: '100%', height: '100%'}} />
      </View>}

      {/* footer */}
      <View style={{borderTopWidth: 1, borderTopColor: workspaceColor && dark ? '#284654' : c.border, padding: 14, gap: 10}}>
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Log out"
          onPress={onLogout}
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: tint(c.critical, '66'),
              backgroundColor: tint(c.critical, dark ? '1F' : '12'),
            },
            web({cursor: 'pointer'}),
          ]}>
          <Text style={{fontSize: 16, color: c.critical}}>⏻</Text>
          <Text style={{fontSize: 14.5, fontWeight: '800', color: c.critical}}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
