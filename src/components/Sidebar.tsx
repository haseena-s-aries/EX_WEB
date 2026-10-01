import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';

type NavItem = {
  key: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {key: 'Dashboard', label: 'Dashboard', icon: '⌂'},
  {key: 'Projects', label: 'Projects', icon: '▦'},
  {key: 'Reports', label: 'Reports', icon: '↗'},
  {key: 'UserManagement', label: 'User Management', icon: '◎', adminOnly: true},
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

      <Text style={styles.sectionLabel}>WORKSPACE</Text>

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
    width: 264,
    backgroundColor: '#242d52',
    borderRightWidth: 1,
    borderRightColor: '#3e4974',
    paddingVertical: 28,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    minHeight: '100%' as any,
  },
  logoRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 42},
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#b8a5f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {color: '#242d52', fontWeight: '900', fontSize: 14},
  brand: {color: '#fff', fontSize: 15, fontWeight: '800'},
  brandSub: {color: '#c9cded', fontSize: 10, letterSpacing: 0.7, marginTop: 2},
  sectionLabel: {
    color: '#aeb9d6',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 13,
  },
  navList: {gap: 6, flex: 1},
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 13,
    borderRadius: 11,
  },
  navItemActive: {backgroundColor: '#b8a5f8'},
  navIcon: {fontSize: 17, color: '#c9cded', width: 22, textAlign: 'center'},
  navLabel: {color: '#e3eaff', fontSize: 13, fontWeight: '600'},
  navLabelActive: {color: '#242d52', fontWeight: '800'},
  footer: {borderTopWidth: 1, borderTopColor: '#3e4974', paddingTop: 18, marginTop: 16},
  userRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12},
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#354574',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {color: '#b8a5f8', fontWeight: '800', fontSize: 13},
  userName: {color: '#fff', fontSize: 13, fontWeight: '800'},
  userRole: {color: '#c9cded', fontSize: 11},
  logoutBtn: {
    borderWidth: 1.5,
    borderColor: '#485780',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  logoutText: {color: '#e3eaff', fontSize: 12.5, fontWeight: '700'},
});
