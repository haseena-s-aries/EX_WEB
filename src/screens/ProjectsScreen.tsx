import DeleteProjectButton from '../components/DeleteProjectButton';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {getApiErrorMessage} from '../api/errors';
import {getProjects, getSurveyorProjects, updateProject} from '../api/projects';

type UserOption = {id: string; displayName: string; managerId?: string | null; managerName?: string | null};

type Props = {
  userRole?: string;
  isSurveyor?: boolean;
  onSurveyorProjectPress?: (projectId: string) => void;
  onProjectPress?: (projectId: string, project: any) => void;
  surveyors?: UserOption[];
  qcUsers?: UserOption[];
  clients?: UserOption[];
};

const STATUS_COLORS: Record<string, {backgroundColor: string; color: string}> = {
  Pending: {backgroundColor: '#fff0d7', color: '#a75a0b'},
  Active: {backgroundColor: '#f0eeff', color: '#718be8'},
  'In Progress': {backgroundColor: '#f1eaf3', color: '#8053a6'},
  Completed: {backgroundColor: '#e5eef7', color: '#3b68aa'},
  'On Hold': {backgroundColor: '#fde8e2', color: '#ba4e3c'},
};

const projectIdOf = (project: any) => project?.id || project?.projectId;
const statusOf = (project: any) => project?.status || project?.projectStatus || 'Pending';

export default function ProjectsScreen({
  userRole,
  isSurveyor = false,
  onSurveyorProjectPress,
  onProjectPress,
  surveyors = [],
  qcUsers = [],
  clients = [],
}: Props) {
  const {width} = useWindowDimensions();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
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
    if (!normalizedQuery) return projects;
    return projects.filter(project =>
      [project.projectName, project.jobNo, project.sector, project.location, project.vesselOrSiteName]
        .some(value => String(value || '').toLowerCase().includes(normalizedQuery)),
    );
  }, [projects, query]);

  const columns = width >= 1250 ? 3 : width >= 650 ? 2 : 1;

  const handleSave = async (data: {
    projectName: string;
    sector: string;
    jobNo: string;
    location: string;
    vesselOrSiteName: string;
    assignedSurveyorId: string;
    assignedQcId: string;
    assignedClientId?: string | null;
    status: string;
  }) => {
    if (!selectedProject) return;
    setSaving(true);
    try {
      await updateProject(projectIdOf(selectedProject), data);
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>WORKSPACE</Text>
          <Text style={styles.title}>Projects</Text>
          <Text style={styles.subtitle}>A clear view of project status, location, and scope.</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.count}>{projects.length}</Text>
          <Text style={styles.countLabel}>PROJECTS</Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search projects, job number, or location"
            placeholderTextColor="#85899a"
            style={styles.searchInput}
          />
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={loadProjects} disabled={loading}>
          <Text style={styles.refreshText}>{loading ? 'Loading…' : '↻  Refresh'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color="#718be8" size="large" />
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
        <View style={styles.grid}>
          {filteredProjects.map(project => {
            const status = statusOf(project);
            const statusStyle = STATUS_COLORS[status] || STATUS_COLORS.Pending;
            const projectId = projectIdOf(project);
            return (
              <TouchableOpacity
                key={projectId || project.projectName}
                activeOpacity={0.82}
                onPress={() => {
                  if (isSurveyor) onSurveyorProjectPress?.(projectId);
                  else if (onProjectPress) onProjectPress(projectId, project);
                  else setSelectedProject(project);
                }}
                style={[
                  styles.projectCard,
                  columns === 3 ? styles.projectCardThree : columns === 2 ? styles.projectCardTwo : styles.projectCardOne,
                ]}>
                <View style={styles.cardTop}>
                  <View style={styles.projectMark}><Text style={styles.projectMarkText}>▦</Text></View>
                  <View style={[styles.statusBadge, {backgroundColor: statusStyle.backgroundColor}]}>
                    <Text style={[styles.statusText, {color: statusStyle.color}]}>{status}</Text>
                  </View>
                </View>
                <Text style={styles.projectName} numberOfLines={1}>{project.projectName || 'Untitled project'}</Text>
                <Text style={styles.jobNumber} numberOfLines={1}>
                  {project.jobNo || project.jobNumber ? `JOB ${project.jobNo || project.jobNumber}` : 'JOB NUMBER NOT SET'}
                </Text>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>LOCATION</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>{project.location || 'Not set'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>SECTOR</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>{project.sector || 'Not set'}</Text>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.openProject}>Open project details</Text>
                  <Text style={styles.arrow}>↗</Text>
                  <DeleteProjectButton userRole={userRole} projectId={projectId} projectName={project.projectName} onDeleted={loadProjects} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {!isSurveyor && (
        <ProjectDetailModal
          userRole={userRole}
          onDeleted={loadProjects}
          visible={!!selectedProject}
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
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

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#f7f9ff'},
  content: {padding: 28, paddingBottom: 44, maxWidth: 1440, width: '100%', alignSelf: 'center', minHeight: '100%' as any},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24},
  headerCopy: {flex: 1, minWidth: 0},
  eyebrow: {fontSize: 10, fontWeight: '800', color: '#8fa7f8', letterSpacing: 1.5},
  title: {fontSize: 28, fontWeight: '800', color: '#242d52', marginTop: 4},
  subtitle: {fontSize: 13, color: '#7a7f93', marginTop: 5},
  countBadge: {alignItems: 'flex-end', paddingLeft: 18},
  count: {fontSize: 26, lineHeight: 30, color: '#718be8', fontWeight: '800'},
  countLabel: {fontSize: 9, color: '#85899a', fontWeight: '800', letterSpacing: 1.1},
  toolbar: {flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20},
  searchBox: {flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e9f6', borderRadius: 11, backgroundColor: '#fff', paddingHorizontal: 13},
  searchIcon: {fontSize: 22, color: '#8fa7f8', marginRight: 8},
  searchInput: {flex: 1, minWidth: 0, color: '#252f50', fontSize: 13},
  refreshButton: {minHeight: 42, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#f0eeff'},
  refreshText: {fontSize: 12, color: '#718be8', fontWeight: '800'},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'stretch'},
  projectCard: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e9f6', borderRadius: 14, padding: 17, minHeight: 206, ...({boxShadow: '0 5px 18px rgba(36, 45, 82, 0.06)'} as any)},
  projectCardThree: {flexBasis: '31%', flexGrow: 1, maxWidth: '33%'},
  projectCardTwo: {flexBasis: '47%', flexGrow: 1, maxWidth: '50%'},
  projectCardOne: {flexBasis: '100%', width: '100%'},
  cardTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14},
  projectMark: {width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0eeff'},
  projectMarkText: {fontSize: 16, color: '#718be8', fontWeight: '800'},
  statusBadge: {paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20},
  statusText: {fontSize: 10, fontWeight: '800'},
  projectName: {fontSize: 15, fontWeight: '800', color: '#242d52'},
  jobNumber: {fontSize: 9, color: '#8a8fa3', fontWeight: '800', letterSpacing: 0.8, marginTop: 4},
  divider: {height: 1, backgroundColor: '#eef0f6', marginVertical: 13},
  detailRow: {flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 7},
  detailLabel: {fontSize: 9, color: '#8a8fa3', fontWeight: '800', letterSpacing: 0.6},
  detailValue: {flex: 1, fontSize: 11, color: '#424760', fontWeight: '700', textAlign: 'right'},
  cardFooter: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' as any, paddingTop: 7},
  openProject: {fontSize: 11, color: '#718be8', fontWeight: '800'},
  arrow: {fontSize: 15, color: '#b8a5f8', fontWeight: '800'},
  stateBox: {minHeight: 240, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e9f6', borderRadius: 14, padding: 28},
  stateTitle: {fontSize: 16, fontWeight: '800', color: '#242d52', marginTop: 8},
  stateText: {fontSize: 12, lineHeight: 18, color: '#7a7f93', marginTop: 8, textAlign: 'center', maxWidth: 440},
  emptyIcon: {fontSize: 28, color: '#8fa7f8'},
  retryButton: {marginTop: 16, borderRadius: 10, backgroundColor: '#b8a5f8', paddingHorizontal: 17, paddingVertical: 10},
  retryText: {fontSize: 12, fontWeight: '800', color: '#242d52'},
});
