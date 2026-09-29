import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {getApiErrorMessage} from '../api/errors';
import {
  getSurveyorProject,
  getSurveyorProjectAreas,
  getProjectAreaPhotos,
  projectStatusLabel,
  SurveyorAreaSummary,
  SurveyorProjectDetails,
} from '../api/projects';
import AuthenticatedImage from '../components/AuthenticatedImage';

type Props = {
  projectId: string;
  onBack: () => void;
  onAreaPress: (areaId: string) => void;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not set' : date.toLocaleDateString();
};

const STATUS_BADGES: Record<string, {backgroundColor: string; color: string}> = {
  assigned: {backgroundColor: '#f0eeff', color: '#718be8'},
  pending: {backgroundColor: '#fff0d7', color: '#a75a0b'},
  active: {backgroundColor: '#f0eeff', color: '#718be8'},
  'in progress': {backgroundColor: '#f1eaf3', color: '#8053a6'},
  completed: {backgroundColor: '#e5eef7', color: '#3b68aa'},
  'on hold': {backgroundColor: '#fde8e2', color: '#ba4e3c'},
};

export default function SurveyorProjectDetailsScreen({
  projectId,
  onBack,
  onAreaPress,
}: Props) {
  const [project, setProject] = useState<SurveyorProjectDetails | null>(null);
  const [areas, setAreas] = useState<SurveyorAreaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [projectResponse, areaResponse] = await Promise.all([
        getSurveyorProject(projectId),
        getSurveyorProjectAreas(projectId),
      ]);
      setProject(projectResponse.data);
      const areasWithImages = await Promise.all(
        areaResponse.data.map(async area => {
          if (area.layoutImagePath) return area;
          try {
            const photos = await getProjectAreaPhotos(projectId, area.areaId);
            return {
              ...area,
              layoutImagePath:
                photos.data?.[0]?.downloadUrl || photos.data?.[0]?.filePath,
            };
          } catch {
            return area;
          }
        }),
      );
      setAreas(areasWithImages);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, 'Could not load project details.'),
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  if (loading) {
    return <PageState message="Loading project details..." />;
  }

  if (error || !project) {
    return (
      <View style={styles.fullState}>
        <Text style={styles.stateTitle}>Project unavailable</Text>
        <Text style={styles.stateMessage}>{error}</Text>
        <View style={styles.stateActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={loadProject}>
            <Text style={styles.primaryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const status = project.status || 'Assigned';
  const statusBadge = STATUS_BADGES[status.toLowerCase()] || STATUS_BADGES.assigned;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>&lt; Back to projects</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.headerMain}>
          <Text style={styles.eyebrow}>PROJECT DETAILS</Text>
          <Text style={styles.title}>{project.projectName}</Text>
          <View style={styles.headerMeta}>
            <Text style={styles.headerMetaText}>Job {project.jobNo || 'Not set'}</Text>
            <Text style={styles.headerMetaText}>Created {formatDate(project.createdDate)}</Text>
          </View>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{projectStatusLabel(project.status)}</Text>
        </View>
      </View>

      <View style={styles.twoColumn}>
        <View style={styles.cardWide}>
          <Text style={styles.cardTitle}>Project Details</Text>
          <View style={styles.detailsGrid}>
            <Detail label="Project Name" value={project.projectName} />
            <Detail label="Sector" value={project.sector} />
            <Detail label="Job Number" value={project.jobNo} />
            <Detail label="Location" value={project.location} />
            <Detail label="Vessel / Site Name" value={project.vesselOrSiteName} />
            <Detail label="Created Date" value={formatDate(project.createdDate)} />
          </View>
        </View>

        <View style={styles.cardNarrow}>
          <Text style={styles.cardTitle}>Assigned Team</Text>
          <TeamMember role="Surveyor" name={project.assignedSurveyor} />
          <TeamMember role="QC" name={project.assignedQc} />
          <TeamMember role="Client" name={project.assignedClient} />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Project Areas</Text>
          <Text style={styles.sectionSubtitle}>Open an area to view its layout and equipment.</Text>
        </View>
        <Text style={styles.areaCount}>{areas.length} areas</Text>
      </View>

      {areas.length === 0 ? (
        <View style={styles.emptyAreas}>
          <Text style={styles.stateTitle}>No areas available</Text>
          <Text style={styles.stateMessage}>No areas have been added to this project.</Text>
        </View>
      ) : (
        <View style={styles.areaGrid}>
          {areas.map(area => (
            <View key={area.areaId} style={styles.areaCard}>
              <AuthenticatedImage path={area.layoutImagePath} style={styles.thumbnail} />
              <View style={styles.areaBody}>
                <Text style={styles.areaName}>{area.areaName}</Text>
                <Text style={styles.areaStats}>
                  {area.photoCount} photos   |   {area.equipmentCount} equipment
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => onAreaPress(area.areaId)}
                  style={styles.viewAreaButton}>
                  <Text style={styles.viewAreaText}>View Area</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function Detail({label, value}: {label: string; value?: string | null}) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'Not set'}</Text>
    </View>
  );
}

function TeamMember({role, name}: {role: string; name?: string | null}) {
  return (
    <View style={styles.teamRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(name || role).charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.teamCopy}>
        <Text style={styles.teamRole}>{role}</Text>
        <Text style={styles.teamName}>{name || 'Not assigned'}</Text>
      </View>
    </View>
  );
}

function PageState({message}: {message: string}) {
  return (
    <View style={styles.fullState}>
      <ActivityIndicator color="#8fa7f8" size="large" />
      <Text style={styles.stateMessage}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#f7f9ff'},
  content: {padding: 24, paddingBottom: 48, maxWidth: 1180, width: '100%', alignSelf: 'center'},
  backButton: {alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 8},
  backText: {color: '#8fa7f8', fontWeight: '800', fontSize: 13},
  header: {backgroundColor: '#242d52', minHeight: 155, borderRadius: 16, padding: 24, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14},
  headerMain: {flex: 1},
  eyebrow: {fontSize: 10, color: '#b8a5f8', fontWeight: '800', letterSpacing: 1.1},
  title: {color: '#fff', fontWeight: '800', fontSize: 25, marginTop: 8},
  headerMeta: {flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 15},
  headerMetaText: {fontSize: 12, color: '#e3eaff', fontWeight: '600'},
  statusBadge: {borderRadius: 16, paddingHorizontal: 11, paddingVertical: 7},
  statusText: {fontSize: 11, fontWeight: '800'},
  twoColumn: {flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 16},
  cardWide: {flex: 2, minWidth: 290, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e9f6', padding: 20},
  cardNarrow: {flex: 1, minWidth: 250, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e9f6', padding: 20},
  cardTitle: {fontSize: 16, color: '#242d52', fontWeight: '800', marginBottom: 17},
  detailsGrid: {flexDirection: 'row', flexWrap: 'wrap', rowGap: 19},
  detailItem: {width: '50%', minWidth: 150, paddingRight: 15},
  detailLabel: {fontSize: 10, fontWeight: '800', color: '#9296a6', textTransform: 'uppercase'},
  detailValue: {fontSize: 13, fontWeight: '700', color: '#3b3f59', marginTop: 5},
  teamRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#eef0f5'},
  avatar: {width: 35, height: 35, borderRadius: 18, backgroundColor: '#f0eeff', alignItems: 'center', justifyContent: 'center'},
  avatarText: {color: '#8fa7f8', fontWeight: '800', fontSize: 13},
  teamCopy: {flex: 1, marginLeft: 10},
  teamRole: {fontSize: 9, fontWeight: '800', color: '#979baa', textTransform: 'uppercase'},
  teamName: {fontSize: 13, color: '#343851', fontWeight: '700', marginTop: 3},
  sectionHeader: {marginTop: 28, marginBottom: 13, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14},
  sectionTitle: {fontSize: 18, color: '#242d52', fontWeight: '800'},
  sectionSubtitle: {fontSize: 12, color: '#838798', marginTop: 4},
  areaCount: {fontSize: 12, color: '#707589', fontWeight: '700'},
  areaGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 14},
  areaCard: {flexGrow: 1, flexBasis: 280, maxWidth: 380, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e9f6', borderRadius: 8, overflow: 'hidden'},
  thumbnail: {width: '100%', height: 132},
  areaBody: {padding: 16},
  areaName: {fontSize: 15, color: '#242d52', fontWeight: '800'},
  areaStats: {fontSize: 11, color: '#818697', marginTop: 7},
  viewAreaButton: {marginTop: 15, minHeight: 38, borderRadius: 10, backgroundColor: '#b8a5f8', alignItems: 'center', justifyContent: 'center'},
  viewAreaText: {fontSize: 12, color: '#242d52', fontWeight: '800'},
  emptyAreas: {minHeight: 170, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e9f6', alignItems: 'center', justifyContent: 'center', padding: 24},
  fullState: {flex: 1, minHeight: 400, backgroundColor: '#f7f9ff', alignItems: 'center', justifyContent: 'center', padding: 28},
  stateTitle: {fontSize: 17, color: '#242d52', fontWeight: '800'},
  stateMessage: {fontSize: 13, color: '#7d8192', lineHeight: 19, textAlign: 'center', marginTop: 10},
  stateActions: {flexDirection: 'row', gap: 10, marginTop: 18},
  primaryButton: {backgroundColor: '#b8a5f8', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10},
  primaryButtonText: {fontSize: 12, color: '#242d52', fontWeight: '800'},
  secondaryButton: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#d9dce8', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 7},
  secondaryButtonText: {fontSize: 12, color: '#424760', fontWeight: '800'},
});
