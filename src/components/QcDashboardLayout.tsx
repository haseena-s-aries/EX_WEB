import ProjectCompanyLogo from './ProjectCompanyLogo';
import ModuleHeading from '../components/ModuleHeading';
import React from 'react';
import {ActivityIndicator, Image, ImageSourcePropType, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useThemeMode} from '../theme/useThemeMode';
import {Colors, DARK, LIGHT, tint} from '../theme/palette';
import {OPERATIONS_DARK} from '../theme/operationsPalette';
import {visual} from '../theme/visual';
import {projectDisplay} from '../utils/projectDisplay';

const OFFSHORE_ART = require('../assets/landing/industry-3.jpg');
const KPI_ICONS: Record<QcTone, string> = {amber: '▤', cyan: '⌕', critical: '⚠', success: '✓', indigo: '◷'};

export type QcTone = 'amber' | 'critical' | 'success' | 'cyan' | 'indigo';
export type QcKpi = {label: string; count: number; tone: QcTone};
const toneColor = (c: Colors, tone: QcTone) => c[tone];

/** Theme-aware styles shared by the QC screens. */
export function useQcStyles(operations = false) {
  const c = useThemeMode() === 'dark' ? (operations ? OPERATIONS_DARK : DARK) : LIGHT;
  return React.useMemo(() => ({c, styles: makeQcStyles(c)}), [c]);
}
export function QcDashboardLayout({eyebrow, title, subtitle, kpis, heading, loading, error, empty,
  refreshing = false, onRefresh, onReload, children, actions, operations = false, compact = false}: {
  eyebrow: string; title: string; subtitle: string; kpis?: QcKpi[]; heading: string;
  loading: boolean; error: string; empty: boolean; refreshing?: boolean; onRefresh: () => void;
  children: React.ReactNode; actions?: React.ReactNode; onReload?: () => void; operations?: boolean; compact?: boolean;
}) {
  const {c, styles} = useQcStyles(operations);
  return <ScrollView nativeID={operations ? 'ex-qc-operations' : undefined} style={styles.screen} contentContainerStyle={[styles.content, operations && premium.content]}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
    {operations ? <View nativeID="ex-qc-operations-hero" style={[premium.hero, compact && {minHeight: 100, padding: 16}]}>
      <Image source={OFFSHORE_ART} resizeMode="cover" style={premium.photo} accessible={false} />
      <View nativeID="ex-operations-hero-overlay" pointerEvents="none" style={[StyleSheet.absoluteFill, Platform.OS !== 'web' && premium.nativeOverlay]} />
      <Text style={premium.eyebrow}>{eyebrow}</Text>
      <Text accessibilityRole="header" style={premium.title}>{title.split(' ')[0]} <Text style={premium.accent}>{title.slice(title.indexOf(' ') + 1)}</Text></Text>
      <Text style={premium.description}>{subtitle}</Text>
    </View> : <ModuleHeading eyebrow={eyebrow} title={title} description={subtitle} />}
    {kpis && <View nativeID={operations ? 'ex-qc-operations-kpis' : undefined} style={styles.counts}>{kpis.map(kpi => <View key={kpi.label} style={[styles.countCard, operations && premium.countCard, compact && {minHeight: 76, padding: 10}]}>
      {operations && <View style={premium.kpiTop}>
        <Text accessible={false} style={[premium.kpiIcon, {color: c[kpi.tone], backgroundColor: tint(c[kpi.tone], '20')}]}>{KPI_ICONS[kpi.tone]}</Text>
        <View style={{flex: 1, minWidth: 0}}>
          <Text style={[styles.count, {color: c[kpi.tone]}]}>{kpi.count}</Text><Text style={[styles.countLabel, {color: c.text}]}>{kpi.label}</Text>
        </View>
      </View>}
      {!operations && <>
      <Text style={[styles.count, {color: toneColor(c, kpi.tone)}]}>{kpi.count}</Text><Text style={styles.countLabel}>{kpi.label}</Text>
      </>}
      <View style={[styles.bar, {backgroundColor: operations ? c[kpi.tone] : tint(toneColor(c, kpi.tone), '44')}]} />
    </View>)}</View>}
    {actions}
    <View style={[styles.heading, operations && {marginTop: 0}]}><Text accessibilityRole="header" style={styles.headingText}>{heading}</Text><TouchableOpacity accessibilityRole="button" onPress={onReload || onRefresh}
      style={operations ? [premium.action, {borderColor: c.border}] : undefined}><Text style={[styles.refresh, operations && {color: c.cyan}]}>Refresh ↻</Text></TouchableOpacity></View>
    {loading ? <ActivityIndicator color={c.amber} style={{margin: 32}} /> : error ? <View style={styles.empty}>
      <Text style={styles.projectTitle}>Projects unavailable</Text><Text style={styles.meta}>{error}</Text>
      <TouchableOpacity onPress={onReload || onRefresh}><Text style={styles.refresh}>Try again</Text></TouchableOpacity>
    </View> : empty ? <View style={styles.empty}><Text style={styles.projectTitle}>No projects assigned</Text><Text style={styles.meta}>QC assignments will appear here.</Text></View> : children}
  </ScrollView>;
}

export function QcProjectCard({name, jobNo, location, status, overdue = false, onPress, actionLabel = 'Open project', children, showLogo, logoVersion, projectId}: {
  name: string; jobNo?: string; location?: string; status: string; overdue?: boolean;
  onPress: () => void; actionLabel?: string; children?: React.ReactNode;
  showLogo?: boolean; logoVersion?: unknown; projectId?: string;
}) {
  const {c, styles} = useQcStyles(!!showLogo);
  const tone: QcTone = overdue ? 'indigo' : /approved/i.test(status) ? 'success' : /change/i.test(status) ? 'critical' : 'amber';
  return <TouchableOpacity testID={showLogo ? 'qc-operations-project' : undefined} onPress={onPress} style={[styles.project, !!showLogo && premium.project]} accessibilityRole="button" accessibilityLabel={actionLabel}>
    <View style={[styles.projectTop, !!showLogo && premium.projectTop]}>
      {!!showLogo && <ProjectCompanyLogo projectId={projectId || ""} version={logoVersion} style={premium.thumbnail} />}
      <View style={{flex: 1, minWidth: 0}}><Text style={[styles.projectTitle, !!showLogo && premium.projectTitle]}>{projectDisplay(name)}</Text><Text style={styles.meta}>{projectDisplay(jobNo) || 'No job number'} · {projectDisplay(location) || 'Location not set'}</Text></View>
      <Text style={[styles.badge, {backgroundColor: tint(c[tone], '26'), color: c[tone]}]}>{overdue ? 'Overdue' : status}</Text>
    </View>{children}<Text style={[styles.open, !!showLogo && premium.action, !!showLogo && {color: c.cyan, borderColor: c.border}]}>{actionLabel} ›</Text>
  </TouchableOpacity>;
}

export function QcProjectMetadata({fields, operations = false}: {fields: Array<[string, string | number]>; operations?: boolean}) {
  const {c, styles: qcDashboardStyles} = useQcStyles(operations);
  return <View style={[{flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12},
    operations && {borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10}]}>
    {fields.map(([name, content]) => <View key={name} style={{flexGrow: 1, flexBasis: operations ? 145 : 180}}>
      <Text style={qcDashboardStyles.meta}>{name}</Text><Text style={[qcDashboardStyles.meta, {fontWeight: '700'}, operations && {color: c.text, fontSize: 14}]}>{content}</Text>
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

const premium = StyleSheet.create({
  content: {padding: 16},
  hero: {minHeight: 148, padding: 22, justifyContent: 'center', gap: 6, borderWidth: 1,
    borderColor: '#126078', borderRadius: 17, backgroundColor: '#03192C', overflow: 'hidden'},
  photo: {position: 'absolute', right: 0, width: '76%', height: '100%'},
  nativeOverlay: {backgroundColor: '#03192C88'},
  eyebrow: {color: '#00D9EE', fontFamily: visual.mono, fontSize: 11, fontWeight: '800', letterSpacing: 1.6},
  title: {color: '#F5FAFF', fontFamily: visual.display, fontSize: 38, fontStyle: 'italic', fontWeight: '900'},
  accent: {color: '#00D9EE'},
  description: {color: '#F5FAFF', fontSize: 14, lineHeight: 20},
  countCard: {minWidth: 0, padding: 13},
  kpiTop: {flexDirection: 'row', alignItems: 'center', gap: 9},
  kpiIcon: {width: 39, lineHeight: 39, borderRadius: 20, overflow: 'hidden', textAlign: 'center', fontSize: 21, fontWeight: '900'},
  project: {padding: 15, marginBottom: 14},
  projectTop: {alignItems: 'center', flexWrap: 'wrap'},
  thumbnail: {width: 106, height: 58, borderRadius: 10},
  projectTitle: {fontSize: 19},
  action: {paddingVertical: 9, paddingHorizontal: 12, borderWidth: 1, borderRadius: 10},
});
