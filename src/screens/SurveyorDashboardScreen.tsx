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
  getSurveyorDashboard,
  getSurveyorProjects,
  SurveyorDashboard,
  SurveyorProjectSummary,
  SurveyorQcFeedback,
} from '../api/projects';

type Props = {
  userName: string;
  onProjectPress: (projectId: string) => void;
  onFeedbackPress: (feedback: SurveyorQcFeedback) => void;
  refreshVersion?: number;
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
  onFeedbackPress,
  refreshVersion,
}: Props) {
  const [projects, setProjects] = useState<SurveyorProjectSummary[]>([]);
  const [dashboard, setDashboard] = useState<SurveyorDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

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
  }, [loadProjects, refreshVersion]);

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
          <Text style={styles.count}>{dashboard?.myProjectCount ?? projects.length}</Text>
          <Text style={styles.countLabel}>Assigned</Text>
        </View>
      </View>

      {!loading && !error && dashboard ? (
        <View style={styles.statsGrid}>
          <DashboardStat label="My Projects" value={dashboard.myProjectCount} tone="default" />
          <DashboardStat label="In Progress" value={dashboard.inProgress} tone="progress" />
          <DashboardStat label="On Hold" value={dashboard.onHold} tone="hold" />
          <DashboardStat label="Not Started" value={dashboard.notStarted} tone="pending" />
          <DashboardStat label="Awaiting QC Review" value={dashboard.awaitingQcReview} tone="review" />
          <DashboardStat label="Action Required" value={dashboard.changesRequested} tone="action" />
          <DashboardStat label="QC Approved" value={dashboard.qcApproved} tone="approved" />
        </View>
      ) : null}

      {!loading && !error && dashboard ? (
        <View style={styles.feedbackSection}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>QC Feedback</Text>
              <Text style={styles.sectionHint}>Equipment returned for correction</Text>
            </View>
            <View style={styles.actionCountBadge}>
              <Text style={styles.actionCountText}>{dashboard.qcFeedback.length}</Text>
            </View>
          </View>
          {dashboard.qcFeedback.length === 0 ? (
            <View style={styles.feedbackEmpty}>
              <Text style={styles.feedbackEmptyTitle}>No corrections requested</Text>
              <Text style={styles.feedbackEmptyText}>QC feedback requiring action will appear here.</Text>
            </View>
          ) : (
            <View style={styles.feedbackList}>
              {dashboard.qcFeedback.map(feedback => (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={feedback.equipmentId}
                  onPress={() => onFeedbackPress(feedback)}
                  style={styles.feedbackCard}>
                  <View style={styles.feedbackTopRow}>
                    <View style={styles.feedbackIdentity}>
                      <Text style={styles.feedbackTag}>#{feedback.sequenceNo}  {feedback.tagNumber}</Text>
                      <Text style={styles.feedbackContext}>{feedback.projectName}  |  {feedback.areaName}</Text>
                    </View>
                    <View style={styles.severityBadge}>
                      <Text style={styles.severityText}>{feedback.severity || 'Not set'}</Text>
                    </View>
                  </View>
                  <Text style={styles.feedbackType}>{feedback.type}</Text>
                  <Text style={styles.feedbackComment}>{feedback.qcComments || 'QC requested changes.'}</Text>
                  <View style={styles.feedbackFooter}>
                    <Text style={styles.feedbackDate}>{formatReviewedDate(feedback.reviewedDate)}</Text>
                    <Text style={styles.feedbackOpen}>Review equipment  &gt;</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ) : null}

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

type StatTone = 'default' | 'progress' | 'hold' | 'pending' | 'review' | 'action' | 'approved';

const STAT_TONES: Record<StatTone, {backgroundColor: string; borderColor: string; color: string}> = {
  default: {backgroundColor: '#ffffff', borderColor: '#e2e6f0', color: '#242d52'},
  progress: {backgroundColor: '#f1eaf3', borderColor: '#dbcbe5', color: '#8053a6'},
  hold: {backgroundColor: '#fff3eb', borderColor: '#f0d4c5', color: '#a14f2d'},
  pending: {backgroundColor: '#fff8e6', borderColor: '#eadcb4', color: '#8a6413'},
  review: {backgroundColor: '#edf2ff', borderColor: '#cfd9f7', color: '#4662a4'},
  action: {backgroundColor: '#fff0f1', borderColor: '#efc7cc', color: '#b43242'},
  approved: {backgroundColor: '#eaf7ef', borderColor: '#c4e4d0', color: '#237348'},
};

function DashboardStat({label, value, tone}: {label: string; value: number; tone: StatTone}) {
  const colors = STAT_TONES[tone];
  return (
    <View style={[styles.statCard, {backgroundColor: colors.backgroundColor, borderColor: colors.borderColor}]}>
      <Text style={[styles.statValue, {color: colors.color}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const formatReviewedDate = (value?: string | null) => {
  if (!value) return 'Review date not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Review date not set' : `Reviewed ${date.toLocaleDateString()}`;
};

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
  statsGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16},
  statCard: {flexGrow: 1, flexBasis: 135, minHeight: 92, borderWidth: 1, borderRadius: 8, paddingHorizontal: 15, paddingVertical: 14, justifyContent: 'center'},
  statValue: {fontSize: 25, fontWeight: '900'},
  statLabel: {fontSize: 10, lineHeight: 15, color: '#656b7f', fontWeight: '800', marginTop: 5},
  feedbackSection: {marginTop: 28},
  sectionHint: {fontSize: 11, color: '#85899a', marginTop: 3},
  actionCountBadge: {minWidth: 28, height: 28, borderRadius: 14, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fde8eb'},
  actionCountText: {fontSize: 11, color: '#b43242', fontWeight: '900'},
  feedbackList: {gap: 10},
  feedbackCard: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#efcdd1', borderLeftWidth: 4, borderLeftColor: '#c44857', borderRadius: 8, padding: 16},
  feedbackTopRow: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12},
  feedbackIdentity: {flex: 1},
  feedbackTag: {fontSize: 14, color: '#242d52', fontWeight: '900'},
  feedbackContext: {fontSize: 11, color: '#7b8092', fontWeight: '700', marginTop: 4},
  severityBadge: {borderRadius: 5, backgroundColor: '#fff0d7', paddingHorizontal: 9, paddingVertical: 5},
  severityText: {fontSize: 9, color: '#9a5b12', fontWeight: '900'},
  feedbackType: {fontSize: 11, color: '#566dbd', fontWeight: '800', marginTop: 12},
  feedbackComment: {fontSize: 13, lineHeight: 19, color: '#42475f', marginTop: 6},
  feedbackFooter: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 13, paddingTop: 11, borderTopWidth: 1, borderTopColor: '#f0e4e6'},
  feedbackDate: {fontSize: 10, color: '#8a8f9f', fontWeight: '700'},
  feedbackOpen: {fontSize: 11, color: '#4c54d9', fontWeight: '900'},
  feedbackEmpty: {minHeight: 105, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e9f6', borderRadius: 8, alignItems: 'center', justifyContent: 'center', padding: 20},
  feedbackEmptyTitle: {fontSize: 13, color: '#343851', fontWeight: '800'},
  feedbackEmptyText: {fontSize: 11, color: '#85899a', textAlign: 'center', marginTop: 5},
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
