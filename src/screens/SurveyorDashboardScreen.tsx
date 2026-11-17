import {onProjectChanged} from '../api/projectChanges';
import ProjectCompanyLogo from '../components/ProjectCompanyLogo';
import {typography} from '../theme/typography';
import AuthenticatedImage from '../components/AuthenticatedImage';
import {OPERATIONS_DARK} from '../theme/operationsPalette';
import {visual} from '../theme/visual';
import {projectDisplay} from '../utils/projectDisplay';
import EquipmentInspectionScreen from './EquipmentInspectionScreen';
import CategoryInspectionEntryScreen from './CategoryInspectionEntryScreen';
import InspectionActivityScreen from './InspectionActivityScreen';
import {getAssignedInspectionDrafts, AssignedInspectionDraft, getAssignedInspectionTasks, AssignedInspectionTask} from '../api/projects';
import useNativeNavigation from '../navigation/useNativeNavigation';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {getApiErrorMessage} from '../api/errors';
import {
  getSurveyorDashboard,
  getSurveyorProject,
  getSurveyorProjects,
  projectStatusLabel,
  SurveyorDashboard,
  SurveyorProjectSummary,
  SurveyorQcFeedback,
} from '../api/projects';
import {useThemeMode} from '../theme/useThemeMode';
import {Colors, LIGHT, tint} from '../theme/palette';

const SURVEYOR_HERO = require('../assets/landing/industry-9.jpg');
const OFFSHORE_ART = require('../assets/landing/industry-3.jpg');

const web = (style: object) => Platform.select({web: style, default: {}}) as object;

type Props = {
  userName: string;
  onProjectPress: (projectId: string) => void;
  onFeedbackPress: (feedback: SurveyorQcFeedback) => void;
  refreshVersion?: number;
  accessory?: React.ReactNode;
};

const VISIBLE_PROJECTS = 6;

/** Display label for a project's status ('InProgress' -> 'In Progress'); blank means just assigned. */
const projectStatus = (project: SurveyorProjectSummary) =>
  project.status ? projectStatusLabel(project.status) : 'Assigned';

const statusColor = (c: Colors, status: string) =>
  ({
    Assigned: c.indigo,
    Pending: c.yellow,
    Active: c.indigo,
    'In Progress': c.cyan,
    Completed: c.success,
    'On Hold': c.critical,
  } as Record<string, string>)[status] || c.secondary;

const severityColor = (c: Colors, severity?: string | null) =>
  ({high: c.critical, medium: c.amber, low: c.yellow} as Record<string, string>)[
    String(severity || '').toLowerCase()
  ] || c.muted;

export default function SurveyorDashboardScreen({
  userName,
  onProjectPress,
  onFeedbackPress,
  refreshVersion,
  accessory,
}: Props) {
  const navigation = useNativeNavigation();
  const mode = useThemeMode();
  const dark = mode === 'dark';
  const c = dark ? OPERATIONS_DARK : LIGHT;
  const s = useMemo(() => makeStyles(c), [c]);
  const {width} = useWindowDimensions();
  const isWide = width >= 900;

  const [drafts, setDrafts] = useState<AssignedInspectionDraft[]>([]);
  const [pendingTasks, setPendingTasks] = useState<AssignedInspectionTask[]>([]);
  const [draftError, setDraftError] = useState('');
  const [activeDraft, setActiveDraft] = useState<AssignedInspectionDraft>();
  const [legacyDraft, setLegacyDraft] = useState(false);
  const [projects, setProjects] = useState<SurveyorProjectSummary[]>([]);
  const [dashboard, setDashboard] = useState<SurveyorDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showAll, setShowAll] = useState(false);

  const loadProjects = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const [projectsResponse, dashboardResponse] = await Promise.all([
        getSurveyorProjects(),
        getSurveyorDashboard(),
      ]);
      setProjects(projectsResponse.data);
      setDashboard(dashboardResponse.data);
      setDraftError('');
      try {
        const [draftResponse, taskResponse] = await Promise.all([getAssignedInspectionDrafts(), getAssignedInspectionTasks()]);
        setDrafts(draftResponse.data);
        setPendingTasks(taskResponse.data);
      }
      catch (e) {setDraftError(getApiErrorMessage(e, 'Could not load assigned project drafts.'));}
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not load assigned projects.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => onProjectChanged(() => {void loadProjects(true);}), [loadProjects]);
  useEffect(() => {
    loadProjects();
  }, [loadProjects, refreshVersion]);
  useEffect(() => navigation?.addListener('focus', () => void loadProjects(true)), [navigation, loadProjects]);

  // ---- derived view state -------------------------------------------------
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach(p => {
      const k = projectStatus(p);
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [projects]);
  const filters = ['All', ...Object.keys(statusCounts)];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter(p => {
      if (statusFilter !== 'All' && projectStatus(p) !== statusFilter) return false;
      if (!q) return true;
      return [p.projectName, p.location, p.jobNo, p.vesselOrSiteName]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q));
    });
  }, [projects, statusFilter, query]);
  const shown = showAll ? filtered : filtered.slice(0, VISIBLE_PROJECTS);

  const feedback = dashboard?.qcFeedback ?? [];
  const actionRequired = dashboard?.changesRequested ?? feedback.length;

  const projectSplit = dashboard
    ? [
        {n: dashboard.inProgress, color: c.cyan, label: 'in progress'},
        {n: dashboard.onHold, color: c.critical, label: 'on hold'},
        {n: dashboard.notStarted, color: c.yellow, label: 'not started'},
      ]
    : [];

  if (activeDraft) {
    const back = () => {setActiveDraft(undefined); setLegacyDraft(false); void loadProjects(true);};
    if (activeDraft.isLegacy) return <EquipmentInspectionScreen projectId={activeDraft.projectId} equipmentId={activeDraft.equipmentId}
      onBack={back} onSaved={() => void loadProjects(true)} />;
    if (activeDraft.grade || legacyDraft) return <InspectionActivityScreen equipmentId={activeDraft.equipmentId}
      activityId={activeDraft.grade ? activeDraft.id : undefined} role="Surveyor" onBack={back} />;
    return <CategoryInspectionEntryScreen project={activeDraft.projectId} item={activeDraft.equipmentId}
      initialDraft={activeDraft} onBack={back} onSaved={() => void loadProjects(true)} onLegacy={() => setLegacyDraft(true)} />;
  }
  return (
    <ScrollView nativeID="ex-surveyor-operations"
      style={s.screen}
      contentContainerStyle={[s.content, isWide && s.contentWide]}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProjects(true)} tintColor={c.amber} />}>
      {!!accessory && <View style={{alignItems: 'flex-end'}}>{accessory}</View>}
      <View nativeID="ex-surveyor-hero" style={s.hero}>
        <Image nativeID="ex-surveyor-hero-photo" source={SURVEYOR_HERO} resizeMode="cover" style={s.heroPhoto} accessible={false} />
        <View nativeID="ex-operations-hero-overlay" pointerEvents="none" style={[StyleSheet.absoluteFill, Platform.OS !== 'web' && {backgroundColor: '#03192C88'}]} />
        <Text style={s.heroKicker}>FIELD DESK  /  SURVEYOR</Text>
        <Text accessibilityRole="header" style={s.heroTitle}>Survey <Text style={s.heroAccent}>Workspace</Text></Text>
        <Text style={s.heroDescription}>Assigned projects, saved inspection drafts and quality review feedback.</Text>
      </View>
      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={c.amber} />
          <Text style={s.loadingText}>Loading your projects</Text>
        </View>
      ) : error ? (
        <View style={s.stateBox}>
          <Text style={s.stateTitle}>Projects couldn't load</Text>
          <Text style={s.stateText}>{error}</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={() => loadProjects()}>
            <Text style={s.primaryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View nativeID="ex-surveyor-drafts" style={s.panel}>
            <Text accessibilityRole="header" style={s.sectionTitle}><Text style={s.sectionIcon}>▱  </Text>Assigned Project Drafts</Text>
            {!!draftError && <Text accessibilityRole="alert" style={{color: c.critical}}>{draftError}</Text>}
            {!draftError && drafts.length === 0 && <Text style={s.stateText}>No saved drafts for your assigned projects.</Text>}
            {drafts.map(draft => <View key={draft.id} style={s.draftRow}>
              <View style={s.draftDetails}>
                <ProjectCompanyLogo projectId={draft.projectId} version={draft} style={s.thumbnail} />
                <View style={s.flexText}>
                  <Text style={s.projectName}>{projectDisplay(draft.projectName)} · {draft.tagNumber}</Text>
                  <Text style={s.projectLoc}>{draft.reviewStatus} · {draft.answered}/{draft.total} checkpoints · {new Date(draft.updatedAt).toLocaleString()} · {draft.lastUpdatedBy || 'Unknown'}</Text>
                </View>
              </View>
              <TouchableOpacity accessibilityRole="button" style={s.primaryBtn} onPress={() => setActiveDraft(draft)}>
                <Text style={s.primaryBtnText}>Continue Inspection</Text>
                <Text style={s.primaryBtnText} accessible={false}>›</Text>
              </TouchableOpacity>
            </View>)}
          </View>
          {pendingTasks.length > 0 && <View style={s.panel}>
            <Text accessibilityRole="header" style={s.stateTitle}>Pending Inspection Tasks</Text>
            {pendingTasks.map(task => <TouchableOpacity key={task.id} accessibilityRole="button" onPress={() => onProjectPress?.(task.projectId)}
              style={{backgroundColor: c.elevated, padding: 10}}>
              <Text style={{color: c.text, fontWeight: '700'}}>{projectDisplay(task.projectName)} · {task.tagNumber}</Text>
              <Text style={{color: c.muted}}>{task.plannedGrade || 'Inspection'} · {task.statusCode}{task.scheduledAt ? ` · ${new Date(task.scheduledAt).toLocaleDateString()}` : ''}</Text>
            </TouchableOpacity>)}
          </View>}
          {/* KPI cards */}
          {dashboard ? (
            <View nativeID="ex-surveyor-kpis" style={s.kpiGrid}>
              <View style={[s.kpiCard, isWide ? s.kpiCardWide : s.kpiCardNarrow, {borderColor: tint(c.cyan, '80')}]}>
                <View style={[s.iconBox, {backgroundColor: tint(c.cyan, '1F')}]}>
                  <Text style={[s.iconGlyph, {color: c.cyan}]}>▤</Text>
                </View>
                <View style={s.kpiBody}>
                  <Text style={s.kpiLabel}>Assigned Projects</Text>
                  <Text style={s.kpiValue}>{dashboard.myProjectCount}</Text>
                  <Text style={s.kpiFoot}>{projectSplit.map(x => `${x.n} ${x.label}`).join(' · ')}</Text>
                </View>
              </View>

              <View style={[s.kpiCard, isWide ? s.kpiCardWide : s.kpiCardNarrow, {borderColor: tint(c.critical, '80')}]}>
                <View style={[s.iconBox, {backgroundColor: tint(c.critical, '24')}]}>
                  <Text style={[s.iconGlyph, {color: c.critical}]}>⚠</Text>
                </View>
                <View style={s.kpiBody}>
                  <Text style={s.kpiLabel}>Action Required</Text>
                  <Text style={s.kpiValue}>{actionRequired}</Text>
                  <Text style={s.kpiFoot}>{actionRequired ? 'Returned by QC for correction' : 'No corrections requested'}</Text>
                </View>
              </View>

              <View style={[s.kpiCard, isWide ? s.kpiCardWide : s.kpiCardNarrow, {borderColor: tint(c.amber, '80')}]}>
                <View style={[s.iconBox, {backgroundColor: tint(c.amber, '22')}]}>
                  <Text style={[s.iconGlyph, {color: c.amber}]}>◷</Text>
                </View>
                <View style={s.kpiBody}>
                  <Text style={s.kpiLabel}>Awaiting QC Review</Text>
                  <Text style={s.kpiValue}>{dashboard.awaitingQcReview}</Text>
                  <Text style={s.kpiFoot}>Submitted, waiting for sign-off</Text>
                </View>
              </View>

              <View style={[s.kpiCard, isWide ? s.kpiCardWide : s.kpiCardNarrow, {borderColor: tint(c.success, '80')}]}>
                <View style={[s.iconBox, {backgroundColor: tint(c.success, '22')}]}>
                  <Text style={[s.iconGlyph, {color: c.success}]}>✓</Text>
                </View>
                <View style={s.kpiBody}>
                  <Text style={s.kpiLabel}>QC Approved</Text>
                  <Text style={s.kpiValue}>{dashboard.qcApproved}</Text>
                  <Text style={s.kpiFoot}>Signed off by QC</Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* QC feedback */}
          {dashboard ? (
            <View nativeID="ex-surveyor-feedback" style={s.panel}>
              <View style={feedback.length === 0 ? s.feedbackSummary : undefined}>
                <View style={s.flexText}>
                  <Text accessibilityRole="header" style={s.sectionTitle}><Text style={s.sectionIcon}>▣  </Text>QC Feedback</Text>
                  <Text style={s.sectionHint}>
                    {feedback.length ? `${feedback.length} ${feedback.length === 1 ? 'item' : 'items'} returned for correction` : 'Equipment returned for correction'}
                  </Text>
                </View>
              {feedback.length === 0 ? (
                <View style={s.clearNote}>
                  <View style={[s.chipDot, {backgroundColor: c.success}]} />
                  <Text style={s.clearNoteText}>Nothing to correct. QC feedback that needs action will show here.</Text>
                </View>
              ) : (
                <View style={[s.cardGrid, isWide && s.cardGridWide]}>
                  {feedback.map(f => {
                    const sev = severityColor(c, f.severity);
                    return (
                      <TouchableOpacity
                        key={f.equipmentId}
                        accessibilityRole="button"
                        accessibilityLabel={`Review equipment ${f.tagNumber}`}
                        onPress={() => onFeedbackPress(f)}
                        activeOpacity={0.75}
                        style={[s.projectCard, s.feedbackCard, isWide && s.cardWide, web({cursor: 'pointer'})]}>
                        <View style={{flex: 1, minWidth: 0}}>
                          <View style={s.feedbackTop}>
                            <Text style={s.projectName} numberOfLines={1}>
                              <Text style={s.seq}>#{f.sequenceNo}  </Text>
                              {f.tagNumber}
                            </Text>
                            <View style={[s.badge, {backgroundColor: tint(sev, '26')}]}>
                              <Text style={[s.badgeText, {color: sev}]}>{(f.severity || 'Severity not set').toUpperCase()}</Text>
                            </View>
                          </View>
                          <Text style={s.projectLoc} numberOfLines={1}>
                            {[projectDisplay(f.projectName), projectDisplay(f.areaName), f.type].filter(Boolean).join('  •  ')}
                          </Text>
                          <Text style={s.comment} numberOfLines={3}>{f.qcComments || 'QC requested changes.'}</Text>
                          <View style={s.feedbackFoot}>
                            <Text style={s.footDate}>{formatReviewedDate(f.reviewedDate)}</Text>
                            <Text style={s.link}>Review equipment ›</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              </View>
            </View>
          ) : null}

          {/* projects */}
          <View style={s.panel}>
          <View style={s.sectionHeading}>
            <View style={{flex: 1}}>
              <Text accessibilityRole="header" style={s.sectionTitle}><Text style={s.sectionIcon}>▱  </Text>Active Site Operations</Text>
              <Text style={s.sectionHint}>
                {filtered.length === projects.length ? `${projects.length} total` : `${filtered.length} of ${projects.length} projects`}
              </Text>
            </View>
          </View>

          {projects.length > 0 ? (
            <View style={[s.toolbar, isWide && s.toolbarWide]}>
              <View style={[s.search, isWide && {width: 300}]}>
                <Text style={s.searchIcon}>⌕</Text>
                <TextInput
                  accessibilityLabel="Search assigned projects"
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search project, location or job no."
                  placeholderTextColor={c.muted}
                  style={[s.searchInput, web({outlineStyle: 'none'})]}
                  returnKeyType="search"
                />
                {query ? (
                  <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Clear search" hitSlop={8}>
                    <Text style={s.searchClear}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                {filters.map(f => {
                  const on = statusFilter === f;
                  const n = f === 'All' ? projects.length : statusCounts[f] || 0;
                  return (
                    <TouchableOpacity
                      key={f}
                      accessibilityRole="button"
                      accessibilityState={{selected: on}}
                      onPress={() => {setStatusFilter(f); setShowAll(false);}}
                      style={[s.chip, on && s.selectedChip]}>
                      {f !== 'All' ? <View style={[s.chipDot, {backgroundColor: statusColor(c, f)}]} /> : null}
                      <Text style={[s.chipText, on && s.selectedChipText]}>{f}</Text>
                      <Text style={[s.chipCount, on && s.selectedChipText]}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {projects.length === 0 ? (
            <View style={s.stateBox}>
              <Text style={s.stateTitle}>No projects assigned yet</Text>
              <Text style={s.stateText}>When an admin assigns you to a project, it will show here and you can start inspecting.</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.stateBox}>
              <Text style={s.stateTitle}>No matching projects</Text>
              <Text style={s.stateText}>Try another search or status.</Text>
              <TouchableOpacity style={s.ghostBtn} onPress={() => {setQuery(''); setStatusFilter('All');}}>
                <Text style={s.ghostBtnText}>Clear filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={[s.cardGrid, isWide && s.cardGridWide]}>
                {shown.map(project => {
                  const status = projectStatus(project);
                  const sc = statusColor(c, status);
                  const areas = Number(project.areaCount) || 0;
                  return (
                    <TouchableOpacity
                      key={project.projectId}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${project.projectName}${project.isTransferred ? ' · Transferred' : ''}`}
                      onPress={() => onProjectPress(project.projectId)}
                      activeOpacity={0.75}
                      style={[s.projectCard, isWide && s.cardWide, web({cursor: 'pointer'})]}>
                      <ProjectCompanyLogo projectId={project.projectId} version={project} style={s.thumbnail} />
                      <View style={{flex: 1, minWidth: 0}}>
                        <Text style={s.projectName} numberOfLines={2}>{projectDisplay(project.projectName)}{project.isTransferred ? ' · Transferred' : ''}</Text>
                        <Text style={s.projectLoc} numberOfLines={1}>
                          {[projectDisplay(project.location), projectDisplay(project.vesselOrSiteName)].filter(Boolean).join('  •  ') || 'Location not set'}
                        </Text>
                        <Text style={s.projectLoc}>Report: {project.reportStatus || 'Ongoing'}</Text>
                        {!!project.schedule && <Text style={[s.projectLoc, {color: project.schedule.status === 'Overdue' ? c.critical : project.schedule.status === 'Delay Expected' ? c.amber : project.schedule.status === 'On Track' ? c.success : c.secondary}]}>{project.schedule.status}{project.schedule.delayDays > 0 ? ` · ${project.schedule.delayDays} calendar days` : ''}</Text>}
                        <View style={s.badgeRow}>
                          <View style={[s.badge, {backgroundColor: tint(sc, '26')}]}>
                            <Text style={[s.badgeText, {color: sc}]}>{status.toUpperCase()}</Text>
                          </View>
                          {project.jobNo ? (
                            <View style={[s.badge, {backgroundColor: c.elevated}]}>
                              <Text style={[s.badgeText, {color: c.secondary}]}>{projectDisplay(project.jobNo)}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      <View style={s.projectRight}>
                        <Text style={s.areaCount}>{areas}</Text>
                        <Text style={s.areaLabel}>{areas === 1 ? 'AREA' : 'AREAS'}</Text>
                      </View>
                      <Text style={s.chevron}>›</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {filtered.length > VISIBLE_PROJECTS ? (
                <TouchableOpacity style={s.showMore} onPress={() => setShowAll(v => !v)}>
                  <Text style={s.link}>{showAll ? 'Show fewer' : `View all (${filtered.length}) ›`}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const formatReviewedDate = (value?: string | null) => {
  if (!value) return 'Review date not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Review date not set' : `Reviewed ${date.toLocaleDateString()}`;
};

function makeStyles(c: Colors) {
  const radius = 16;
  return StyleSheet.create({
    screen: {flex: 1, backgroundColor: c.bg},
    content: {padding: 14, paddingBottom: 32, width: '100%', alignSelf: 'stretch', gap: 14},
    contentWide: {paddingHorizontal: 22},
    hero: {minHeight: 165, padding: 22, borderRadius: 18, borderWidth: 1, borderColor: '#137E98',
      backgroundColor: '#03192C', overflow: 'hidden', justifyContent: 'center', gap: 6},
    heroPhoto: {position: 'absolute', width: '83%', height: '100%', right: 0},
    heroKicker: {color: '#00D9EE', fontFamily: visual.mono, fontSize: 11, fontWeight: '800', letterSpacing: 2},
    heroTitle: {...typography.page, color: '#F5FAFF', fontStyle: 'italic', },
    heroAccent: {color: '#00D9EE'},
    heroDescription: {color: '#F5FAFF', fontSize: 14, lineHeight: 21, maxWidth: 490},
    panel: {padding: 16, gap: 10, borderWidth: 1, borderColor: c.border, borderRadius: radius, backgroundColor: c.card, minWidth: 0},
    sectionIcon: {color: c.cyan, fontSize: 22},
    draftRow: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: 10,
      borderWidth: 1, borderColor: c.border, borderRadius: 13, backgroundColor: c.elevated},
    draftDetails: {flexDirection: 'row', flexGrow: 1, flexShrink: 1, flexBasis: 350, minWidth: 0, alignItems: 'center', gap: 14},
    flexText: {flex: 1, minWidth: 0},
    thumbnail: {width: 72, height: 62, borderRadius: 9},
    feedbackSummary: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12},
    kpiGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
    kpiCard: {flexGrow: 1, flexBasis: '46%', flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 14, minHeight: 104, ...web({boxShadow: c.shadow})},
    kpiCardWide: {flexGrow: 1, flexShrink: 1, flexBasis: 220},
    // phone: stack the icon above the text so labels and footers get the full card width
    kpiCardNarrow: {flexDirection: 'column', alignItems: 'flex-start', gap: 10, minWidth: 0},
    iconBox: {width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
    iconGlyph: {fontSize: 24},
    kpiBody: {alignSelf: 'stretch', flexShrink: 1, minWidth: 0},
    kpiLabel: {color: c.text, fontSize: 13, fontWeight: '700'},
    kpiValue: {...typography.kpi, color: c.text, marginTop: 2},
    kpiFoot: {color: c.secondary, fontSize: 12, marginTop: 2},

    cardGrid: {gap: 12},
    cardGridWide: {flexDirection: 'row', flexWrap: 'wrap'},
    cardWide: {flexGrow: 1, flexShrink: 1, flexBasis: 375},
    projectCard: {flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 12, ...web({boxShadow: c.shadow})},
    feedbackCard: {alignItems: 'flex-start', borderLeftWidth: 3, borderLeftColor: c.critical},
    projectLoc: {color: c.secondary, fontSize: 13, lineHeight: 19, marginTop: 4},
    badgeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10},
    badge: {borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4},
    badgeText: {...typography.badge, },
    projectRight: {alignItems: 'flex-end'},
    areaCount: {color: c.text, fontSize: 22, fontWeight: '900'},
    areaLabel: {color: c.muted, fontSize: 9.5, fontWeight: '800', letterSpacing: 1},

    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.cyan,
      borderRadius: 22,
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 18,
      ...web({cursor: 'pointer', boxShadow: '0 0 16px #00D9EE38'}),
    },
    primaryBtnText: {color: c.bg === LIGHT.bg ? '#FFFFFF' : '#03192C', fontSize: 14, fontWeight: '800'},
    ghostBtn: {marginTop: 16, borderWidth: 1, borderColor: c.borderActive, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9},
    ghostBtnText: {color: c.text, fontSize: 13, fontWeight: '700'},

    loadingBox: {alignItems: 'center', paddingVertical: 60, gap: 12},
    loadingText: {color: c.muted, fontSize: 13, fontWeight: '600'},

    // metrics band
    band: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius,
      overflow: 'hidden',
      marginBottom: 30,
      ...web({boxShadow: c.shadow}),
    },
    hazard: {height: 5, backgroundColor: c.amber},
    bandRow: {flexDirection: 'row', flexWrap: 'wrap'},
    metric: {paddingHorizontal: 18, paddingVertical: 18},
    metricWide: {flex: 1, minWidth: 0, paddingHorizontal: 24, paddingVertical: 22},
    metricNarrow: {width: '50%'},
    dividerLeft: {borderLeftWidth: 1, borderLeftColor: c.border},
    dividerBottom: {borderBottomWidth: 1, borderBottomColor: c.border},
    metricLabel: {...typography.label, color: c.secondary, },
    metricValue: {...typography.kpi, color: c.text, marginTop: 6, },
    metricFoot: {color: c.muted, fontSize: 12, lineHeight: 16, marginTop: 6},
    track: {flexDirection: 'row', height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: c.elevated, marginTop: 10, gap: 2},

    // sections
    sectionHeading: {flexDirection: 'row', alignItems: 'flex-end', gap: 12},
    sectionTitle: {...typography.section, color: c.text, },
    sectionHint: {color: c.muted, fontSize: 12.5, fontWeight: '600', marginTop: 3},
    clearNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.elevated,
      flexGrow: 1,
      flexBasis: 360,
    },
    clearNoteText: {flex: 1, color: c.secondary, fontSize: 13},

    // toolbar
    toolbar: {gap: 10},
    toolbarWide: {flexDirection: 'row', alignItems: 'center', gap: 14},
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 40,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    searchIcon: {color: c.muted, fontSize: 17, marginTop: -2},
    searchInput: {flex: 1, color: c.text, fontSize: 13.5, paddingVertical: 0},
    searchClear: {color: c.muted, fontSize: 12, fontWeight: '800'},
    chips: {gap: 8, paddingRight: 8},
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 34,
      paddingHorizontal: 12,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      ...web({cursor: 'pointer'}),
    },
    chipDot: {width: 7, height: 7, borderRadius: 4},
    selectedChip: {backgroundColor: c.cyan, borderColor: c.cyan},
    selectedChipText: {color: c.bg === LIGHT.bg ? '#FFFFFF' : '#03192C'},
    chipText: {color: c.text, fontSize: 12.5, fontWeight: '700'},
    chipCount: {color: c.muted, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums']},

    // lists
    list: {backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: radius, overflow: 'hidden', ...web({boxShadow: c.shadow})},
    tableHead: {flexDirection: 'row', alignItems: 'center', gap: 16, paddingLeft: 24, paddingRight: 16, paddingVertical: 11, backgroundColor: c.elevated},
    th: {color: c.secondary, fontSize: 12, fontWeight: '700'},
    row: {flexDirection: 'row', alignItems: 'center', gap: 16, paddingLeft: 24, paddingRight: 16, paddingVertical: 15, minHeight: 68},
    feedbackRow: {alignItems: 'flex-start', paddingVertical: 16},
    rowDivider: {borderTopWidth: 1, borderTopColor: c.border},
    rail: {position: 'absolute', left: 0, top: 14, bottom: 14, width: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3},
    projectName: {...typography.card, color: c.text, flexShrink: 1},
    projectMeta: {color: c.secondary, fontSize: 12.5, marginTop: 3},
    seq: {color: c.muted, fontWeight: '600'},
    feedbackTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
    comment: {color: c.text, fontSize: 13.5, lineHeight: 20, marginTop: 10},
    feedbackFoot: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12},
    footDate: {color: c.muted, fontSize: 12},
    rowTags: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 9},
    tag: {color: c.secondary, fontSize: 11.5, fontWeight: '600', backgroundColor: c.elevated, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden'},
    pill: {flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4},
    pillText: {fontSize: 12, fontWeight: '700'},
    td: {color: c.secondary, fontSize: 13},
    mono: {fontVariant: ['tabular-nums'], color: c.text, fontWeight: '600'},
    colStatus: {width: 130},
    colLocation: {width: 150},
    colJob: {width: 120},
    colAreas: {width: 54, textAlign: 'right'},
    colChevron: {width: 16},
    areas: {color: c.text, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums']},
    areasNarrow: {alignItems: 'flex-end'},
    areasLabel: {color: c.muted, fontSize: 11, fontWeight: '600'},
    chevron: {color: c.muted, fontSize: 24},
    showMore: {alignItems: 'center', paddingVertical: 14},
    link: {color: c.cyan, fontSize: 13, fontWeight: '800'},

    stateBox: {minHeight: 220, backgroundColor: c.card, borderRadius: radius, alignItems: 'center', justifyContent: 'center', padding: 32, borderWidth: 1, borderColor: c.border, borderStyle: 'dashed'},
    stateTitle: {color: c.text, fontSize: 17, fontWeight: '800'},
    stateText: {color: c.secondary, fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 18, textAlign: 'center', maxWidth: 380},
  });
}
