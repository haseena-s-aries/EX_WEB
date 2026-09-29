import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {getApiErrorMessage} from '../api/errors';
import {
  getSurveyorProjects,
  SurveyorProjectSummary,
} from '../api/projects';

type Props = {
  userName: string;
  onProjectPress: (projectId: string) => void;
};

const projectStatus = (project: SurveyorProjectSummary) =>
  project.status || 'Assigned';

const STATUS_BADGES: Record<string, {backgroundColor: string; color: string}> = {
  assigned: {backgroundColor: '#f0eeff', color: '#718be8'},
  pending: {backgroundColor: '#fff0d7', color: '#a75a0b'},
  active: {backgroundColor: '#f0eeff', color: '#718be8'},
  'in progress': {backgroundColor: '#f1eaf3', color: '#8053a6'},
  completed: {backgroundColor: '#e5eef7', color: '#3b68aa'},
  'on hold': {backgroundColor: '#fde8e2', color: '#ba4e3c'},
};

export default function SurveyorDashboardScreen({
  userName,
  onProjectPress,
}: Props) {
  const [projects, setProjects] = useState<SurveyorProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadProjects = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const response = await getSurveyorProjects();
      setProjects(response.data);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'Could not load assigned projects.'),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadProjects(true)}
        />
      }>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>SURVEYOR DASHBOARD</Text>
          <Text style={styles.title}>Welcome, {userName.split(' ')[0]}</Text>
          <Text style={styles.subtitle}>Your assigned inspection projects</Text>
        </View>
        <View style={styles.countBox}>
          <Text style={styles.count}>{projects.length}</Text>
          <Text style={styles.countLabel}>Assigned</Text>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Assigned Projects</Text>
        {!loading && !error && (
          <Text style={styles.sectionCount}>{projects.length} total</Text>
        )}
      </View>

      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color="#8fa7f8" size="large" />
          <Text style={styles.stateText}>Loading assigned projects...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateBox}>
          <Text style={styles.errorTitle}>Projects unavailable</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadProjects()}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : projects.length === 0 ? (
        <View style={styles.stateBox}>
          <Text style={styles.emptyMark}>0</Text>
          <Text style={styles.errorTitle}>No projects assigned</Text>
          <Text style={styles.stateText}>
            Projects assigned to your account will appear here.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {projects.map(project => {
            const status = projectStatus(project);
            const badge = STATUS_BADGES[status.toLowerCase()] || STATUS_BADGES.assigned;
            return (
              <TouchableOpacity
                accessibilityRole="button"
                key={project.projectId}
                onPress={() => onProjectPress(project.projectId)}
                style={styles.projectCard}>
                <View style={styles.cardTopRow}>
                  <View style={styles.projectIdentity}>
                    <View style={styles.initialBox}>
                      <Text style={styles.initialText}>
                        {project.projectName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.projectNameWrap}>
                      <Text style={styles.projectName}>{project.projectName}</Text>
                      <Text style={styles.sector}>{project.sector}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, {backgroundColor: badge.backgroundColor}]}>
                    <Text style={[styles.statusText, {color: badge.color}]}>{status}</Text>
                  </View>
                </View>

                <View style={styles.metadata}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>JOB NO</Text>
                    <Text style={styles.metaValue}>{project.jobNo || 'Not set'}</Text>
                  </View>
                  <View style={styles.metaItemWide}>
                    <Text style={styles.metaLabel}>LOCATION</Text>
                    <Text style={styles.metaValue} numberOfLines={2}>
                      {project.location || 'Not set'}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>AREAS</Text>
                    <Text style={styles.metaValue}>{project.areaCount}</Text>
                  </View>
                </View>
                <Text style={styles.openText}>Open project  &gt;</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#f7f9ff'},
  content: {padding: 24, paddingBottom: 48, maxWidth: 1180, width: '100%', alignSelf: 'center'},
  header: {
    minHeight: 150,
    backgroundColor: '#242d52',
    padding: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCopy: {flex: 1, paddingRight: 16},
  eyebrow: {color: '#b8a5f8', fontSize: 11, fontWeight: '800', letterSpacing: 1.1},
  title: {color: '#fff', fontSize: 25, fontWeight: '800', marginTop: 8},
  subtitle: {color: '#e3eaff', fontSize: 14, marginTop: 6},
  countBox: {minWidth: 90, borderLeftWidth: 1, borderLeftColor: '#8791b2', paddingLeft: 22},
  count: {fontSize: 31, fontWeight: '800', color: '#fff'},
  countLabel: {fontSize: 11, fontWeight: '700', color: '#c9cded', marginTop: 2},
  sectionHeading: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 26, marginBottom: 12},
  sectionTitle: {fontSize: 18, fontWeight: '800', color: '#242d52'},
  sectionCount: {fontSize: 12, fontWeight: '700', color: '#7b8092'},
  stateBox: {minHeight: 240, backgroundColor: '#fff', borderRadius: 8, alignItems: 'center', justifyContent: 'center', padding: 30, borderWidth: 1, borderColor: '#e5e9f6'},
  stateText: {fontSize: 13, lineHeight: 19, color: '#74798c', marginTop: 12, textAlign: 'center'},
  errorTitle: {fontSize: 17, fontWeight: '800', color: '#242d52', marginTop: 8},
  emptyMark: {fontSize: 30, fontWeight: '800', color: '#8fa7f8'},
  retryButton: {marginTop: 18, backgroundColor: '#b8a5f8', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10},
  retryText: {color: '#242d52', fontWeight: '800', fontSize: 13},
  list: {gap: 12},
  projectCard: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e9f6', borderRadius: 14, padding: 18},
  cardTopRow: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12},
  projectIdentity: {flex: 1, flexDirection: 'row', alignItems: 'center'},
  initialBox: {width: 42, height: 42, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0eeff'},
  initialText: {fontSize: 17, color: '#8fa7f8', fontWeight: '800'},
  projectNameWrap: {flex: 1, marginLeft: 12},
  projectName: {fontSize: 16, fontWeight: '800', color: '#242d52'},
  sector: {fontSize: 12, color: '#85899a', marginTop: 3},
  statusBadge: {borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6},
  statusText: {fontSize: 11, fontWeight: '800'},
  metadata: {flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 18, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#eef0f5'},
  metaItem: {minWidth: 100},
  metaItemWide: {flex: 1, minWidth: 160},
  metaLabel: {fontSize: 9, fontWeight: '800', color: '#9599aa'},
  metaValue: {fontSize: 13, fontWeight: '700', color: '#3d4159', marginTop: 4},
  openText: {alignSelf: 'flex-end', color: '#8fa7f8', fontSize: 12, fontWeight: '800', marginTop: 14},
});
