import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {AppNotification, buildNotifications, loadReadIds, NotificationType, saveReadIds} from '../notifications/notifications';

type Props = {
  role: string;
  userKey: string; // read/unread state is stored per user on this device
  refreshKey?: string; // change this (e.g. the current screen) to refresh right away
  onSelect?: (notification: AppNotification) => void;
  compact?: boolean; // smaller bell for the dark mobile header
};

const POLL_MS = 60000;
const ICONS: Record<NotificationType, {icon: string; color: string; bg: string}> = {
  submitted: {icon: '📋', color: '#3f47d6', bg: '#eceeff'},
  assigned: {icon: '📌', color: '#685bd0', bg: '#f0eeff'},
  overdue: {icon: '⏰', color: '#c0392b', bg: '#fdeaea'},
  users: {icon: '👤', color: '#8a5a00', bg: '#fdf1d8'},
  approved: {icon: '✅', color: '#1f7a4d', bg: '#e3f5ea'},
  hold: {icon: '⏸', color: '#8a5a00', bg: '#fdf1d8'},
  notStarted: {icon: '🕓', color: '#5a6078', bg: '#eef0f6'},
  comments: {icon: '💬', color: '#c0392b', bg: '#fdeaea'},
};

const timeAgo = (value?: string | null) => {
  if (!value) return '';
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return '';
  const minutes = Math.round((Date.now() - t) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(t).toLocaleDateString(undefined, {day: '2-digit', month: 'short'});
};

export default function NotificationBell({role, userKey, refreshKey, onSelect, compact}: Props) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds(userKey));
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const alive = useRef(true);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { setReadIds(loadReadIds(userKey)); }, [userKey]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await buildNotifications(role);
      if (alive.current) { setItems(next); setFailed(false); }
    } catch {
      if (alive.current) setFailed(true);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [role]);

  useEffect(() => { refresh(); }, [refresh, refreshKey]);
  useEffect(() => {
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => { if (open) refresh(); }, [open, refresh]);

  const persist = (next: Set<string>) => { setReadIds(next); saveReadIds(userKey, next); };
  const markRead = (id: string) => { if (!readIds.has(id)) persist(new Set(readIds).add(id)); };
  const markAllRead = () => persist(new Set<string>([...Array.from(readIds), ...items.map(item => item.id)]));

  const unread = items.filter(item => !readIds.has(item.id)).length;
  // unread first, then read; order inside each group is already newest-first
  const sorted = [...items.filter(item => !readIds.has(item.id)), ...items.filter(item => readIds.has(item.id))];

  return <>
    <TouchableOpacity accessibilityLabel={`Notifications${unread ? `, ${unread} unread` : ''}`} onPress={() => setOpen(true)} style={[styles.bell, compact && styles.bellCompact]}>
      <Text style={styles.bellIcon}>🔔</Text>
      {unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text></View>}
    </TouchableOpacity>

    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
        <Pressable style={styles.panel} onPress={() => undefined}>
          <View style={styles.panelHead}>
            <View style={{flex: 1}}>
              <Text style={styles.panelTitle}>Notifications</Text>
              <Text style={styles.panelSub}>{unread > 0 ? `${unread} unread` : 'All caught up'}</Text>
            </View>
            {loading && <ActivityIndicator size="small" color="#3f47d6" style={{marginRight: 10}} />}
            <TouchableOpacity disabled={unread === 0} onPress={markAllRead} style={[styles.headBtn, unread === 0 && {opacity: 0.4}]}><Text style={styles.headBtnText}>Mark all read</Text></TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Close notifications" onPress={() => setOpen(false)} style={styles.closeBtn}><Text style={styles.closeText}>×</Text></TouchableOpacity>
          </View>
          <ScrollView style={{flexGrow: 0}} contentContainerStyle={{paddingBottom: 6}}>
            {failed && items.length === 0 && <Text style={styles.empty}>Could not load notifications. Try again in a moment.</Text>}
            {!failed && !loading && items.length === 0 && <View style={styles.emptyBox}><Text style={styles.emptyIcon}>🔔</Text><Text style={styles.emptyTitle}>No notifications</Text><Text style={styles.empty}>New activity will appear here.</Text></View>}
            {sorted.map(item => {
              const style = ICONS[item.type as NotificationType];
              const isUnread = !readIds.has(item.id);
              return <TouchableOpacity key={item.id} onPress={() => { markRead(item.id); setOpen(false); onSelect?.(item); }} style={[styles.row, isUnread && styles.rowUnread]}>
                <View style={[styles.iconBox, {backgroundColor: style.bg}]}><Text style={styles.iconText}>{style.icon}</Text></View>
                <View style={{flex: 1, minWidth: 0}}>
                  <View style={styles.rowTop}>
                    <Text numberOfLines={1} style={[styles.rowTitle, {color: isUnread ? '#242d52' : '#5a6078'}]}>{item.title}</Text>
                    {!!item.time && <Text style={styles.rowTime}>{timeAgo(item.time)}</Text>}
                  </View>
                  <Text numberOfLines={3} style={styles.rowMessage}>{item.message}</Text>
                </View>
                {isUnread && <View style={styles.dot} />}
              </TouchableOpacity>;
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  bell: {width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e6f0', alignItems: 'center', justifyContent: 'center'},
  bellCompact: {width: 36, height: 36, borderRadius: 18, borderColor: '#3e4974', backgroundColor: '#2f3a66'},
  bellIcon: {fontSize: 17},
  badge: {position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: '#e5484d', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center'},
  badgeText: {fontSize: 9, color: '#fff', fontWeight: '800'},
  backdrop: {flex: 1, alignItems: 'flex-end', paddingTop: 60, paddingHorizontal: 14, backgroundColor: 'rgba(23, 29, 54, 0.18)'},
  panel: {width: '100%', maxWidth: 400, maxHeight: '80%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e6f0', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: {width: 0, height: 8}, elevation: 10},
  panelHead: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderColor: '#e2e6f0'},
  panelTitle: {fontSize: 15, color: '#242d52', fontWeight: '800'},
  panelSub: {fontSize: 10.5, color: '#82879a', marginTop: 2},
  headBtn: {paddingVertical: 7, paddingHorizontal: 10, borderRadius: 7, backgroundColor: '#f0eeff'},
  headBtnText: {fontSize: 10.5, color: '#3f47d6', fontWeight: '800'},
  closeBtn: {width: 28, height: 28, borderRadius: 14, backgroundColor: '#eef0f6', alignItems: 'center', justifyContent: 'center'},
  closeText: {fontSize: 17, color: '#424865', fontWeight: '800', marginTop: -2},
  row: {flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f2f8'},
  rowUnread: {backgroundColor: '#f7f8ff'},
  iconBox: {width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center'},
  iconText: {fontSize: 15},
  rowTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8},
  rowTitle: {flex: 1, fontSize: 12.5, fontWeight: '800'},
  rowTime: {fontSize: 10, color: '#8a8fa3'},
  rowMessage: {fontSize: 11.5, color: '#5a6078', marginTop: 3, lineHeight: 16},
  dot: {width: 8, height: 8, borderRadius: 4, backgroundColor: '#3f47d6', marginTop: 6},
  emptyBox: {alignItems: 'center', paddingVertical: 34},
  emptyIcon: {fontSize: 26, opacity: 0.5},
  emptyTitle: {fontSize: 13, color: '#242d52', fontWeight: '800', marginTop: 8},
  empty: {fontSize: 11.5, color: '#82879a', textAlign: 'center', padding: 16},
});
