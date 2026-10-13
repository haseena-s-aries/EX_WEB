import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {AppNotification, buildNotifications, loadDismissedIds, loadReadIds, NotificationType, saveDismissedIds, saveReadIds} from '../notifications/notifications';

type Props = {
  role: string;
  userKey: string; // read/unread state is stored per user on this device
  refreshKey?: string; // change this (e.g. the current screen) to refresh right away
  onSelect?: (notification: AppNotification) => void;
  compact?: boolean; // smaller bell for the dark mobile header
  row?: boolean; // sidebar variant: the panel opens beside the sidebar instead of at the top right
};

import {Colors, DARK, LIGHT, tint} from '../theme/palette';
import {useThemeMode} from '../theme/useThemeMode';

const POLL_MS = 60000;
const iconStyles = (c: Colors): Record<NotificationType, {icon: string; color: string; bg: string}> => ({
  submitted: {icon: '📋', color: c.indigo, bg: tint(c.indigo, '1F')},
  assigned: {icon: '📌', color: c.cyan, bg: tint(c.cyan, '1F')},
  overdue: {icon: '⏰', color: c.critical, bg: tint(c.critical, '1F')},
  users: {icon: '👤', color: c.amber, bg: tint(c.amber, '22')},
  approved: {icon: '✅', color: c.success, bg: tint(c.success, '1F')},
  hold: {icon: '⏸', color: c.amber, bg: tint(c.amber, '22')},
  notStarted: {icon: '🕓', color: c.muted, bg: c.elevated},
  comments: {icon: '💬', color: c.critical, bg: tint(c.critical, '1F')},
});

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

export default function NotificationBell({role, userKey, refreshKey, onSelect, compact, row}: Props) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds(userKey));
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => loadDismissedIds(userKey));
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const alive = useRef(true);
  const c = useThemeMode() === 'dark' ? DARK : LIGHT;
  const styles = useMemo(() => makeStyles(c), [c]);
  const ICONS = useMemo(() => iconStyles(c), [c]);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { setReadIds(loadReadIds(userKey)); setDismissedIds(loadDismissedIds(userKey)); }, [userKey]);

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
  const markRead = (id: string) => { if (!readIds.has(id)) persist(new Set<string>(readIds).add(id)); };
  const markAllRead = () => persist(new Set<string>([...Array.from(readIds), ...items.map(item => item.id)]));

  const dismiss = (id: string) => { const next = new Set<string>(dismissedIds); next.add(id); setDismissedIds(next); saveDismissedIds(userKey, next); };
  const visible = items.filter(item => !dismissedIds.has(item.id));
  const unread = visible.filter(item => !readIds.has(item.id)).length;
  // unread first, then read; order inside each group is already newest-first
  const sorted = [...visible.filter(item => !readIds.has(item.id)), ...visible.filter(item => readIds.has(item.id))];

  return <>
    <TouchableOpacity accessibilityLabel={`Notifications${unread ? `, ${unread} unread` : ''}`} onPress={() => setOpen(true)} style={[styles.bell, compact && styles.bellCompact]}>
      <Text style={styles.bellIcon}>🔔</Text>
      {unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text></View>}
    </TouchableOpacity>

    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable style={[styles.backdrop, row && styles.backdropSide]} onPress={() => setOpen(false)}>
        <Pressable style={styles.panel} onPress={() => undefined}>
          <View style={styles.panelHead}>
            <View style={{flex: 1}}>
              <Text style={styles.panelTitle}>Notifications</Text>
              <Text style={styles.panelSub}>{unread > 0 ? `${unread} unread` : 'All caught up'}</Text>
            </View>
            {loading && <ActivityIndicator size="small" color={c.amber} style={{marginRight: 10}} />}
            <TouchableOpacity disabled={unread === 0} onPress={markAllRead} style={[styles.headBtn, unread === 0 && {opacity: 0.4}]}><Text style={styles.headBtnText}>Mark all read</Text></TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Close notifications" onPress={() => setOpen(false)} style={styles.closeBtn}><Text style={styles.closeText}>×</Text></TouchableOpacity>
          </View>
          <ScrollView style={{flexGrow: 0}} contentContainerStyle={{paddingBottom: 6}}>
            {failed && visible.length === 0 && <Text style={styles.empty}>Could not load notifications. Try again in a moment.</Text>}
            {!failed && !loading && visible.length === 0 && <View style={styles.emptyBox}><Text style={styles.emptyIcon}>🔔</Text><Text style={styles.emptyTitle}>No notifications</Text><Text style={styles.empty}>New activity will appear here.</Text></View>}
            {sorted.map(item => {
              const style = ICONS[item.type as NotificationType];
              const isUnread = !readIds.has(item.id);
              return <View key={item.id} style={[styles.row, isUnread && styles.rowUnread]}>
                <TouchableOpacity onPress={() => { markRead(item.id); setOpen(false); onSelect?.(item); }} style={styles.rowMain}>
                  <View style={[styles.iconBox, {backgroundColor: style.bg}]}><Text style={styles.iconText}>{style.icon}</Text></View>
                  <View style={{flex: 1, minWidth: 0}}>
                    <View style={styles.rowTop}>
                      <Text numberOfLines={1} style={[styles.rowTitle, {color: isUnread ? c.text : c.secondary}]}>{item.title}</Text>
                      {!!item.time && <Text style={styles.rowTime}>{timeAgo(item.time)}</Text>}
                    </View>
                    <Text numberOfLines={3} style={styles.rowMessage}>{item.message}</Text>
                  </View>
                  {isUnread && <View style={styles.dot} />}
                </TouchableOpacity>
                <TouchableOpacity accessibilityLabel="Remove notification" onPress={() => dismiss(item.id)} style={styles.removeBtn}><Text style={styles.removeText}>×</Text></TouchableOpacity>
              </View>;
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  </>;
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
  bell: {width: 40, height: 40, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center'},
  bellCompact: {width: 38, height: 38, borderRadius: 19},
  bellIcon: {fontSize: 17},
  backdropSide: {alignItems: 'flex-start', paddingLeft: 284},
  badge: {position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: c.amber, borderWidth: 2, borderColor: c.bg, alignItems: 'center', justifyContent: 'center'},
  badgeText: {fontSize: 9, color: c.onAmber, fontWeight: '800'},
  backdrop: {flex: 1, alignItems: 'flex-end', paddingTop: 60, paddingHorizontal: 14, backgroundColor: 'rgba(15, 23, 42, 0.35)'},
  panel: {width: '100%', maxWidth: 400, maxHeight: '80%', backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: {width: 0, height: 8}, elevation: 10},
  panelHead: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderColor: c.border},
  panelTitle: {fontSize: 15, color: c.text, fontWeight: '800'},
  panelSub: {fontSize: 10.5, color: c.muted, marginTop: 2},
  headBtn: {paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, backgroundColor: tint(c.amber, '22')},
  headBtnText: {fontSize: 10.5, color: c.amber, fontWeight: '800'},
  closeBtn: {width: 28, height: 28, borderRadius: 14, backgroundColor: c.elevated, alignItems: 'center', justifyContent: 'center'},
  closeText: {fontSize: 17, color: c.secondary, fontWeight: '800', marginTop: -2},
  row: {flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 16, paddingRight: 10, paddingVertical: 12, borderBottomWidth: 1, borderColor: c.border},
  rowMain: {flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 11},
  removeBtn: {width: 24, height: 24, marginLeft: 8, borderRadius: 12, backgroundColor: c.elevated, alignItems: 'center', justifyContent: 'center'},
  removeText: {fontSize: 15, color: c.secondary, fontWeight: '800', marginTop: -2},
  rowUnread: {backgroundColor: tint(c.amber, '12')},
  iconBox: {width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center'},
  iconText: {fontSize: 15},
  rowTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8},
  rowTitle: {flex: 1, fontSize: 12.5, fontWeight: '800'},
  rowTime: {fontSize: 10, color: c.muted},
  rowMessage: {fontSize: 11.5, color: c.secondary, marginTop: 3, lineHeight: 16},
  dot: {width: 8, height: 8, borderRadius: 4, backgroundColor: c.amber, marginTop: 6},
  emptyBox: {alignItems: 'center', paddingVertical: 34},
  emptyIcon: {fontSize: 26, opacity: 0.5},
  emptyTitle: {fontSize: 13, color: c.text, fontWeight: '800', marginTop: 8},
  empty: {fontSize: 11.5, color: c.muted, textAlign: 'center', padding: 16},
  });
}
