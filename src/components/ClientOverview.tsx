import {typography} from '../theme/typography';
import React, {useState} from 'react';
import {ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View} from 'react-native';
import {ClientDashboard, ClientNotice, ClientProject, ClientSection} from '../api/clientDashboard';
import {DashboardLayout, DashboardStatusBadge, useDashboardPresentation} from './DashboardPresentation';
import SearchableOptionPicker from './SearchableOptionPicker';
import {Colors} from '../theme/palette';
import {useThemeMode} from '../theme/useThemeMode';
import {projectDisplay} from '../utils/projectDisplay';

const MARITIME = require('../assets/landing/industry-1.jpg');
const format = (value?: string) => value ? new Date(value).toLocaleString() : '—';
const label = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2');
export function useClientOverviewStyle() {
  const {c: base} = useDashboardPresentation();
  const dark = useThemeMode() === 'dark';
  const c = dark ? {...base, bg: '#061522', card: '#102534', elevated: '#173244', border: '#304F60', cyan: '#00D9EE'} : base;
  return {c, s: styles(c)};
}
export function ClientOverviewLayout({title, kpis, loading, error, refreshing, onRefresh, children, accessory, actions}: React.ComponentProps<typeof DashboardLayout>) {
  const {c, s} = useClientOverviewStyle(); const {width} = useWindowDimensions();
  return <ScrollView nativeID="ex-client-overview" style={{flex: 1, backgroundColor: c.bg}}
    contentContainerStyle={[s.page, width < 650 && {padding: 16}]} refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.cyan} />}>
    <View style={s.top}><Text style={s.muted}>Client portal  /  <Text style={s.text}>Overview</Text></Text><View style={s.topActions}>{accessory}</View></View>
    <View style={s.top}><View style={{flex: 1, minWidth: 0}}><Text accessibilityRole="header" style={[s.title, width < 650 && {fontSize: 28}]}>Project overview</Text>
      <Text style={s.muted}>Welcome back, {title}. Here is your survey portfolio.</Text></View><ClientAction title={refreshing ? 'Refreshing…' : '↻ Refresh'} onPress={onRefresh} disabled={refreshing} /></View>
    <View style={s.hero}><Image source={MARITIME} resizeMode="cover" style={StyleSheet.absoluteFill} accessible={false} />
      <View nativeID="ex-client-banner-shade" pointerEvents="none" style={[StyleSheet.absoluteFill, {backgroundColor: '#03192C8A'}]} />
      <Text style={s.heroTitle}>Confidence at every stage.</Text><Text style={s.heroDescription}>Follow your inspections from fieldwork to final report.</Text>
      {actions}
    </View>
    {!loading && kpis && <View style={s.metrics}>{kpis.map(kpi => <View key={kpi.label} style={[s.metric, width < 650 && {flexBasis: '43%'}]}>
      <Text style={s.metricLabel}>{kpi.label}</Text><View style={{flexDirection: 'row', alignItems: 'center', gap: 9}}><View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: kpi.color}} /><Text style={s.metricValue}>{kpi.count}</Text></View>
    </View>)}</View>}
    {loading ? <View style={s.panel}><ActivityIndicator color={c.cyan} accessibilityLabel="Loading client dashboard" /><Text style={s.muted}>Loading your workspace…</Text></View> : error ?
      <View style={s.panel}><Text accessibilityRole="alert" style={s.heading}>Unable to load your workspace</Text><Text style={s.muted}>{error}</Text><ClientAction title="Try again" onPress={onRefresh} /></View> : children}
  </ScrollView>;
}
export function ClientAction({title, onPress, disabled = false, primary = false}: {title: string; onPress: () => void; disabled?: boolean; primary?: boolean}) {
  const {c, s} = useClientOverviewStyle();
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled}} disabled={disabled} onPress={onPress}
    style={[s.button, primary && {backgroundColor: c.cyan, borderColor: c.cyan}, disabled && {opacity: 0.45}]}><Text style={[s.buttonText, primary && {color: '#031522'}]}>{title}</Text></TouchableOpacity>;
}
export function ClientOverviewContent({dashboard, reports, notices, activityDefects, readIds, query, onQuery, onNavigate, onProject, onRefresh, onNotice, onPdf, pdfBusy}: {
  dashboard: ClientDashboard | null; reports: any[]; notices: ClientNotice[]; activityDefects: any[]; readIds: Set<string>;
  query: string; onQuery: (v: string) => void; onNavigate: (section: ClientSection) => void; onProject: (id: string) => void;
  onRefresh: () => void; onNotice: (notice: ClientNotice) => void; onPdf: (id: string, download: boolean) => void; pdfBusy: string;
}) {
  const {s} = useClientOverviewStyle(); const {width} = useWindowDimensions();
  const [projectStatus, setProjectStatus] = useState('');
  const projects = dashboard?.projects || [];
  const shown = projects.filter(p => (!projectStatus || p.projectStatus === projectStatus) &&
    `${p.projectName} ${p.jobNumber} ${p.location}`.toLowerCase().includes(query.trim().toLowerCase()));
  const unread = notices.filter(n => !readIds.has(n.id));
  const decisions = activityDefects.filter(f => f.actionStatus === 'Verified' && f.actionId);
  const activity = [...(dashboard?.recentActivity || [])].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  const validReports = reports.filter(r => projects.some(p => p.projectId === r.projectId));
  return <>
    <View style={[s.columns, width < 1050 && {flexDirection: 'column'}]}>
      <View style={{flex: 7, minWidth: 0, gap: 16}}><View style={s.panel}>
        <View style={s.top}><Text style={s.heading}>Your projects <Text style={s.count}>{projects.length}</Text></Text><ClientAction title="View all" onPress={() => onNavigate('Projects')} /></View>
        <View style={s.filters}><TextInput accessibilityLabel="Search my projects" placeholder="Search project, job number or location…" placeholderTextColor={s.muted.color}
          style={[s.input, {flexGrow: 2, flexBasis: 260}]} value={query} onChangeText={onQuery} />
          <View style={{flexGrow: 1, flexBasis: 170}}><SearchableOptionPicker dark={s.page.backgroundColor === '#061522'} label="Project status" value={projectStatus} placeholder="All statuses"
            options={[{label: 'All statuses', value: ''}, ...[...new Set(projects.map(p => p.projectStatus))].map(v => ({label: label(v), value: v}))]} onChange={setProjectStatus} /></View>
        </View>
        {shown.length ? shown.map(p => <ClientProjectSummary key={p.projectId} project={p} report={reports.find(r => r.projectId === p.projectId)} onPress={() => onProject(p.projectId)} />) :
          <View style={s.empty}><Text style={s.emptyIcon}>▱</Text><View style={{flex: 1, minWidth: 0}}><Text style={s.heading}>{projects.length ? 'No matching projects' : 'Your workspace is ready'}</Text>
            <Text style={s.muted}>{projects.length ? 'Try another search or project status.' : 'Once an administrator assigns a project, you can track equipment inspections, QC feedback, and reports here.'}</Text></View>
            <ClientAction title="Refresh Projects" onPress={onRefresh} /></View>}
        <Text style={s.heading}>Reports &amp; documents</Text>
        {validReports.length ? validReports.slice(0, 3).map(r => <View key={r.projectId} style={s.reportRow}><View style={{flex: 1, minWidth: 0}}><Text style={s.text}>{projectDisplay(r.projectName)}</Text>
          <Text style={s.muted}>{r.documentNumber || 'Project report'}{r.revision ? ` · Rev ${r.revision}` : ''} · {r.reportStatus || '—'}</Text>
          {!!r.generatedDate && <Text style={s.muted}>Generated {format(r.generatedDate)}</Text>}</View><View style={s.filters}>
            <ClientAction title={pdfBusy === r.projectId ? 'Loading PDF…' : 'View PDF'} disabled={!!pdfBusy} onPress={() => onPdf(r.projectId, false)} />
            <ClientAction title="Download PDF" disabled={!!pdfBusy} onPress={() => onPdf(r.projectId, true)} /></View></View>) :
          <View style={s.reportRow}><View style={{flex: 1}}><Text style={s.text}>Inspection reports</Text><Text style={s.muted}>{projects.length ? 'No reports available yet.' : 'Available after project assignment.'}</Text></View><ClientAction title="View reports" disabled onPress={() => onNavigate('Reports')} /></View>}
        {!!validReports.length && <ClientAction title="Open Report Library →" onPress={() => onNavigate('Reports')} />}
      </View></View>
      <View style={{flex: 3, minWidth: 0, gap: 16}}><View style={s.panel}><Text style={s.heading}>Needs your attention</Text>
        {!decisions.length && !unread.length ? <View style={s.empty}><Text style={s.emptyIcon}>✓</Text><View style={{flex: 1}}><Text style={s.text}>You are all caught up</Text><Text style={s.muted}>Assigned project updates will appear here.</Text></View></View> : <>
          {!!decisions.length && <ClientAction title={`${decisions.length} verified defect${decisions.length === 1 ? '' : 's'} awaiting your decision →`} onPress={() => onNavigate('Defects')} />}
          {unread.slice(0, 3).map(n => <TouchableOpacity key={n.id} accessibilityRole="button" onPress={() => onNotice(n)} style={s.reportRow}><View style={{flex: 1}}><Text style={s.text}>● {n.title}</Text><Text style={s.muted}>{n.message}</Text><Text style={s.muted}>{format(n.time)}</Text></View></TouchableOpacity>)}
        </>}
      </View><View style={s.panel}><Text style={s.heading}>Quick navigation</Text>
        {([['Progress', 'Track inspection progress'], ['Defects', 'View defect updates'], ['Reports', 'Browse report library']] as [ClientSection, string][]).map(([key, title]) =>
          <TouchableOpacity key={key} accessibilityRole="button" accessibilityLabel={title} onPress={() => onNavigate(key)} style={s.reportRow}><Text style={[s.text, {flex: 1}]}>{title}</Text><Text style={s.emptyIcon}>›</Text></TouchableOpacity>)}
      </View></View>
    </View>
    <View style={s.panel}><View style={s.top}><Text style={s.heading}>Latest updates</Text><ClientAction title="Notifications →" onPress={() => onNavigate('Notifications')} /></View>
      {activity.length ? activity.slice(0, 5).map(a => <TouchableOpacity key={a.id} accessibilityRole="button" accessibilityLabel={`Open update for ${a.projectName}`} onPress={() => onProject(a.projectId)} style={s.reportRow}>
        <View style={{flex: 1}}><Text style={s.text}>{a.action} · {projectDisplay(a.projectName)}</Text>{!!a.detail && <Text style={s.muted}>{a.detail}</Text>}</View><Text style={s.muted}>{format(a.occurredAt)}</Text></TouchableOpacity>) : <Text style={s.muted}>No project activity yet.</Text>}
    </View>
  </>;
}
function ClientProjectSummary({project: p, report, onPress}: {project: ClientProject; report?: any; onPress: () => void}) {
  const {s} = useClientOverviewStyle();
  return <View style={s.project}><View style={s.top}><View style={{flex: 1, minWidth: 0}}><Text style={s.heading}>{projectDisplay(p.projectName)}</Text><Text style={s.muted}>{projectDisplay(p.jobNumber) || '—'} · {projectDisplay(p.location) || '—'}</Text></View><DashboardStatusBadge status={label(p.projectStatus)} /></View>
    <View style={s.filters}><Text style={s.muted}>QC: {label(p.qcStatus)}</Text>{!!report?.reportStatus && <Text style={s.muted}>Report: {report.reportStatus}</Text>}</View>
    <View style={s.top}><Text style={s.muted}>Survey progress</Text><Text style={s.text}>{p.progress.surveyProgress}%</Text></View>
    <View style={s.track}><View style={[s.fill, {width: `${Math.max(0, Math.min(100, p.progress.surveyProgress))}%`}]} /></View>
    <Text style={s.muted}>{p.progress.equipmentInspected} / {p.progress.totalEquipment} equipment inspected · {p.progress.totalAreas} areas</Text>
    <ClientAction title="View Project" onPress={onPress} />
  </View>;
}
const styles = (c: Colors) => StyleSheet.create({
  page: {padding: 24, paddingBottom: 40, gap: 16, backgroundColor: c.bg, width: '100%'}, top: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12},
  topActions: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12}, text: {color: c.text, fontSize: 15, fontWeight: '600', lineHeight: 22},
  muted: {color: c.secondary, fontSize: 14, lineHeight: 22}, title: {...typography.page, color: c.text, marginBottom: 5}, heading: {...typography.section, color: c.text, },
  hero: {minHeight: 170, padding: 26, borderWidth: 1, borderColor: c.border, borderRadius: 12, overflow: 'hidden', justifyContent: 'center', gap: 8}, heroTitle: {color: '#F5FAFF', fontSize: 29, lineHeight: 36, fontWeight: '800'}, heroDescription: {color: '#D3E6F0', fontSize: 16, lineHeight: 24},
  metrics: {flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.card, overflow: 'hidden'}, metric: {flexGrow: 1, flexBasis: 140, padding: 16, borderRightWidth: 1, borderRightColor: c.border, gap: 5}, metricLabel: {color: c.text, fontSize: 14, lineHeight: 20}, metricValue: {...typography.kpi, color: c.text, },
  columns: {flexDirection: 'row', alignItems: 'stretch', gap: 16}, panel: {borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.card, padding: 18, gap: 16, minWidth: 0},
  filters: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12}, input: {borderWidth: 1, borderColor: c.border, borderRadius: 8, backgroundColor: c.bg, padding: 12, color: c.text, fontSize: 14, minHeight: 44, minWidth: 0},
  empty: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, padding: 16, borderRadius: 10, backgroundColor: c.elevated}, emptyIcon: {fontSize: 26, color: c.cyan}, count: {fontSize: 16, color: c.secondary},
  button: {minHeight: 44, paddingVertical: 10, paddingHorizontal: 15, borderWidth: 1, borderColor: c.border, borderRadius: 8, alignSelf: 'flex-start', justifyContent: 'center'}, buttonText: {...typography.button, color: c.text},
  reportRow: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.border, minHeight: 48},
  project: {borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 16, gap: 10, backgroundColor: c.bg}, track: {height: 5, borderRadius: 3, backgroundColor: c.elevated, overflow: 'hidden'}, fill: {height: 5, backgroundColor: c.cyan}, explore: {alignSelf: 'flex-start'},
});
