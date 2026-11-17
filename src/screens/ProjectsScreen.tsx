import ProjectCompanyLogo from '../components/ProjectCompanyLogo';
import {OPERATIONS_DARK} from '../theme/operationsPalette';
import {visual} from '../theme/visual';
import DeleteProjectButton from '../components/DeleteProjectButton';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import ProjectDetailModal from '../components/ProjectDetailModal';
import SearchableOptionPicker from '../components/SearchableOptionPicker';
import {getApiErrorMessage} from '../api/errors';
import {getProjects, getSurveyorProjects, projectStatusLabel, updateProject} from '../api/projects';
import {useThemeMode} from '../theme/useThemeMode';
import {Colors, LIGHT, tint} from '../theme/palette';
import {projectDisplay} from '../utils/projectDisplay';

const OFFSHORE_PHOTO = require('../assets/landing/industry-3.jpg');

type UserOption = {id: string; displayName: string; email?: string; managerId?: string | null; managerName?: string | null};

type Props = {
  userRole?: string;
  isSurveyor?: boolean;
  onSurveyorProjectPress?: (projectId: string) => void;
  onEditProject?: (projectId: string) => void;
  onProjectPress?: (projectId: string, project: any) => void;
  surveyors?: UserOption[];
  qcUsers?: UserOption[];
  clients?: UserOption[];
};

const statusColors = (c: Colors, status: string) => {
  const color = ({Pending: c.yellow, Active: c.indigo, 'In Progress': c.cyan, Completed: c.success, 'On Hold': c.critical, InProgress: c.cyan, OnHold: c.critical} as Record<string, string>)[status] || c.yellow;
  return {backgroundColor: tint(color, '26'), color};
};

const projectIdOf = (project: any) => project?.id || project?.projectId;
const statusOf = (project: any) => project?.status || project?.projectStatus || 'Pending';

export default function ProjectsScreen({
  userRole,
  isSurveyor = false,
  onSurveyorProjectPress,
  onProjectPress,
  onEditProject,
  surveyors = [],
  qcUsers = [],
  clients = [],
}: Props) {
  const {width} = useWindowDimensions();
  const mode = useThemeMode();
  const c = mode === 'dark' ? OPERATIONS_DARK : LIGHT;
  const styles = useMemo(() => makeStyles(c), [c]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editProject, setEditProject] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = isSurveyor ? await getSurveyorProjects() : await getProjects();
      setProjects(Array.isArray(response.data) ? response.data : []);
    } catch (loadError: any) {
      setError(loadError?.response?.data?.message || 'Could not load projects. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [isSurveyor]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return projects.filter(project =>
      (!statusFilter || projectStatusLabel(statusOf(project)) === statusFilter) &&
      [project.projectName, project.jobNo, project.location, project.vesselOrSiteName]
        .some(value => String(value || '').toLowerCase().includes(normalizedQuery)),
    );
  }, [projects, query, statusFilter]);

  const wide = width >= 1080;
  const compact = width < 560;

  const handleSave = async (data: {
    projectName: string;
    jobNo: string;
    location: string;
    vesselOrSiteName: string;
    assignedSurveyorId: string;
    assignedQcId: string;
    assignedClientId?: string | null;
    status: string;
    reportStatus?: string;
  }) => {
    if (!selectedProject) return;
    setSaving(true);
    try {
      await updateProject(projectIdOf(selectedProject), data);
      setEditProject(false);
      setSelectedProject(null);
      await loadProjects();
    } catch (saveError: any) {
      const message = getApiErrorMessage(saveError, 'Could not save project. Please try again.');
      if (Platform.OS === 'web') (globalThis as any).alert(message);
      else Alert.alert('Could not save project', message);
    } finally {
      setSaving(false);
    }
  };

  if (selectedProject && editProject) return <ProjectDetailModal fullPage
          userRole={userRole}
          onDeleted={loadProjects}
          visible={!!selectedProject}
          project={selectedProject}
          onClose={() => {setEditProject(false); setSelectedProject(null);}}
          onSave={handleSave}
          onAreasChanged={loadProjects}
          surveyors={surveyors}
          qcUsers={qcUsers}
          clients={clients}
          loading={saving}
        />;

  return (
    <ScrollView nativeID="ex-projects-workspace" style={styles.screen}
      contentContainerStyle={[styles.content, compact && styles.compactContent]} keyboardShouldPersistTaps="handled">
      <View nativeID="ex-projects-hero" style={[styles.header, compact && styles.compactHeader]}>
        <Image source={OFFSHORE_PHOTO} resizeMode="cover" style={styles.heroPhoto} accessible={false} />
        <View nativeID="ex-operations-hero-overlay" pointerEvents="none"
          style={[StyleSheet.absoluteFill, Platform.OS !== 'web' && styles.nativeOverlay]} />
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>SURVEY DELIVERY  /  PROJECTS</Text>
          <Text accessibilityRole="header" style={[styles.title, compact && styles.compactTitle]}>Proje<Text style={styles.accent}>cts</Text></Text>
          <Text style={styles.subtitle}>Review project status, locations and survey scope.</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countIcon} accessible={false}>▱</Text>
          <Text style={styles.count}>{loading || error ? '—' : projects.length}</Text>
          <Text style={styles.countLabel}>PROJECTS</Text>
        </View>
      </View>

      <View style={[styles.toolbar, compact && styles.compactToolbar, !compact && width < 900 && styles.tabletToolbar]}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            accessibilityLabel="Search projects by name, job number, or location"
            value={query}
            onChangeText={setQuery}
            placeholder="Search projects, job number, or location"
            placeholderTextColor={c.muted}
            style={styles.searchInput}
          />
        </View>
        <View style={[styles.statusFilter, compact && styles.compactStatusFilter]}>
          <SearchableOptionPicker label="Filter project status" value={statusFilter} placeholder="All project statuses" dark={mode === 'dark'}
            options={[{value: '', label: 'All project statuses'}, ...Array.from(new Set(projects.map(p => projectStatusLabel(statusOf(p))))).map(label => ({value: label, label}))]}
            onChange={setStatusFilter} />
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Refresh projects"
          style={styles.refreshButton} onPress={loadProjects} disabled={loading}>
          <Text style={styles.refreshText}>{loading ? 'Loading…' : '↻  Refresh'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={c.amber} size="large" />
          <Text style={styles.stateText}>Loading projects…</Text>
        </View>
      ) : error ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>Projects aren’t available</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProjects}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : filteredProjects.length === 0 ? (
        <View style={styles.stateBox}>
          <Text style={styles.emptyIcon}>▦</Text>
          <Text style={styles.stateTitle}>{query ? 'No matching projects' : 'No projects yet'}</Text>
          <Text style={styles.stateText}>
            {query ? 'Try a different project name, job number, or location.' : 'Projects will appear here when they are available to your account.'}
          </Text>
        </View>
      ) : (
        <View nativeID="ex-projects-grid" style={styles.grid}>
          {filteredProjects.map(project => {
            const status = projectStatusLabel(statusOf(project));
            const statusStyle = statusColors(c, status);
            const projectId = projectIdOf(project);
            const projectName = projectDisplay(project.projectName) || 'UNTITLED PROJECT';
            const openProject = () => {
              if (isSurveyor) onSurveyorProjectPress?.(projectId);
              else if (onProjectPress) onProjectPress(projectId, project);
              else setSelectedProject(project);
            };
            return (
              <View key={projectId || projectName} style={[styles.projectCard, wide ? styles.projectCardTwo : styles.projectCardOne]}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open ${projectName}`}
                  onPress={openProject} style={styles.cardBody}>
                  <ProjectCompanyLogo projectId={projectId} version={project} style={[styles.projectPhoto, compact && styles.compactPhoto]} />
                  <View style={styles.cardInfo}>
                    <View style={styles.cardTop}>
                      <Text style={styles.projectName}>{projectName}</Text>
                      <View style={[styles.statusBadge, {backgroundColor: statusStyle.backgroundColor}]}>
                        <Text style={[styles.statusText, {color: statusStyle.color}]}>● {status}</Text>
                      </View>
                    </View>
                    <Text style={{color:c.secondary,fontSize:13}}>Report: {project.reportStatus || 'Ongoing'}</Text><Text style={styles.jobNumber}>
                      {project.jobNo || project.jobNumber ? `JOB ${projectDisplay(project.jobNo || project.jobNumber)}` : 'JOB NUMBER NOT SET'}
                    </Text>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>◇ LOCATION</Text>
                      <Text style={styles.detailValue}>{projectDisplay(project.location) || 'NOT SET'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
                <View style={styles.cardFooter}>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open project details for ${projectName}`}
                    onPress={openProject} style={styles.openButton}>
                    <Text style={styles.openProject}>Open project details  →</Text>
                  </TouchableOpacity>
                  <DeleteProjectButton userRole={userRole} projectId={projectId} projectName={project.projectName} onDeleted={loadProjects} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {!isSurveyor && (
        <ProjectDetailModal onEdit={() => {if (onEditProject) {onEditProject(projectIdOf(selectedProject)); setSelectedProject(null);} else setEditProject(true);}}
          userRole={userRole}
          onDeleted={loadProjects}
          visible={!!selectedProject}
          project={selectedProject}
          onClose={() => {setEditProject(false); setSelectedProject(null);}}
          onSave={handleSave}
          onAreasChanged={loadProjects}
          surveyors={surveyors}
          qcUsers={qcUsers}
          clients={clients}
          loading={saving}
        />
      )}
    </ScrollView>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
  screen: {flex: 1, backgroundColor: c.bg},
  content: {padding: 22, paddingBottom: 44, width: '100%', alignSelf: 'center', flexGrow: 1},
  compactContent: {paddingHorizontal: 12},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, minHeight: 192,
    borderWidth: 1, borderColor: '#126078', backgroundColor: '#03192C', borderRadius: 18, overflow: 'hidden', padding: 26, marginBottom: 18},
  compactHeader: {padding: 14, gap: 10, minHeight: 156},
  heroPhoto: {position: 'absolute', right: '9%', width: '76%', height: '100%'},
  nativeOverlay: {backgroundColor: '#03192C85'},
  headerCopy: {flex: 1, minWidth: 0},
  eyebrow: {fontFamily: visual.mono, fontSize: 11, fontWeight: '800', color: '#00D9EE', letterSpacing: 1.3},
  title: {fontFamily: visual.display, fontSize: 44, fontStyle: 'italic', fontWeight: '900', color: '#F5FAFF', marginTop: 4},
  compactTitle: {fontSize: 34},
  accent: {color: '#00D9EE'},
  subtitle: {fontSize: 14, lineHeight: 20, color: '#F5FAFF', marginTop: 6},
  countBadge: {alignItems: 'center', minWidth: 76, padding: 12, borderWidth: 1, borderColor: '#126078',
    borderRadius: 16, backgroundColor: '#03192CBF'},
  countIcon: {color: '#00D9EE', fontWeight: '800', fontSize: 24},
  count: {fontSize: 29, lineHeight: 35, color: '#FBBF24', fontWeight: '900'},
  countLabel: {fontSize: 10, color: '#F5FAFF', fontWeight: '800', letterSpacing: .6},
  toolbar: {flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18},
  tabletToolbar: {flexWrap: 'wrap'},
  compactToolbar: {flexDirection: 'column', alignItems: 'stretch', gap: 10, marginBottom: 16},
  searchBox: {flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: c.border, borderRadius: 11, backgroundColor: c.card, paddingHorizontal: 13},
  statusFilter: {width: 250, minHeight: 44, justifyContent: 'center'},
  compactStatusFilter: {width: '100%'},
  searchIcon: {fontSize: 22, color: c.cyan, marginRight: 8},
  searchInput: {flex: 1, minWidth: 0, color: c.text, fontSize: 13},
  refreshButton: {height: 44, minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 11,
    borderWidth: 1, borderColor: c.border, backgroundColor: c.elevated},
  refreshText: {fontSize: 13, color: c.cyan, fontWeight: '800'},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'stretch'},
  projectCard: {backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 15, minWidth: 0},
  projectCardTwo: {flexBasis: '47%', flexGrow: 1, maxWidth: '50%'},
  projectCardOne: {flexBasis: '100%', width: '100%'},
  cardBody: {flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1},
  cardInfo: {flex: 1, minWidth: 0},
  projectPhoto: {width: 120, height: 120, borderRadius: 13},
  compactPhoto: {width: 64, height: 75, borderRadius: 9},
  cardTop: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6},
  statusBadge: {paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20},
  statusText: {fontSize: 10, fontWeight: '800'},
  projectName: {fontSize: 18, flexShrink: 1, fontWeight: '900', color: c.text},
  jobNumber: {fontSize: 11, color: c.secondary, fontWeight: '800', letterSpacing: .4, marginTop: 5},
  divider: {height: 1, backgroundColor: c.border, marginVertical: 13},
  detailRow: {flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 7},
  detailLabel: {fontSize: 10, color: c.secondary, fontWeight: '800', letterSpacing: .4},
  detailValue: {flex: 1, fontSize: 12, color: c.text, fontWeight: '800', textAlign: 'right'},
  cardFooter: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between',
    marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border},
  openButton: {minHeight: 40, justifyContent: 'center'},
  openProject: {fontSize: 13, color: c.cyan, fontWeight: '900'},
  stateBox: {minHeight: 240, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 28},
  stateTitle: {fontSize: 16, fontWeight: '800', color: c.text, marginTop: 8},
  stateText: {fontSize: 12, lineHeight: 18, color: c.secondary, marginTop: 8, textAlign: 'center', maxWidth: 440},
  emptyIcon: {fontSize: 28, color: c.amber},
  retryButton: {marginTop: 16, borderRadius: 10, backgroundColor: c.amber, paddingHorizontal: 17, paddingVertical: 10},
  retryText: {fontSize: 12, fontWeight: '800', color: c.onAmber},
  });
}
