import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';

type NavItem = {
  key: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {key: 'Dashboard', label: 'Dashboard', icon: '🏠'},
  {key: 'UserManagement', label: 'User Management', icon: '👥', adminOnly: true},
  {key: 'Projects', label: 'Projects', icon: '📁'},
  {key: 'Reports', label: 'Reports', icon: '📊'},
];

type Props = {
  active: string;
  userName: string;
  userRole: string;
  onNavigate: (key: string) => void;
  onLogout: () => void;
};

export default function Sidebar({active, userName, userRole, onNavigate, onLogout}: Props) {
  const isAdminOrManager = userRole === 'Admin' || userRole === 'Manager';

  return (
    <View style={styles.sidebar}>
      <View style={styles.logoRow}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>EX</Text>
        </View>
        <View>
          <Text style={styles.brand}>Ex-Survey</Text>
          <Text style={styles.brandSub}>Field App</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>NAVIGATION</Text>

      <View style={styles.navList}>
        {NAV_ITEMS.filter(item => !item.adminOnly || isAdminOrManager).map(item => {
          const isActive = active === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => onNavigate(item.key)}
              style={[styles.navItem, isActive && styles.navItemActive]}>
              <Text style={styles.navIcon}>{item.icon}</Text>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footer}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userName.charAt(0)}</Text>
          </View>
          <View style={{flex: 1}}>
            <Text style={styles.userName} numberOfLines={1}>
              {userName}
            </Text>
            <Text style={styles.userRole}>{userRole}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    backgroundColor: '#12143d',
    paddingVertical: 24,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    minHeight: '100%' as any,
  },
  logoRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 30},
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#3f47d6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {color: '#fff', fontWeight: '800', fontSize: 14},
  brand: {color: '#fff', fontSize: 15, fontWeight: '700'},
  brandSub: {color: '#8b8fc2', fontSize: 11},
  sectionLabel: {
    color: '#6b6fa0',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  navList: {gap: 4, flex: 1},
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  navItemActive: {backgroundColor: '#3f47d6'},
  navIcon: {fontSize: 15},
  navLabel: {color: '#b3b6e0', fontSize: 13.5, fontWeight: '600'},
  navLabelActive: {color: '#fff'},
  footer: {borderTopWidth: 1, borderTopColor: '#2a2d63', paddingTop: 16, marginTop: 16},
  userRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12},
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#3f47d6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {color: '#fff', fontWeight: '700', fontSize: 13},
  userName: {color: '#fff', fontSize: 13, fontWeight: '700'},
  userRole: {color: '#8b8fc2', fontSize: 11},
  logoutBtn: {
    borderWidth: 1.5,
    borderColor: '#3a3d78',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  logoutText: {color: '#b3b6e0', fontSize: 12.5, fontWeight: '600'},
});