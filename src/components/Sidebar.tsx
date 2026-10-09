import React, {useMemo} from 'react';
import {View, Text, TouchableOpacity, ScrollView, Platform} from 'react-native';
import QcPendingBadge from './QcPendingBadge';
import {Colors, DARK, LIGHT, tint} from '../theme/palette';
import {setThemeMode, useThemeMode} from '../theme/useThemeMode';

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
  {key: 'Reports', label: 'Reports', hint: 'Inspection reports', icon: '↗', tone: 'success'},
  {key: 'QcPending', label: 'QC Pending', hint: 'Awaiting review', icon: '▤', tone: 'amber', adminOnly: true},
  {key: 'ManagerQcReview', label: 'QC Review', hint: 'Assignments & approvals', icon: '✓', tone: 'success', adminOnly: true},
  {key: 'UserManagement', label: 'User Management', hint: 'Approve and assign users', icon: '☻', tone: 'cyan', adminOnly: true},
];

type Props = {
  active: string;
  userName: string;
  userRole: string;
  onNavigate: (key: string) => void;
  onLogout: () => void;
  qcPendingCount?: number;
};

const web = (style: object) => Platform.select({web: style, default: {}}) as object;

export default function Sidebar({active, userName, userRole, onNavigate, onLogout, qcPendingCount}: Props) {
  const isAdminOrManager = userRole === 'Admin' || userRole === 'Manager';
  const dark = useThemeMode() === 'dark';
  const c: Colors = dark ? DARK : LIGHT;
  const accentText = dark ? c.yellow : c.amber;
  const items = useMemo(
    () =>
      NAV_ITEMS.filter(
        item => !item.adminOnly || isAdminOrManager || (item.key === 'QcPending' && userRole.toLowerCase() === 'qc'),
      ),
    [isAdminOrManager, userRole],
  );

  return (
    <View
      style={[
        {
          width: 272,
          backgroundColor: dark ? c.bar : c.card,
          borderRightWidth: 1,
          borderRightColor: c.border,
          minHeight: '100%' as any,
        },
        web({boxShadow: c.shadow}),
      ]}>
      {/* amber safety stripe */}
      <View style={{height: 4, backgroundColor: c.amber}} />

      {/* brand */}
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14}}>
        <View style={{width: 44, height: 44, borderRadius: 11, backgroundColor: '#FBBF24', alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{color: '#000', fontSize: 20, fontWeight: '900', fontStyle: 'italic'}}>Ex</Text>
        </View>
        <View style={{flex: 1}}>
          <Text style={{color: c.text, fontSize: 20, fontWeight: '800'}}>Ex-Survey</Text>
          <Text style={{color: c.secondary, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, marginTop: 1}}>
            ATEX & IECEx INSPECTIONS
          </Text>
        </View>
      </View>

      {/* nav */}
      <ScrollView style={{flex: 1}} contentContainerStyle={{paddingHorizontal: 12, paddingBottom: 16}} showsVerticalScrollIndicator={false}>
        <Text style={{fontSize: 10.5, fontWeight: '800', letterSpacing: 1.4, color: c.muted, marginTop: 18, marginBottom: 8, marginLeft: 10}}>
          WORKSPACE
        </Text>
        <View style={{gap: 4}}>
          {items.map(item => {
            const on = active === item.key;
            const toneColor = c[item.tone] as string;
            const isQc = item.key === 'QcPending';
            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{selected: on}}
                onPress={() => onNavigate(item.key)}
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
                {on ? (
                  <View style={{position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2, backgroundColor: c.amber}} />
                ) : null}
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: tint(toneColor, dark ? '26' : '1A'),
                  }}>
                  <Text style={{fontSize: 19, color: toneColor}}>{item.icon}</Text>
                </View>
                <View style={{flex: 1, minWidth: 0}}>
                  <Text numberOfLines={1} style={{fontSize: 15, fontWeight: on ? '800' : '700', color: on ? accentText : c.text}}>
                    {item.label}
                  </Text>
                  <Text numberOfLines={1} style={{fontSize: 11.5, color: c.muted, marginTop: 1}}>
                    {item.hint}
                  </Text>
                </View>
                {isQc ? (
                  <QcPendingBadge count={qcPendingCount} active={on} />
                ) : (
                  <Text style={{fontSize: 18, color: on ? c.amber : c.border}}>›</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* footer: theme + logout */}
      <View style={{borderTopWidth: 1, borderTopColor: c.border, padding: 14, gap: 10}}>
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="switch"
          accessibilityState={{checked: dark}}
          accessibilityLabel={dark ? 'Switch to light theme' : 'Switch to dark theme'}
          onPress={() => setThemeMode(dark ? 'light' : 'dark')}
          style={[
            {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: c.elevated},
            web({cursor: 'pointer'}),
          ]}>
          <Text style={{fontSize: 18}}>{dark ? '🌙' : '☀️'}</Text>
          <Text style={{flex: 1, color: c.text, fontSize: 14, fontWeight: '700'}}>{dark ? 'Dark theme' : 'Light theme'}</Text>
          <View
            style={{
              width: 46,
              height: 26,
              borderRadius: 13,
              padding: 3,
              justifyContent: 'center',
              alignItems: dark ? 'flex-end' : 'flex-start',
              backgroundColor: dark ? c.amber : c.borderActive,
            }}>
            <View style={{width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF'}} />
          </View>
        </TouchableOpacity>

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
