import {typography} from '../theme/typography';
import React from 'react';
import {ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View} from 'react-native';
import {QcKpi, useQcStyles} from './QcDashboardLayout';
import {tint} from '../theme/palette';
import {useThemeMode} from '../theme/useThemeMode';
import {visual} from '../theme/visual';
import {projectDisplay} from '../utils/projectDisplay';

const INDUSTRIAL_ART = require('../assets/landing/industry-3.jpg');
const icons = ['▱', '◷', '!', '✓', '▦'];
const date = (input?: string) => {
  if (!input) return '—';
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString(undefined, {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'});
};

export type QcWorkspaceProject = {
  id: string; name: string; jobNo?: string; location?: string; status: string; overdue: boolean;
  equipmentCount?: number; approvedCount?: number; changesRequestedCount?: number;
  lastQcActivity?: string; updatedAt?: string; submissionDate?: string; detailsUnavailable?: boolean;
  onPress: () => void;
};

/** Presentation only: the screen retains its existing assignments, aggregates and callbacks. */
export default function QcWorkspaceOverview({userName, projects, kpis, loading, refreshing, error, refreshedAt,
  onRefresh, projectsOnly, children}: {
  userName: string; projects: QcWorkspaceProject[]; kpis?: QcKpi[]; loading: boolean; refreshing: boolean;
  error: string; refreshedAt?: string; onRefresh: () => void; projectsOnly?: boolean; children?: React.ReactNode;
}) {
  const {c} = useQcStyles(true);
  const dark = useThemeMode() === 'dark';
  const {width} = useWindowDimensions();
  const mobile = width < 700;
  const wide = width >= 1400;
  const s = React.useMemo(() => styles(c), [c]);
  const metric = (label: string, content: React.ReactNode, extra?: React.ReactNode) => <View style={s.metric}>
    <Text style={s.label}>{label}</Text><Text style={s.metricValue}>{content}</Text>{extra}
  </View>;
  return <ScrollView nativeID="ex-qc-workspace" style={s.screen} contentContainerStyle={[s.content, mobile && {padding: 14}]}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.cyan} />}>
    <View nativeID="ex-qc-workspace-hero" style={[s.hero, mobile && {padding: 22, minHeight: 180}]}>
      <Image source={INDUSTRIAL_ART} resizeMode="cover" style={s.heroImage} accessible={false} />
      <View nativeID="ex-qc-workspace-shade" pointerEvents="none" style={[StyleSheet.absoluteFill, {backgroundColor: '#03192C99'}]} />
      <View pointerEvents="none" style={s.orbit} /><View pointerEvents="none" style={[s.orbit, {right: 70, top: -65, width: 290, height: 290}]} />
      <Text style={s.eyebrow}>▏ QC WORKSPACE</Text>
      <Text accessibilityRole="header" style={[s.heroTitle, mobile && {fontSize: 30}]}>{projectsOnly ? 'Assigned Projects' : `Welcome, ${userName.trim() || 'QC'}`}</Text>
      <Text style={s.heroSubtitle}>Assigned projects and inspection review status</Text>
    </View>
    {kpis && <View nativeID="ex-qc-workspace-kpis" style={s.kpis}>{kpis.map((kpi, index) => {
      const accent = kpi.tone === 'indigo' ? (dark ? '#7DD3FC' : '#0369A1') : c[kpi.tone];
      return <View key={kpi.label} testID="qc-workspace-kpi" style={[s.kpi, {borderColor: tint(accent, dark ? '88' : '55'), backgroundColor: dark ? tint(accent, '12') : c.card}]}>
        <View style={s.kpiHeading}><View style={[s.iconBox, {backgroundColor: tint(accent, '20')}]}><Text accessible={false} style={[s.icon, {color: accent}]}>{icons[index]}</Text></View><Text style={s.kpiLabel}>{kpi.label}</Text></View>
        <Text style={s.kpiValue}>{loading ? '—' : kpi.count}</Text>
        <View pointerEvents="none" style={[s.accentRule, {backgroundColor: tint(accent, '55')}]} />
      </View>;
    })}</View>}
    <View style={s.sectionHeading}><View style={s.sectionTitleRow}><Text accessible={false} style={[s.icon, {color: c.cyan}]}>▱</Text><Text accessibilityRole="header" style={s.sectionTitle}>Assigned Projects <Text style={{color: c.secondary}}>({projects.length})</Text></Text></View>
      <View style={s.refreshRow}>{!!refreshedAt && !mobile && <Text style={s.label}>Last refreshed: {date(refreshedAt)}</Text>}<TouchableOpacity accessibilityRole="button" accessibilityLabel="Refresh QC assignments" onPress={onRefresh} disabled={refreshing || loading} style={[s.secondaryButton, (refreshing || loading) && {opacity: .6}]}><Text style={s.secondaryText}>{refreshing ? 'Refreshing…' : '↻  Refresh'}</Text></TouchableOpacity></View>
    </View>
    {loading ? <View style={s.state}><ActivityIndicator color={c.cyan} /><Text style={s.secondary}>Loading your QC workspace…</Text></View>
      : error ? <View accessibilityRole="alert" style={s.state}><Text style={s.stateTitle}>Unable to load assignments</Text><Text style={s.secondary}>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={onRefresh} style={s.secondaryButton}><Text style={s.secondaryText}>Try again</Text></TouchableOpacity></View>
      : projects.length === 0 ? <View style={s.state}><Text style={[s.icon, {color: c.cyan}]}>▱</Text><Text style={s.stateTitle}>No projects assigned</Text><Text style={s.secondary}>Projects assigned to you for QC review will appear here.</Text></View>
      : projects.map(project => {
        const tone = project.overdue ? (dark ? '#7DD3FC' : '#0369A1') : /approved|complete/i.test(project.status) ? c.success : /change|revision|rework/i.test(project.status) ? c.critical : /in.?review/i.test(project.status) ? c.cyan : c.amber;
        const total = project.equipmentCount;
        const approved = project.approvedCount;
        const percent = total != null && total > 0 && approved != null ? Math.min(100, Math.max(0, Math.round(approved / total * 100))) : undefined;
        const activityDate = project.lastQcActivity || project.updatedAt || project.submissionDate;
        const activityLabel = project.lastQcActivity ? 'Last QC Activity' : project.updatedAt ? 'Last Updated' : 'Last Submission';
        return <View key={project.id} testID="qc-workspace-project" style={[s.project, {flexDirection: wide ? 'row' : 'column'}]}>
          <View style={s.projectAccent} />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open project ${project.name}`} onPress={project.onPress} style={[s.projectIdentity, wide && {flex: 1.3}]}>
            <View style={[s.projectIcon, {backgroundColor: tint(c.cyan, '18')}]}><Text accessible={false} style={[s.icon, {color: c.cyan}]}>▥</Text></View><View style={{flex: 1, minWidth: 0}}><Text style={s.projectName}>{projectDisplay(project.name)}</Text><Text style={s.secondary}>{projectDisplay(project.jobNo) || 'No job number'} · {projectDisplay(project.location) || 'Location not set'}</Text></View>
          </TouchableOpacity>
          <View style={[s.metrics, wide && {flex: 2.5}, mobile && {gap: 18}]}>
            {metric('QC approval progress', percent == null ? '—' : `${percent}%`, percent != null ? <View accessibilityRole="progressbar" accessibilityLabel={`${project.name} QC approval progress`} accessibilityValue={{min: 0, max: 100, now: percent}} style={s.track}><View style={[s.fill, {width: `${percent}%`}]} /></View> : <Text style={s.note}>{total === 0 ? 'No equipment registered' : project.detailsUnavailable ? 'Details unavailable' : 'No progress available'}</Text>)}
            {metric('Approved / equipment', approved != null && total != null ? `${approved} / ${total}` : '—')}
            {metric('Changes requested', project.changesRequestedCount ?? '—')}
            {metric(activityLabel, date(activityDate))}
          </View>
          <View style={[s.projectActions, !wide && {flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap'}]}>
            <Text style={[s.badge, {color: tone, backgroundColor: tint(tone, '20')}]}>{project.overdue ? 'Overdue · ' : ''}{project.status.replace(/([a-z])([A-Z])/g, '$1 $2')}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open Project: ${project.name}`} onPress={project.onPress} style={[s.primaryButton, {backgroundColor: c.cyan}]}><Text style={{fontSize: 14, fontWeight: '800', color: dark ? '#03192C' : '#FFFFFF'}}>Open Project  →</Text></TouchableOpacity>
          </View>
        </View>;
      })}
    {!loading && !error && children}
  </ScrollView>;
}

const styles = (c: ReturnType<typeof useQcStyles>['c']) => StyleSheet.create({
  screen: {flex: 1, backgroundColor: c.bg}, content: {padding: 24, paddingBottom: 44, gap: 20},
  hero: {minHeight: 180, borderRadius: 20, borderWidth: 1, borderColor: c.borderActive, backgroundColor: '#042638', padding: 32, overflow: 'hidden', justifyContent: 'center', gap: 10},
  heroImage: {position: 'absolute', right: 0, width: '78%', height: '100%', opacity: .8},
  orbit: {position: 'absolute', right: -70, top: -145, width: 460, height: 460, borderRadius: 230, borderWidth: 1, borderColor: '#00D9EE44'},
  eyebrow: {fontSize: 12, fontFamily: visual.mono, fontWeight: '800', color: '#00E4EF', letterSpacing: 2},
  heroTitle: {...typography.page, color: '#F5FAFF', }, heroSubtitle: {fontSize: 16, lineHeight: 24, color: '#DEEFF6'},
  kpis: {flexDirection: 'row', flexWrap: 'wrap', gap: 14}, kpi: {flexBasis: 160, flexGrow: 1, minWidth: 0, padding: 20, borderWidth: 1, borderRadius: 17, gap: 12},
  kpiHeading: {flexDirection: 'row', alignItems: 'center', gap: 10}, iconBox: {height: 38, width: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center'}, icon: {fontSize: 26, fontWeight: '700'},
  kpiLabel: {...typography.label, color: c.text, flexShrink: 1}, kpiValue: {...typography.kpi, color: c.text, }, accentRule: {height: 3, borderRadius: 3},
  sectionHeading: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8},
  sectionTitleRow: {flexDirection: 'row', gap: 12, alignItems: 'center'}, sectionTitle: {...typography.section, color: c.text}, refreshRow: {flexDirection: 'row', alignItems: 'center', gap: 16},
  label: {fontSize: 12, lineHeight: 18, color: c.secondary}, secondary: {fontSize: 13, lineHeight: 21, color: c.secondary},
  secondaryButton: {minHeight: 44, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: c.borderActive, justifyContent: 'center'}, secondaryText: {fontSize: 13, fontWeight: '700', color: c.cyan},
  project: {position: 'relative', borderWidth: 1, borderColor: c.borderActive, borderRadius: 16, backgroundColor: c.card, padding: 22, paddingLeft: 30, gap: 20, alignItems: 'stretch'},
  projectAccent: {position: 'absolute', top: 24, bottom: 24, left: 10, width: 3, borderRadius: 3, backgroundColor: c.cyan},
  projectIdentity: {flexDirection: 'row', gap: 16, alignItems: 'center', minWidth: 0}, projectIcon: {height: 58, width: 58, borderRadius: 13, justifyContent: 'center', alignItems: 'center'},
  projectName: {...typography.card, color: c.text, }, metrics: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14},
  metric: {flexGrow: 1, flexBasis: 120, minWidth: 0, gap: 7, borderLeftWidth: 1, borderLeftColor: c.border, paddingLeft: 14}, metricValue: {fontSize: 14, fontWeight: '700', lineHeight: 21, color: c.text},
  track: {height: 6, borderRadius: 6, overflow: 'hidden', backgroundColor: c.elevated, marginTop: 2}, fill: {height: '100%', backgroundColor: c.cyan, borderRadius: 6}, note: {fontSize: 11, color: c.muted},
  projectActions: {gap: 12, alignItems: 'center', justifyContent: 'center'}, badge: {fontSize: 11, fontWeight: '800', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, overflow: 'hidden'},
  primaryButton: {minHeight: 44, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  state: {padding: 36, alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 16, borderColor: c.border, backgroundColor: c.card}, stateTitle: {fontSize: 19, fontWeight: '700', color: c.text},
});
