import {onProjectChanged} from '../api/projectChanges';
import {typography} from '../theme/typography';
import {visual} from '../theme/visual';
import {OPERATIONS_DARK} from '../theme/operationsPalette';
import {ClientLogoFile} from '../components/clientLogo';
import DeleteProjectButton from '../components/DeleteProjectButton';
import DefectsModal from '../components/DefectsModal';
import {DefectSummary, getDefects} from '../api/defects';
import {HazardousAreaPlanFile} from '../components/hazardousAreaPlan';
import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import NewProjectModal from '../components/NewProjectModal';
import {projectDisplay} from '../utils/projectDisplay';

const ARIES_LOGO = require('../assets/aries-logo.png');
const OFFSHORE_HERO = require('../assets/landing/industry-3.jpg');
import ProjectDetailModal from '../components/ProjectDetailModal';
import ProgressRing from '../components/ProgressRing';
import {useThemeMode} from '../theme/useThemeMode';
import {Colors, DARK, LIGHT, tint} from '../theme/palette';
import {getProjects, createProject, addProjectArea, updateProject, normalizeProjectStatus, projectStatusLabel, ProjectSummary} from '../api/projects';
import {EquipmentRow, inspectionKey, loadAllEquipment} from '../api/adminEquipment';
import {getApiErrorMessage} from '../api/errors';

const web = (style: object) => Platform.select({web: style, default: {}}) as object;

type StatusLabel = 'Pending' | 'Active' | 'In Progress' | 'Completed' | 'On Hold';

const statusColor = (c: Colors, status: StatusLabel) =>
  ({
    Pending: c.yellow,
    Active: c.indigo,
    'In Progress': c.cyan,
    Completed: c.success,
    'On Hold': c.critical,
  })[status];

type UserOption = {id: string; displayName: string; email?: string; managerId?: string | null; managerName?: string | null};

type Props = {
  userName: string;
  workspace?: boolean;
  onViewProjects?: () => void;
  onEditProject?: (projectId: string) => void;
  onOpenProject?: (projectId: string) => void;
  onReports?: () => void;
  /** Role shown in the badge under the name (e.g. Admin / Manager). */
  userRole?: string;
  surveyors?: UserOption[];
  qcUsers?: UserOption[];
  clients?: UserOption[];
  /** Brand header (Aries logo + slogan). Off by default: sidebar / native shell already show one. */
  showBrand?: boolean;
  /** Optional element at the right of the profile row (e.g. the notification bell). */
  accessory?: React.ReactNode;
  /** Menu (hamburger) button shown at the left of the brand header; opens the navigation drawer. */
  menuButton?: React.ReactNode;
};

const VISIBLE_SITES = 6;
const scheduleFilters = ['All Projects', 'On Track', 'Delay Expected', 'Overdue', 'Completed'] as const;
type ScheduleFilter = typeof scheduleFilters[number];

export default function DashboardScreen({
  userName,
  workspace = false,
  onViewProjects,
  onEditProject,
  onOpenProject,
  onReports,
  userRole = 'Admin',
  surveyors = [],
  qcUsers = [],
  clients = [],
  showBrand = false,
  accessory,
  menuButton,
}: Props) {
  const mode = useThemeMode();
  const c = mode === 'dark' ? (workspace ? OPERATIONS_DARK : DARK) : LIGHT;
  const s = useMemo(() => makeStyles(c), [c]);

  const {width} = useWindowDimensions();
  const isWide = width >= 900;
  const tableLayout = workspace;
  const [showNewProject, setShowNewProject] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectError, setProjectError] = useState('');
  const [quickAction, setQuickAction] = useState<'area' | 'layout' | null>(null);
  const [equipment, setEquipment] = useState<EquipmentRow[] | null>(null);
  const [editProject, setEditProject] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [savingProject, setSavingProject] = useState(false);
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>('All Projects');
  const [showAll, setShowAll] = useState(false);
  const [showDefects, setShowDefects] = useState(false);
  const [defectSummary, setDefectSummary] = useState<DefectSummary | null>(null);
  const [defectError, setDefectError] = useState('');
  const loadDefects = useCallback(async () => {
    try {const response = await getDefects(); setDefectSummary(response.data.summary); setDefectError('');}
    catch (err) {setDefectError(getApiErrorMessage(err, 'Could not load defects'));}
  }, []);

  const loadProjects = useCallback(async (isRefresh = false) => {
    void loadDefects();
    isRefresh ? setRefreshing(true) : setLoadingProjects(true);
    try {
      const res = await getProjects();
      setProjects(res.data);
      setProjectError('');
      setLoadingProjects(false);
      // Equipment totals need each project's details; load them after the list is on screen.
      loadAllEquipment(res.data)
        .then(setEquipment)
        .catch(() => setEquipment([]));
    } catch (err: any) {
      setProjectError(getApiErrorMessage(err, 'Could not load projects'));
    } finally {
      setLoadingProjects(false);
      setRefreshing(false);
    }
  }, [loadDefects]);

  useEffect(() => onProjectChanged(() => {void loadProjects(true);}), [loadProjects]);
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // The API sends 'InProgress' / 'OnHold'; normalise to the display label
  // ('In Progress' / 'On Hold') so counts, badges and colours all agree.
  const statusOf = (p: any) =>
    projectStatusLabel(normalizeProjectStatus(p.status ?? p.projectStatus)) as StatusLabel;

  const surveyorName = (id?: string) => surveyors.find(u => u.id === id)?.displayName;

  const activeSurveys = projects.filter(p => ['Active', 'In Progress'].includes(statusOf(p))).length;
  const equipmentTotal = equipment?.length ?? 0;
  // "Verified" = inspection finished by the surveyor (Completed) or already signed off by QC (QcApproved).
  const verified =
    equipment?.filter(e => ['completed', 'pendingqcreview', 'qcapproved'].includes(inspectionKey(e.inspectionStatus))).length ?? 0;
  const pendingQc = equipment?.filter(e => ['completed', 'pendingqcreview'].includes(inspectionKey(e.inspectionStatus))).length ?? 0;
  const verifiedPct = equipmentTotal ? Math.round((verified / equipmentTotal) * 100) : 0;

  const sorted = useMemo(
    () => projects.filter(p => scheduleFilter === 'All Projects' || p.schedule?.status === scheduleFilter)
      .sort((x, y) => (y.createdAt || '').localeCompare(x.createdAt || '')),
    [projects, scheduleFilter],
  );
  const visible = showAll ? sorted : sorted.slice(0, VISIBLE_SITES);
  const openProject = (project: ProjectSummary) => {
    if (onOpenProject) onOpenProject(project.id);
    else setSelectedProject(project);
  };
  const progressByProject = useMemo(() => {
    const counts = new Map<string, {total: number; checked: number}>();
    for (const item of equipment ?? []) {
      const count = counts.get(item.projectId) ?? {total: 0, checked: 0};
      count.total++;
      if (['completed', 'pendingqcreview', 'qcapproved'].includes(inspectionKey(item.inspectionStatus))) count.checked++;
      counts.set(item.projectId, count);
    }
    return new Map([...counts].map(([id, count]) => [id, Math.round(count.checked / count.total * 100)]));
  }, [equipment]);
  const updates = useMemo(() => projects.flatMap(project => {
    const created = Date.parse(project.createdAt);
    const updated = Date.parse(project.updatedAt);
    return [
      ...(Number.isFinite(created) ? [{project, date: created, label: 'Project created'}] : []),
      ...(Number.isFinite(updated) && (!Number.isFinite(created) || updated > created)
        ? [{project, date: updated, label: 'Project updated'}] : []),
    ];
  }).sort((a, b) => b.date - a.date).slice(0, 3), [projects]);

  const handleCreate = async (data: {
  projectName: string;
  jobNumber: string;
  targetDate: string;
  location: string;
  vesselName: string;
  surveyorId: string;
  qcId: string;
  clientId: string;
  clientIds?: string[];
  ourCompanyId?: string | null;
  clientLogo?: ClientLogoFile | null;
  uidNumber?: string; documentNumber?: string; revision?: string; description?: string; clientName?: string;
  hazardousAreaPlan?: HazardousAreaPlanFile | null;
  areas: {name: string; file: any; fileName: string}[];
}) => {
  setCreating(true);
  try {
    const res = await createProject({
      projectName: data.projectName,
      jobNo: data.jobNumber,
      targetDate: data.targetDate,
      location: data.location,
      vesselOrSiteName: data.vesselName,
      assignedSurveyorId: data.surveyorId,
      assignedQcId: data.qcId,
      assignedClientId: data.clientId, assignedClientIds: data.clientIds,
      hazardousAreaPlan: data.hazardousAreaPlan,
      ourCompanyId: data.ourCompanyId,
      description: data.description, clientName: data.clientName, clientLogo: data.clientLogo,
    });

    const projectId = res.data.id;
    const failedAreas: string[] = [];

    for (const area of data.areas) {
      try {
        await addProjectArea(projectId, area.name, area.file);
      } catch (err) {
        console.error('Failed to add area', area.name, err);
        failedAreas.push(`${area.name}: ${getApiErrorMessage(err, 'image upload failed')}`);
      }
    }

    if (failedAreas.length > 0) {
      Alert.alert(
        'Project created',
        `Project was created, but these areas could not be saved with their images:\n${failedAreas.join('\n')}`,
      );
    }

    setShowNewProject(false);
    await loadProjects();
  } catch (err: any) {
    const message = getApiErrorMessage(err, 'Could not create project');
    if (Platform.OS === 'web') (globalThis as any).alert(message);
    else Alert.alert('Error', message);
  } finally {
    setCreating(false);
  }
};

  const handleSaveProject = async (data: {
    projectName: string;
    jobNo: string;
    location: string;
    vesselOrSiteName: string;
    assignedSurveyorId: string;
    assignedQcId: string;
    assignedClientId?: string | null;
    status: string;
  }) => {
    if (!selectedProject) return;
    const projectId = selectedProject.id || selectedProject.projectId;
    setSavingProject(true);
    try {
      await updateProject(projectId, data);
      setEditProject(false);
      setSelectedProject(null);
      await loadProjects();
    } catch (err: any) {
      const message = getApiErrorMessage(err, 'Could not save project changes');
      if (Platform.OS === 'web') (globalThis as any).alert(message);
      else Alert.alert('Error', message);
    } finally {
      setSavingProject(false);
    }
  };

  if (showNewProject) return (
      <NewProjectModal
        visible={showNewProject}
        onClose={() => setShowNewProject(false)}
        surveyors={surveyors}
        qcUsers={qcUsers}
        clients={clients}
        loading={creating}
        onCreate={handleCreate}
      />
  );

  if (selectedProject && editProject) return <ProjectDetailModal fullPage
        userRole={userRole}
        onDeleted={loadProjects}
        visible={!!selectedProject}
        project={selectedProject}
        onClose={() => {setEditProject(false); setSelectedProject(null);}}
        onSave={handleSaveProject}
        onAreasChanged={() => loadProjects()}
        surveyors={surveyors}
        qcUsers={qcUsers}
        clients={clients}
        loading={savingProject}
      />;

  return (
    <ScrollView
      nativeID={workspace ? 'ex-operations' : undefined}
      style={s.screen}
      contentContainerStyle={[s.content, isWide && s.contentWide, workspace && s.operationsContent]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProjects(true)} />}>
      {showBrand ? (
        <View style={s.brandRow}>
          {/* left slot (menu) and right spacer share a width so the brand stays centred */}
          <View style={s.brandSide}>{menuButton}</View>
          <View style={s.brandCenter}>
            <View style={s.logoBadge}>
              <Image source={ARIES_LOGO} style={s.logoImage} resizeMode="contain" accessibilityLabel="Aries logo" />
            </View>
            <Text style={s.brandTitle} numberOfLines={1}>Ex-Survey</Text>
          </View>
          <View style={[s.brandSide, {alignItems: 'flex-end'}]}>{accessory}</View>
        </View>
      ) : null}

      {accessory && !showBrand ? (
        <View style={s.profileRow}>
          <View style={{flex: 1}} />
          {accessory}
        </View>
      ) : null}

      {workspace && <View nativeID="ex-operations-hero" style={s.workspaceHeading}>
        <Image source={OFFSHORE_HERO} style={s.heroPhoto} resizeMode="cover" />
        <View nativeID="ex-operations-hero-overlay" pointerEvents="none" style={StyleSheet.absoluteFill} />
        <View style={s.heroCopy}>
          <Text style={s.heroKicker}>OPERATIONS DESK</Text>
          <Text accessibilityRole="header" style={s.heroTitle}>Site <Text style={s.heroKickerColor}>Operations</Text></Text>
          <Text style={s.heroDescription}>Overview of surveys, inspections and quality control.</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" onPress={() => setShowNewProject(true)} style={s.workspaceNew}>
          <Text style={s.workspaceNewText}>＋ New Project</Text>
        </TouchableOpacity>
      </View>}
      {loadingProjects ? (
        <ActivityIndicator color={c.amber} style={{marginVertical: 40}} />
      ) : (
        <>
          <View nativeID={workspace ? 'ex-operations-kpis' : undefined} style={s.kpiGrid}>
            <View style={[s.kpiCard, isWide && s.kpiCardWide, workspace && s.workspaceKpi, workspace && {borderColor: tint(c.cyan, '80')}]}>
              <View style={[s.iconBox, workspace && {position: 'absolute', right: 17, top: 17, width: 36, height: 36, borderRadius: 8}, {backgroundColor: tint(c.cyan, '1F')}]}>
                <Text style={[s.iconGlyph, {color: c.cyan}]}>▤</Text>
              </View>
              <View style={s.kpiBody}>
                <Text style={s.kpiLabel}>Active Surveys</Text>
                <Text style={s.kpiValue}>{activeSurveys}</Text>
                <Text style={s.kpiFoot}>In progress</Text>
              </View>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="View flagged defects"
              onPress={() => setShowDefects(true)}
              style={[
                s.kpiCard,
                isWide && s.kpiCardWide, workspace && s.workspaceKpi,
                workspace && {borderColor: tint(c.critical, '80')},
                !workspace && {backgroundColor: tint(c.critical, '14'), borderColor: tint(c.critical, '44')},
              ]}>
              <View style={[s.iconBox, workspace && {position: 'absolute', right: 17, top: 17, width: 36, height: 36, borderRadius: 8}, {backgroundColor: tint(c.critical, '24')}]}>
                <Text style={[s.iconGlyph, {color: c.critical}]}>⚠</Text>
              </View>
              <View style={s.kpiBody}>
                <Text style={s.kpiLabel}>Defects Flagged</Text>
                <Text style={s.kpiValue}>{defectError ? '—' : defectSummary ? defectSummary.openCount : '…'}{!defectError && !!defectSummary?.openCount && <Text style={s.kpiValueSub}> Open</Text>}</Text>
                <Text style={s.kpiFoot}>{defectError ? 'Unable to load · Tap to retry' : !defectSummary ? 'Loading defects' : !defectSummary.openCount ? 'No open defects' : `${defectSummary.high} High · ${defectSummary.medium} Medium · ${defectSummary.low} Low${defectSummary.unspecified ? ` · ${defectSummary.unspecified} Unspecified` : ''}`}</Text>
              </View>
            </TouchableOpacity>

            <View style={[s.kpiCard, isWide && s.kpiCardWide, workspace && s.workspaceKpi, workspace && {borderColor: tint(c.success, '80')}]}>
              {workspace ? <View style={[s.iconBox, workspace && {position: 'absolute', right: 17, top: 17, width: 36, height: 36, borderRadius: 8}, {backgroundColor: tint(c.success, '1F')}]}><Text style={[s.iconGlyph, {color: c.success}]}>◇</Text></View> : <ProgressRing
                pct={verifiedPct}
                color={c.success}
                track={c.elevated}
                textColor={c.text}
                label={equipment ? undefined : '…'}
              />}
              <View style={s.kpiBody}>
                <Text style={s.kpiLabel}>Equipment Verified</Text>
                <Text style={s.kpiValue}>
                  {equipment ? verified : '–'}
                  <Text style={s.kpiValueSub}> / {equipment ? equipmentTotal : '–'}</Text>
                </Text>
                {workspace && <View style={s.progressTrack}><View style={[s.progressFill, {width: `${verifiedPct}%`, backgroundColor: c.success}]} /></View>}
                <Text style={s.kpiFoot}>{workspace && equipment ? `${verifiedPct}% checked` : 'Items checked'}</Text>
              </View>
            </View>

            <View style={[s.kpiCard, isWide && s.kpiCardWide, workspace && s.workspaceKpi, workspace && {borderColor: tint(c.amber, '80')}]}>
              <View style={[s.iconBox, workspace && {position: 'absolute', right: 17, top: 17, width: 36, height: 36, borderRadius: 8}, {backgroundColor: tint(c.amber, '22')}]}>
                <Text style={[s.iconGlyph, {color: c.amber}]}>◷</Text>
              </View>
              <View style={s.kpiBody}>
                <Text style={s.kpiLabel}>Pending QC</Text>
                <Text style={s.kpiValue}>{equipment ? pendingQc : '–'}</Text>
                <Text style={s.kpiFoot}>Awaiting review</Text>
              </View>
            </View>
          </View>

          {!workspace && <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setShowNewProject(true)}
            style={[s.newBtn, isWide && {alignSelf: 'flex-start'}]}>
            <Text style={s.newBtnText}>+ New project</Text>
          </TouchableOpacity>}

          {workspace && <View style={s.overviewRail}>
            <View style={s.overviewCard}>
              <Text accessibilityRole="header" style={s.sectionTitle}>Equipment Verification</Text>
              <View style={s.verificationBody}>
                <ProgressRing pct={verifiedPct} color={c.cyan} track={c.elevated} textColor={c.text}
                  size={100} label={equipment ? undefined : '…'} />
                <Text style={[s.sectionHint, {flex: 1}]}>{equipment ? `${verified} of ${equipmentTotal} equipment records verified` : 'Loading equipment verification…'}</Text>
              </View>
            </View>
            <View style={s.overviewCard}>
              <Text accessibilityRole="header" style={s.sectionTitle}>Project Progress</Text>
              <Text style={s.sectionHint}>Current verification by project</Text>
              {!equipment ? <Text style={s.sectionHint}>Loading project progress…</Text> : projects.length === 0 ? (
                <Text style={s.sectionHint}>Project progress will appear here.</Text>
              ) : projects.slice(0, 3).map(project => {
                const progress = progressByProject.get(project.id) ?? 0;
                return <View key={project.id}>
                  <View style={s.activityRow}>
                    <Text numberOfLines={1} style={s.activityName}>{projectDisplay(project.projectName)}</Text>
                    <Text style={s.sectionHint}>{progress}%</Text>
                  </View>
                  <View accessibilityRole="progressbar" accessibilityLabel={project.projectName}
                    accessibilityValue={{min: 0, max: 100, now: progress}} style={s.progressTrack}>
                    <View style={[s.progressFill, {width: `${progress}%`}]} />
                  </View>
                </View>;
              })}
            </View>
            <View style={s.overviewCard}>
              <Text accessibilityRole="header" style={s.sectionTitle}>Quick Actions</Text>
              <View style={s.quickTiles}>
                {[
                  {label: 'Create Project', icon: '⊕', run: () => setShowNewProject(true)},
                  {label: 'Add Area', icon: '▱', run: onEditProject && projects.length ? () => setQuickAction('area') : undefined},
                  {label: 'Upload Layout', icon: '↑', run: onOpenProject && projects.length ? () => setQuickAction('layout') : undefined},
                  {label: 'Generate Report', icon: '▤', run: onReports},
                ].map(action => <TouchableOpacity key={action.label} accessibilityRole="button"
                  accessibilityState={{disabled: !action.run}} disabled={!action.run} onPress={action.run}
                  style={[s.quickTile, !action.run && {opacity: .5}]}>
                  <Text style={s.quickIcon}>{action.icon}</Text>
                  <Text style={s.quickLabel}>{action.label}</Text>
                </TouchableOpacity>)}
              </View>
              {quickAction && <>
                <View style={s.activityRow}>
                  <Text style={s.activityName}>{quickAction === 'area' ? 'Choose a project to add an area' : 'Choose a project to upload a layout'}</Text>
                  <TouchableOpacity accessibilityRole="button" onPress={() => setQuickAction(null)}><Text style={s.link}>Cancel</Text></TouchableOpacity>
                </View>
                <ScrollView nestedScrollEnabled style={{maxHeight: 160}}>
                  {projects.map(project => <TouchableOpacity key={project.id} accessibilityRole="button"
                    style={s.activityRow} onPress={() => {
                      if (quickAction === 'area') onEditProject?.(project.id);
                      else openProject(project);
                      setQuickAction(null);
                    }}>
                    <Text style={s.activityName}>{projectDisplay(project.projectName)}</Text>
                    <Text style={s.sectionHint}>›</Text>
                  </TouchableOpacity>)}
                </ScrollView>
              </>}
            </View>
          </View>}

          <View nativeID={workspace ? 'ex-operations-bottom' : undefined}>
          <View nativeID={workspace ? "ex-operations-sites-panel" : undefined} style={workspace && s.tablePanel}>
          <View style={[s.sectionHeading, workspace && s.tableHeading]}>
            <View>
              <Text accessibilityRole="header" style={s.sectionTitle}>Active Site Operations</Text>
              <Text style={s.sectionHint}>{sorted.length} projects</Text>
            </View>
            {workspace && onViewProjects && <TouchableOpacity accessibilityRole="button" onPress={onViewProjects}><Text style={[s.link, {color: c.cyan}]}>View all</Text></TouchableOpacity>}
          </View>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12}}>
            {scheduleFilters.map(filter => <TouchableOpacity key={filter} accessibilityRole="button"
              accessibilityState={{selected: scheduleFilter === filter}} onPress={() => {setScheduleFilter(filter); setShowAll(false);}}
              style={[s.badge, {padding: 8, backgroundColor: scheduleFilter === filter ? c.indigo : c.elevated}]}>
              <Text style={[s.badgeText, {color: scheduleFilter === filter ? c.onAmber : c.text}]}>{filter}</Text>
            </TouchableOpacity>)}
          </View>
          <View nativeID={workspace ? 'ex-operations-table-scroll' : undefined} accessibilityLabel="Active site projects" {...(workspace ? {tabIndex: 0} as any : {})}>
          <View>
          {tableLayout && sorted.length > 0 && !projectError && <View style={s.tableHeader}>
            {['Project', 'Status', 'Job number', 'Progress', 'Areas'].map((label, index) => <Text key={label} style={[s.columnLabel, {flex: [3, 1.5, 1.5, 2, .65][index]}]}>{label}</Text>)}
          </View>}

          {projectError ? <View style={s.stateBox}>
            <Text style={s.stateText}>{projectError}</Text>
            <TouchableOpacity accessibilityRole="button" style={s.retryButton} onPress={() => loadProjects()}>
              <Text style={s.retryText}>Retry</Text>
            </TouchableOpacity>
          </View> : projects.length === 0 ? (
            <View style={s.stateBox}>
              <Text style={s.stateTitle}>No projects yet</Text>
              <Text style={s.stateText}>Projects you create or are assigned to will appear here.</Text>
              <TouchableOpacity style={s.retryButton} onPress={() => setShowNewProject(true)}>
                <Text style={s.retryText}>+ Create your first project</Text>
              </TouchableOpacity>
            </View>
          ) : sorted.length === 0 ? <Text style={[s.stateText, {padding: 16}]}>No projects match this schedule filter.</Text> : (
            <View style={tableLayout ? undefined : isWide ? {flexDirection: 'row', flexWrap: 'wrap', gap: 12} : {gap: 12}}>
              {visible.map(project => {
                const status = statusOf(project);
                const lead = surveyorName(project.assignedSurveyorId);
                const schedule = project.schedule;
                const overdue = status !== 'Completed' && schedule?.status === 'Overdue';
                const warning = status !== 'Completed' && (overdue || schedule?.status === 'Delay Expected');
                const scheduleLabel = warning && schedule ? <View style={{marginTop: 4, gap: 3}}>
                  <Text style={{fontWeight: '700', color: overdue ? c.critical : c.amber}}>
                    {schedule.status} · {schedule.delayDays} {schedule.delayDays === 1 ? 'day' : 'days'}
                  </Text>
                  {!!schedule.latestDelayReason && <Text style={s.projectLoc} numberOfLines={2}>{schedule.latestDelayReason}</Text>}
                </View> : null;
                const sc = warning ? (overdue ? c.critical : c.amber) : statusColor(c, status);
                const highlight = warning ? {backgroundColor: tint(sc, '15'), borderLeftWidth: 3, borderLeftColor: sc} : undefined;
                if (tableLayout) {
                  const progress = progressByProject.get(project.id) ?? 0;
                  return <TouchableOpacity key={project.id} accessibilityRole="button" onPress={() => openProject(project)} style={[s.tableRow, highlight]}>
                    <View style={{flex: 3, minWidth: 0}}><Text style={s.projectName}>{projectDisplay(project.projectName)}</Text><Text style={s.projectLoc}>Report: {project.reportStatus || 'Ongoing'}</Text><Text style={s.projectLoc}>{[projectDisplay(project.location), lead].filter(Boolean).join(' · ') || 'Location not set'}</Text>{scheduleLabel}</View>
                    <View style={{flex: 1.5}}><View style={[s.badge, {alignSelf: 'flex-start', backgroundColor: tint(sc, '19')}]}><Text style={[s.badgeText, {color: sc}]}>• {status}</Text></View></View>
                    <Text style={[s.projectLoc, {flex: 1.5, marginTop: 0}]}>{projectDisplay(project.jobNo) || '—'}</Text>
                    <View style={{flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10}}><View style={[s.progressTrack, {flex: 1, marginTop: 0}]}><View style={[s.progressFill, {width: `${progress}%`}]} /></View><Text style={s.sectionHint}>{equipment ? `${progress}%` : '—'}</Text></View>
                    <Text style={[s.projectName, {flex: .65, textAlign: 'right'}]}>{Number(project.areaCount) || 0}  ›</Text>
                  </TouchableOpacity>;
                }
                return (
                  <TouchableOpacity
                    key={project.id}
                    accessibilityRole="button"
                    onPress={() => openProject(project)}
                    activeOpacity={0.75}
                    style={[s.projectCard, highlight, isWide && {flexGrow: 1, flexShrink: 1, flexBasis: 460}]}>
                    <View style={{flex: 1, minWidth: 0}}>
                    
                      <Text style={s.projectName} numberOfLines={2}>
                        {projectDisplay(project.projectName)}
                      </Text>
                      <Text style={s.projectLoc} numberOfLines={1}>
                        {[projectDisplay(project.location), lead ? `Lead: ${lead}` : null].filter(Boolean).join('  •  ') ||
                          'Location not set'}
                      </Text>
                      <Text style={s.projectLoc}>Report: {project.reportStatus || 'Ongoing'}</Text>
                      {scheduleLabel}
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
                      <Text style={s.areaCount}>{Number(project.areaCount) || 0}</Text>
                      <Text style={s.areaLabel}>{Number(project.areaCount) === 1 ? 'AREA' : 'AREAS'}</Text>
                    </View>
                    <Text style={s.chevron}>›</Text>
                  </TouchableOpacity>
                );
              })}
              {sorted.length > VISIBLE_SITES ? (
                <TouchableOpacity style={s.showMore} onPress={() => setShowAll(v => !v)}>
                  <Text style={s.link}>{showAll ? 'Show fewer' : `View all (${sorted.length}) ›`}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
          </View>
          </View>
          </View>
          {workspace && <View nativeID="ex-operations-updates-panel" style={s.updatesPanel}>
            <Text accessibilityRole="header" style={s.sectionTitle}>Recent Project Updates</Text>
            <View nativeID="ex-operations-updates-scroll" accessibilityLabel="Recent project updates" {...{tabIndex: 0} as any}>
            {updates.length === 0 && <Text style={s.sectionHint}>Project updates will appear here.</Text>}
            {updates.map(({project, date, label}) => <TouchableOpacity key={`${project.id}:${label}`}
              accessibilityRole="button" onPress={() => openProject(project)} style={s.updateItem}>
              <Text style={s.updateIcon}>{label === 'Project created' ? '+' : '↗'}</Text>
              <View style={{flex: 1, minWidth: 0}}>
                <Text numberOfLines={1} style={s.activityName}>{projectDisplay(project.projectName)}</Text>
                <Text style={s.sectionHint}>{label}</Text>
                <Text style={s.sectionHint}>{new Date(date).toLocaleDateString()}</Text>
              </View>
            </TouchableOpacity>)}
            </View>
          </View>}
          </View>
        </>
      )}



      {showDefects && <DefectsModal c={c} onSummary={setDefectSummary} onClose={() => {setShowDefects(false); void loadDefects();}} />}
      <ProjectDetailModal onEdit={() => {if (onEditProject) {onEditProject(selectedProject.id || selectedProject.projectId); setSelectedProject(null);} else setEditProject(true);}}
        userRole={userRole}
        onDeleted={loadProjects}
        visible={!!selectedProject}
        project={selectedProject}
        onClose={() => {setEditProject(false); setSelectedProject(null);}}
        onSave={handleSaveProject}
        onAreasChanged={() => loadProjects()}
        surveyors={surveyors}
        qcUsers={qcUsers}
        clients={clients}
        loading={savingProject}
      />
    </ScrollView>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    screen: {flex: 1, backgroundColor: c.bg},
    content: {padding: 16, paddingBottom: 32, maxWidth: 760, width: '100%', alignSelf: 'center'},
    contentWide: {maxWidth: '100%', alignSelf: 'stretch', padding: 32, paddingBottom: 48},

    brandRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 18},
    brandSide: {minWidth: 44, alignItems: 'flex-start', justifyContent: 'center'},
    brandCenter: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minWidth: 0},
    logoBadge: {width: 74, height: 42, borderRadius: 8, backgroundColor: '#FFFFFF', padding: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
    logoImage: {width: '100%', height: '100%'},
    brandTitle: {color: c.text, fontSize: 21, fontWeight: '800'},
    brandSub: {color: c.secondary, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, marginTop: 1},
    motto: {color: c.muted, fontSize: 8.5, fontWeight: '700', letterSpacing: 1, textAlign: 'right', lineHeight: 12},

    profileRow: {flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16},
    userName: {color: c.text, fontSize: 19, fontWeight: '800'},
    roleBadge: {alignSelf: 'flex-start', marginTop: 6, backgroundColor: tint(c.yellow, '26'), borderWidth: 1, borderColor: tint(c.yellow, '66'), borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4},
    roleBadgeText: {color: c.yellow, fontSize: 12, fontWeight: '800'},

    operationsContent: {padding: 16, paddingBottom: 28},
    workspaceHeading: {minHeight: 164, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16,
      marginBottom: 14, padding: 22, borderWidth: 1, borderColor: '#126078', borderRadius: 18,
      backgroundColor: '#03192C', overflow: 'hidden'},
    heroPhoto: {position: 'absolute', top: 0, bottom: 0, right: '12%', width: '72%', height: '100%'},
    heroCopy: {flexGrow: 1, flexShrink: 1, gap: 5, minWidth: 220},
    heroKicker: {color: '#00D9EE', fontFamily: visual.mono, fontWeight: '800', letterSpacing: 2, fontSize: 12},
    heroKickerColor: {color: '#00D9EE'},
    heroTitle: {...typography.page, color: '#F5FAFF', fontStyle: 'italic'},
    heroDescription: {color: '#F5FAFF', fontSize: 14, lineHeight: 20},
    overviewRail: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12},
    overviewCard: {backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: visual.radius.panel, flexGrow: 1, flexBasis: 270, minWidth: 0, padding: 16, gap: 6},
    verificationBody: {flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10},
    quickTiles: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8},
    quickTile: {flexGrow: 1, flexBasis: 60, alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 78,
      padding: 6, borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.elevated},
    quickIcon: {color: c.cyan, fontSize: 24, fontWeight: '700'},
    quickLabel: {color: c.text, fontSize: 12, textAlign: 'center', fontWeight: '700'},
    activityRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 5},
    activityName: {color: c.text, fontWeight: '700', flex: 1},
    updatesPanel: {backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: visual.radius.panel, padding: 16, gap: 10},
    updateItem: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border},
    updateIcon: {fontSize: 20, fontWeight: '800', color: c.cyan, textAlign: 'center', width: 34, lineHeight: 34, borderRadius: 17, backgroundColor: c.elevated},
    workspaceNew: {backgroundColor: c.cyan, borderRadius: 12, minHeight: 46, paddingHorizontal: 18, justifyContent: 'center'},
    workspaceNewText: {color: c.bg === LIGHT.bg ? '#FFFFFF' : '#03192C', fontWeight: '800', fontSize: 15},
    workspaceKpi: {position: 'relative', minHeight: 126, padding: 16, paddingRight: 56, borderRadius: visual.radius.panel, alignItems: 'flex-start'},
    progressTrack: {height: 6, borderRadius: 4, backgroundColor: c.elevated, overflow: 'hidden', marginTop: 8},
    progressFill: {height: '100%', borderRadius: 4, backgroundColor: c.cyan},
    tablePanel: {minWidth: 0, borderWidth: 1, borderColor: c.border, borderRadius: visual.radius.panel, backgroundColor: c.card, overflow: 'hidden'},
    tableHeading: {paddingHorizontal: 20, paddingVertical: 18, marginBottom: 0},
    tableHeader: {flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 13, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.border},
    columnLabel: {fontSize: 11, fontWeight: '800', textTransform: 'uppercase', color: c.secondary},
    tableRow: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 20, borderTopWidth: 1, borderTopColor: c.border},
    kpiGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16},
    kpiCard: {
      flexGrow: 1,
      flexBasis: '46%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      padding: 14,
      minHeight: 104,
      ...web({boxShadow: c.shadow}),
    },
    kpiCardWide: {flexGrow: 1, flexShrink: 1, flexBasis: 220},
    iconBox: {width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
    iconGlyph: {fontSize: 24},
    kpiBody: {flex: 1, minWidth: 0},
    kpiLabel: {color: c.text, fontSize: 13, fontWeight: '700'},
    kpiValue: {...typography.kpi, color: c.text, marginTop: 2},
    kpiValueSub: {color: c.secondary, fontSize: 16, fontWeight: '600'},
    kpiFoot: {color: c.secondary, fontSize: 12, marginTop: 2},

    sectionHeading: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
    sectionTitle: {...typography.section, color: c.text, },
    sectionHint: {color: c.muted, fontSize: 12, fontWeight: '600', marginTop: 2},
    link: {color: c.amber, fontSize: 13, fontWeight: '800'},
    newBtn: {backgroundColor: c.amber, borderRadius: 12, minHeight: 50, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 24},
    newBtnText: {color: c.onAmber, fontSize: 15, fontWeight: '900'},

    projectCard: {flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 16, ...web({boxShadow: c.shadow})},
    projectName: {...typography.card, color: c.text, },
    projectLoc: {color: c.secondary, fontSize: 12.5, marginTop: 4},
    badgeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10},
    badge: {borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4},
    badgeText: {...typography.badge, },
    projectRight: {alignItems: 'flex-end'},
    areaCount: {color: c.text, fontSize: 22, fontWeight: '900'},
    areaLabel: {color: c.muted, fontSize: 9.5, fontWeight: '800', letterSpacing: 1},
    chevron: {color: c.muted, fontSize: 24},
    showMore: {alignItems: 'center', paddingVertical: 10},

    stateBox: {minHeight: 200, backgroundColor: c.card, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 28, borderWidth: 1, borderColor: c.border},
    stateTitle: {color: c.text, fontSize: 17, fontWeight: '800'},
    stateText: {color: c.secondary, fontSize: 13, lineHeight: 19, marginTop: 10, textAlign: 'center'},
    retryButton: {marginTop: 16, backgroundColor: c.amber, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10},
    retryText: {color: c.onAmber, fontWeight: '800', fontSize: 13},
  });
}
