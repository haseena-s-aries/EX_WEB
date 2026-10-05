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
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import NewProjectModal from '../components/NewProjectModal';
import ProjectDetailModal from '../components/ProjectDetailModal';
import ThemeToggle from '../components/ThemeToggle';
import ProgressRing from '../components/ProgressRing';
import {useThemeMode} from '../theme/useThemeMode';
import {Colors, DARK, LIGHT, tint} from '../theme/palette';
import {getProjects, createProject, addProjectArea, updateProject, normalizeProjectStatus, projectStatusLabel} from '../api/projects';
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

type UserOption = {id: string; displayName: string};

type Props = {
  userName: string;
  /** Role shown in the badge under the name (e.g. Admin / Manager). */
  userRole?: string;
  surveyors?: UserOption[];
  qcUsers?: UserOption[];
  clients?: UserOption[];
  /** Brand header (Ex logo + slogan). Off by default: sidebar / native shell already show one. */
  showBrand?: boolean;
  /** Optional element at the right of the profile row (e.g. the notification bell). */
  accessory?: React.ReactNode;
};

const VISIBLE_SITES = 6;

export default function DashboardScreen({
  userName,
  userRole = 'Admin',
  surveyors = [],
  qcUsers = [],
  clients = [],
  showBrand = false,
  accessory,
}: Props) {
  const mode = useThemeMode();
  const c = mode === 'dark' ? DARK : LIGHT;
  const s = useMemo(() => makeStyles(c), [c]);

  const {width} = useWindowDimensions();
  const isWide = width >= 900;
  const [showNewProject, setShowNewProject] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<EquipmentRow[] | null>(null);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [savingProject, setSavingProject] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const loadProjects = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoadingProjects(true);
    try {
      const res = await getProjects();
      setProjects(res.data);
      setLoadingProjects(false);
      // Equipment totals need each project's details; load them after the list is on screen.
      loadAllEquipment(res.data)
        .then(setEquipment)
        .catch(() => setEquipment([]));
    } catch (err: any) {
      console.error(err?.response?.data || err.message);
    } finally {
      setLoadingProjects(false);
      setRefreshing(false);
    }
  }, []);

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
    equipment?.filter(e => ['completed', 'qcapproved'].includes(inspectionKey(e.inspectionStatus))).length ?? 0;
  const pendingQc = equipment?.filter(e => inspectionKey(e.inspectionStatus) === 'completed').length ?? 0;
  const verifiedPct = equipmentTotal ? Math.round((verified / equipmentTotal) * 100) : 0;

  const sorted = useMemo(
    () => [...projects].sort((x, y) => (y.createdAt || '').localeCompare(x.createdAt || '')),
    [projects],
  );
  const visible = showAll ? sorted : sorted.slice(0, VISIBLE_SITES);

  const handleCreate = async (data: {
  projectName: string;
  sector: string;
  jobNumber: string;
  location: string;
  vesselName: string;
  surveyorId: string;
  qcId: string;
  clientId: string;
  areas: {name: string; file: any; fileName: string}[];
}) => {
  setCreating(true);
  try {
    const res = await createProject({
      projectName: data.projectName,
      sector: data.sector,
      jobNo: data.jobNumber,
      location: data.location,
      vesselOrSiteName: data.vesselName,
      assignedSurveyorId: data.surveyorId,
      assignedQcId: data.qcId,
      assignedClientId: data.clientId,
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
    const errData = err?.response?.data;
    Alert.alert('Error', errData?.error || errData?.message || 'Could not create project');
  } finally {
    setCreating(false);
  }
};

  const handleSaveProject = async (data: {
    projectName: string;
    sector: string;
    jobNo: string;
    location: string;
    vesselOrSiteName: string;
    assignedSurveyorId: string;
    assignedQcId: string;
    assignedClientId: string;
    status: string;
  }) => {
    if (!selectedProject) return;
    const projectId = selectedProject.id || selectedProject.projectId;
    setSavingProject(true);
    try {
      await updateProject(projectId, data);
      setSelectedProject(null);
      await loadProjects();
    } catch (err: any) {
      const errData = err?.response?.data;
      Alert.alert('Error', errData?.error || errData?.message || 'Could not save project changes');
    } finally {
      setSavingProject(false);
    }
  };

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, isWide && s.contentWide]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProjects(true)} />}>
      {showBrand ? (
        <View style={s.brandRow}>
          <View style={s.exBadge}>
            <Text style={s.exBadgeText}>Ex</Text>
          </View>
          <View style={{flex: 1}}>
            <Text style={s.brandTitle}>Ex-Survey</Text>
            <Text style={s.brandSub}>ATEX & IECEx INSPECTIONS</Text>
          </View>
          <Text style={s.motto}>{'SAFER ASSETS\nA BRIGHTER TOMORROW'}</Text>
        </View>
      ) : null}

      <View style={s.profileRow}>
        <View style={{flex: 1}}>
          <Text style={s.userName} numberOfLines={1}>
            {userName}
          </Text>
          <View style={s.roleBadge}>
            <Text style={s.roleBadgeText}>⚡ {userRole}</Text>
          </View>
        </View>
        {accessory}
        <ThemeToggle floating={false} size={34} />
      </View>

      {loadingProjects ? (
        <ActivityIndicator color={c.amber} style={{marginVertical: 40}} />
      ) : (
        <>
          <View style={s.kpiGrid}>
            <View style={[s.kpiCard, isWide && s.kpiCardWide]}>
              <View style={[s.iconBox, {backgroundColor: tint(c.cyan, '1F')}]}>
                <Text style={[s.iconGlyph, {color: c.cyan}]}>▤</Text>
              </View>
              <View style={s.kpiBody}>
                <Text style={s.kpiLabel}>Active Surveys</Text>
                <Text style={s.kpiValue}>{activeSurveys}</Text>
                <Text style={s.kpiFoot}>In progress</Text>
              </View>
            </View>

            <View
              style={[
                s.kpiCard,
                isWide && s.kpiCardWide,
                {backgroundColor: tint(c.critical, '14'), borderColor: tint(c.critical, '44')},
              ]}>
              <View style={[s.iconBox, {backgroundColor: tint(c.critical, '24')}]}>
                <Text style={[s.iconGlyph, {color: c.critical}]}>⚠</Text>
              </View>
              <View style={s.kpiBody}>
                <Text style={s.kpiLabel}>Defects Flagged</Text>
                <Text style={s.kpiValue}>0</Text>
                <Text style={s.kpiFoot}>0 total defects</Text>
              </View>
            </View>

            <View style={[s.kpiCard, isWide && s.kpiCardWide]}>
              <ProgressRing
                pct={verifiedPct}
                color={c.success}
                track={c.elevated}
                textColor={c.text}
                label={equipment ? undefined : '…'}
              />
              <View style={s.kpiBody}>
                <Text style={s.kpiLabel}>Equipment Verified</Text>
                <Text style={s.kpiValue}>
                  {equipment ? verified : '–'}
                  <Text style={s.kpiValueSub}> / {equipment ? equipmentTotal : '–'}</Text>
                </Text>
                <Text style={s.kpiFoot}>Items checked</Text>
              </View>
            </View>

            <View style={[s.kpiCard, isWide && s.kpiCardWide]}>
              <View style={[s.iconBox, {backgroundColor: tint(c.amber, '22')}]}>
                <Text style={[s.iconGlyph, {color: c.amber}]}>◷</Text>
              </View>
              <View style={s.kpiBody}>
                <Text style={s.kpiLabel}>Pending QC</Text>
                <Text style={s.kpiValue}>{equipment ? pendingQc : '–'}</Text>
                <Text style={s.kpiFoot}>Awaiting review</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setShowNewProject(true)}
            style={[s.newBtn, isWide && {alignSelf: 'flex-start'}]}>
            <Text style={s.newBtnText}>+ New project</Text>
          </TouchableOpacity>

          <View style={s.sectionHeading}>
            <View>
              <Text style={s.sectionTitle}>Active Site Operations</Text>
              <Text style={s.sectionHint}>{projects.length} total</Text>
            </View>
          </View>

          {projects.length === 0 ? (
            <View style={s.stateBox}>
              <Text style={s.stateTitle}>No projects yet</Text>
              <Text style={s.stateText}>Projects you create or are assigned to will appear here.</Text>
              <TouchableOpacity style={s.retryButton} onPress={() => setShowNewProject(true)}>
                <Text style={s.retryText}>+ Create your first project</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{gap: 12}}>
              {visible.map(project => {
                const status = statusOf(project);
                const sc = statusColor(c, status);
                const lead = surveyorName(project.assignedSurveyorId);
                return (
                  <TouchableOpacity
                    key={project.id}
                    accessibilityRole="button"
                    onPress={() => setSelectedProject(project)}
                    activeOpacity={0.75}
                    style={s.projectCard}>
                    <View style={{flex: 1, minWidth: 0}}>
                      <Text style={s.projectName} numberOfLines={2}>
                        {project.projectName}
                      </Text>
                      <Text style={s.projectLoc} numberOfLines={1}>
                        {[project.location, lead ? `Lead: ${lead}` : null].filter(Boolean).join('  •  ') ||
                          'Location not set'}
                      </Text>
                      <View style={s.badgeRow}>
                        <View style={[s.badge, {backgroundColor: tint(sc, '26')}]}>
                          <Text style={[s.badgeText, {color: sc}]}>{status.toUpperCase()}</Text>
                        </View>
                        {project.sector ? (
                          <View style={[s.badge, {backgroundColor: c.elevated}]}>
                            <Text style={[s.badgeText, {color: c.secondary}]}>{project.sector}</Text>
                          </View>
                        ) : null}
                        {project.jobNo ? (
                          <View style={[s.badge, {backgroundColor: c.elevated}]}>
                            <Text style={[s.badgeText, {color: c.secondary}]}>{project.jobNo}</Text>
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
        </>
      )}

      <NewProjectModal
        visible={showNewProject}
        onClose={() => setShowNewProject(false)}
        surveyors={surveyors}
        qcUsers={qcUsers}
        clients={clients}
        loading={creating}
        onCreate={handleCreate}
      />

      <ProjectDetailModal
        visible={!!selectedProject}
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
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
    content: {padding: 16, paddingBottom: 110, maxWidth: 760, width: '100%', alignSelf: 'center'},
    contentWide: {maxWidth: 1180, padding: 32, paddingBottom: 48},

    brandRow: {flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18},
    exBadge: {width: 42, height: 42, borderRadius: 10, backgroundColor: '#FBBF24', alignItems: 'center', justifyContent: 'center'},
    exBadgeText: {color: '#000', fontSize: 19, fontWeight: '900', fontStyle: 'italic'},
    brandTitle: {color: c.text, fontSize: 21, fontWeight: '800'},
    brandSub: {color: c.secondary, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, marginTop: 1},
    motto: {color: c.muted, fontSize: 8.5, fontWeight: '700', letterSpacing: 1, textAlign: 'right', lineHeight: 12},

    profileRow: {flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16},
    userName: {color: c.text, fontSize: 19, fontWeight: '800'},
    roleBadge: {alignSelf: 'flex-start', marginTop: 6, backgroundColor: tint(c.yellow, '26'), borderWidth: 1, borderColor: tint(c.yellow, '66'), borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4},
    roleBadgeText: {color: c.yellow, fontSize: 12, fontWeight: '800'},

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
    kpiCardWide: {flexBasis: '22%'},
    iconBox: {width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
    iconGlyph: {fontSize: 24},
    kpiBody: {flex: 1, minWidth: 0},
    kpiLabel: {color: c.text, fontSize: 13, fontWeight: '700'},
    kpiValue: {color: c.text, fontSize: 30, fontWeight: '900', marginTop: 2},
    kpiValueSub: {color: c.secondary, fontSize: 16, fontWeight: '600'},
    kpiFoot: {color: c.secondary, fontSize: 12, marginTop: 2},

    sectionHeading: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
    sectionTitle: {color: c.text, fontSize: 20, fontWeight: '800'},
    sectionHint: {color: c.muted, fontSize: 12, fontWeight: '600', marginTop: 2},
    link: {color: c.amber, fontSize: 13, fontWeight: '800'},
    newBtn: {backgroundColor: c.amber, borderRadius: 12, minHeight: 50, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 24},
    newBtnText: {color: c.onAmber, fontSize: 15, fontWeight: '900'},

    projectCard: {flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 16, ...web({boxShadow: c.shadow})},
    projectName: {color: c.text, fontSize: 16, fontWeight: '800'},
    projectLoc: {color: c.secondary, fontSize: 12.5, marginTop: 4},
    badgeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10},
    badge: {borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4},
    badgeText: {fontSize: 10.5, fontWeight: '800', letterSpacing: 0.3},
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
