import React from 'react';
import {ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useThemeMode} from '../theme/useThemeMode';
import {Colors, DARK, LIGHT, tint} from '../theme/palette';

export type QcTone = 'amber' | 'critical' | 'success' | 'cyan' | 'indigo';
export type QcKpi = {label: string; count: number; tone: QcTone};
const toneColor = (c: Colors, tone: QcTone) => c[tone];

/** Theme-aware styles shared by the QC screens. */
export function useQcStyles() {
  const c = useThemeMode() === 'dark' ? DARK : LIGHT;
  return React.useMemo(() => ({c, styles: makeQcStyles(c)}), [c]);
}
export function QcDashboardLayout({eyebrow, title, subtitle, kpis, heading, loading, error, empty,
  refreshing = false, onRefresh, onReload, children, actions}: {
  eyebrow: string; title: string; subtitle: string; kpis?: QcKpi[]; heading: string;
  loading: boolean; error: string; empty: boolean; refreshing?: boolean; onRefresh: () => void;
  children: React.ReactNode; actions?: React.ReactNode; onReload?: () => void;
}) {
  const {c, styles} = useQcStyles();
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
    <View style={styles.hero}><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>
    {kpis && <View style={styles.counts}>{kpis.map(kpi => <View key={kpi.label} style={styles.countCard}>
      <Text style={[styles.count, {color: toneColor(c, kpi.tone)}]}>{kpi.count}</Text><Text style={styles.countLabel}>{kpi.label}</Text>
      <View style={[styles.bar, {backgroundColor: tint(toneColor(c, kpi.tone), '44')}]} />
    </View>)}</View>}
    {actions}
    <View style={styles.heading}><Text style={styles.headingText}>{heading}</Text><TouchableOpacity accessibilityRole="button" onPress={onReload || onRefresh}><Text style={styles.refresh}>Refresh ↻</Text></TouchableOpacity></View>
    {loading ? <ActivityIndicator color={c.amber} style={{margin: 32}} /> : error ? <View style={styles.empty}>
      <Text style={styles.projectTitle}>Projects unavailable</Text><Text style={styles.meta}>{error}</Text>
      <TouchableOpacity onPress={onReload || onRefresh}><Text style={styles.refresh}>Try again</Text></TouchableOpacity>
    </View> : empty ? <View style={styles.empty}><Text style={styles.projectTitle}>No projects assigned</Text><Text style={styles.meta}>QC assignments will appear here.</Text></View> : children}
  </ScrollView>;
}

export function QcProjectCard({name, jobNo, location, status, overdue = false, onPress, actionLabel = 'Open project', children}: {
  name: string; jobNo?: string; location?: string; status: string; overdue?: boolean;
  onPress: () => void; actionLabel?: string; children?: React.ReactNode;
}) {
  const {c, styles} = useQcStyles();
  const tone: QcTone = overdue ? 'indigo' : /approved/i.test(status) ? 'success' : /change/i.test(status) ? 'critical' : 'amber';
  return <TouchableOpacity onPress={onPress} style={styles.project} accessibilityRole="button" accessibilityLabel={actionLabel}>
    <View style={styles.projectTop}><View style={{flex: 1}}><Text style={styles.projectTitle}>{name}</Text><Text style={styles.meta}>{jobNo || 'No job number'} · {location || 'Location not set'}</Text></View>
      <Text style={[styles.badge, {backgroundColor: tint(c[tone], '26'), color: c[tone]}]}>{overdue ? 'Overdue' : status}</Text>
    </View>{children}<Text style={styles.open}>{actionLabel} ›</Text>
  </TouchableOpacity>;
}

export function QcProjectMetadata({fields}: {fields: Array<[string, string | number]>}) {
  const {styles: qcDashboardStyles} = useQcStyles();
  return <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12}}>
    {fields.map(([name, content]) => <View key={name} style={{flexGrow: 1, flexBasis: 180}}>
      <Text style={qcDashboardStyles.meta}>{name}</Text><Text style={[qcDashboardStyles.meta, {fontWeight: '700'}]}>{content}</Text>
    </View>)}
  </View>;
}

const makeQcStyles = (c: Colors) => StyleSheet.create({
  screen: {flex: 1, backgroundColor: c.bg},
  content: {padding: 24, paddingBottom: 48, width: '100%', alignSelf: 'stretch'},
  hero: {backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderLeftWidth: 4, borderLeftColor: c.amber, borderRadius: 14, padding: 24, minHeight: 140, justifyContent: 'center'},
  eyebrow: {fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: c.amber},
  title: {fontSize: 25, fontWeight: '800', color: c.text, marginTop: 8},
  subtitle: {fontSize: 13, color: c.secondary, marginTop: 6},
  counts: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16},
  countCard: {flexGrow: 1, flexBasis: 180, minHeight: 100, padding: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14},
  count: {fontSize: 26, fontWeight: '800'},
  countLabel: {fontSize: 12, fontWeight: '700', color: c.secondary, marginTop: 4},
  bar: {height: 3, borderRadius: 2, marginTop: 12},
  heading: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12},
  headingText: {fontSize: 18, fontWeight: '800', color: c.text},
  refresh: {color: c.amber, fontWeight: '800', fontSize: 12},
  project: {backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 18, marginBottom: 10},
  projectTop: {flexDirection: 'row', alignItems: 'flex-start', gap: 12},
  projectTitle: {fontSize: 15, fontWeight: '800', color: c.text},
  meta: {fontSize: 12, color: c.secondary, marginTop: 5},
  badge: {overflow: 'hidden', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, fontSize: 10, fontWeight: '800'},
  open: {alignSelf: 'flex-end', marginTop: 12, fontSize: 12, color: c.amber, fontWeight: '800'},
  empty: {backgroundColor: c.card, borderWidth: 1, borderColor: c.border, padding: 26, borderRadius: 14, alignItems: 'center'},
});
