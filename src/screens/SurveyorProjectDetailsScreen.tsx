import ReportWorkflowPanel from '../components/ReportWorkflowPanel';
import {isPdfFile} from '../utils/isPdfFile';
import ProjectWorkSchedulePanel from '../components/ProjectWorkSchedulePanel';
import HaerAreaManager from '../components/HaerAreaManager';
import ProjectImageGallery from '../components/ProjectImageGallery';
import {Colors, LIGHT} from '../theme/palette';
import {OPERATIONS_DARK} from '../theme/operationsPalette';
import {visual} from '../theme/visual';
import {projectDisplay} from '../utils/projectDisplay';
import {useThemeMode} from '../theme/useThemeMode';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {getApiErrorMessage} from '../api/errors';
import {
  AreaEquipment,
  getSurveyorProject,
  getSurveyorProjectAreas,
  getSurveyorEquipment,
  getProjectAreaPhotos,
  SurveyorAreaSummary,
  SurveyorProjectDetails,
} from '../api/projects';
import AuthenticatedImage from '../components/AuthenticatedImage';

type Props = {
  projectId: string;
  onBack: () => void;
  onAreaPress: (areaId: string) => void;
  onEquipmentPress: (areaId: string, equipmentId: string) => void;
  refreshVersion?: number;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not set' : `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

const formatInspectionStatus = (value?: string | null) => {
  const status = value || 'NotStarted';
  if (status === 'NotStarted') return 'Pending Inspection';
  if (status === 'QcApproved') return 'QC Approved';
  return status.replace(/([a-z])([A-Z])/g, '$1 $2');
};

const STATUS_BADGES: Record<string, {backgroundColor: string; color: string}> = {
  assigned: {backgroundColor: '#e3eff1', color: '#718be8'},
  pending: {backgroundColor: '#fff0d7', color: '#a75a0b'},
  active: {backgroundColor: '#e3eff1', color: '#718be8'},
  'in progress': {backgroundColor: '#f1eaf3', color: '#8053a6'},
  completed: {backgroundColor: '#e5eef7', color: '#3b68aa'},
  'on hold': {backgroundColor: '#fde8e2', color: '#ba4e3c'},
};

export default function SurveyorProjectDetailsScreen({
  projectId,
  onBack,
  onAreaPress,
  onEquipmentPress,
  refreshVersion,
}: Props) {
  const colors = useThemeMode() === 'dark' ? OPERATIONS_DARK : LIGHT;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [manageAreas,setManageAreas] = useState(false);
  const [areaImages,setAreaImages] = useState<Record<string,string[]>>({});
  const [project, setProject] = useState<SurveyorProjectDetails | null>(null);
  const [areas, setAreas] = useState<SurveyorAreaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [equipmentByArea, setEquipmentByArea] = useState<
    Record<string, AreaEquipment[]>
  >({});
  const [areasExpanded, setAreasExpanded] = useState(false);
  const [equipmentExpanded, setEquipmentExpanded] = useState(false);
  const [expandedEquipmentAreaId, setExpandedEquipmentAreaId] = useState<
    string | null
  >(null);

  const loadProject = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [projectResponse, areaResponse] = await Promise.all([
        getSurveyorProject(projectId),
        getSurveyorProjectAreas(projectId),
      ]);
      setProject(projectResponse.data);
      const loadedAreas = await Promise.all(
        areaResponse.data.map(async area => {
          const [photos, equipment] = await Promise.all([
            getProjectAreaPhotos(projectId, area.areaId).catch(() => null),
            getSurveyorEquipment(projectId, area.areaId),
          ]);
          return {
            area: {
              ...area,
              layoutImagePath:
                area.layoutImagePath ||
                photos?.data?.find(photo => !isPdfFile(photo.fileName))?.downloadUrl ||
                photos?.data?.find(photo => !isPdfFile(photo.fileName))?.filePath,
            },
            images: (photos?.data ?? []).filter(photo => !isPdfFile(photo.fileName)).map(photo=>photo.downloadUrl || photo.filePath).filter((path): path is string => !!path),
            equipment: equipment.data,
          };
        }),
      );
      setAreas(loadedAreas.map(item => item.area));
      setAreaImages(Object.fromEntries(loadedAreas.map(item=>[item.area.areaId,item.images])));
      setEquipmentByArea(
        Object.fromEntries(
          loadedAreas.map(item => [item.area.areaId, item.equipment]),
        ),
      );
      setExpandedEquipmentAreaId(null);
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
  }, [loadProject, refreshVersion]);

  if (loading) {
    return <PageState styles={styles} message="Loading project details..." />;
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
          <TouchableOpacity style={styles.primaryButton} onPress={()=>void loadProject()}>
            <Text style={styles.primaryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const status = project.status || 'Assigned';
  const statusBadge = STATUS_BADGES[status.toLowerCase()] || STATUS_BADGES.assigned;
  const totalEquipment = Object.values(equipmentByArea).reduce(
    (total, equipment) => total + equipment.length,
    0,
  );

  const toggleEquipmentArea = (areaId: string) => {
    setExpandedEquipmentAreaId(current => current === areaId ? null : areaId);
  };

  return (
    <ScrollView nativeID="ex-view-project" style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>&lt; Back to projects</Text>
      </TouchableOpacity>

      <View nativeID="ex-view-project-hero" style={styles.header}>
        <Image source={require('../assets/landing/industry-3.jpg')} resizeMode="cover" style={styles.heroPhoto} accessible={false} />
        <View nativeID="ex-operations-hero-overlay" pointerEvents="none"
          style={[StyleSheet.absoluteFill, Platform.OS !== 'web' && styles.nativeOverlay]} />
        <View style={styles.headerMain}>
          <Text style={styles.eyebrow}>PROJECT DETAILS</Text>
          <Text accessibilityRole="header" style={styles.title}>{projectDisplay(project.projectName)}</Text>
          <View style={styles.headerMeta}>
            <Text style={styles.headerMetaText}>Job {projectDisplay(project.jobNo) || 'Not set'}</Text>
            <Text style={styles.headerMetaText}>Created {formatDate(project.createdDate)}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, {backgroundColor: statusBadge.backgroundColor}]}>
          <Text style={[styles.statusText, {color: statusBadge.color}]}>{status}</Text>
        </View>
      </View>

      <ReportWorkflowPanel projectId={projectId} readOnly compact/>
      <ProjectWorkSchedulePanel projectId={projectId} projectName={project.projectName} editable overview />

      <View style={styles.twoColumn}>
        <View testID="project-view-card" style={styles.cardWide}>
          <Text style={styles.cardTitle}>Project Details</Text>
          <View style={styles.detailsGrid}>
            <Detail styles={styles} label="Project Name" value={projectDisplay(project.projectName)} />
            <Detail styles={styles} label="Job Number" value={projectDisplay(project.jobNo)} />
            <Detail styles={styles} label="Location" value={projectDisplay(project.location)} />
            <Detail styles={styles} label="Vessel / Site Name" value={projectDisplay(project.vesselOrSiteName)} />
            <Detail styles={styles} label="Created Date" value={formatDate(project.createdDate)} />
          </View>
        </View>

        <View testID="project-view-card" style={styles.cardNarrow}>
          <Text style={styles.cardTitle}>Assigned Team</Text>
          <TeamMember styles={styles} role="Surveyor" name={project.assignedSurveyor} />
          <TeamMember styles={styles} role="QC" name={project.assignedQc} />
          <TeamMember styles={styles} role="Client" name={project.assignedClient} />
        </View>
      </View>

      <View style={styles.accordions}>
        <View testID="project-view-card" style={styles.accordionSection}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{expanded: areasExpanded}}
            onPress={() => setAreasExpanded(current => !current)}
            style={styles.accordionHeader}>
            <View style={styles.accordionHeading}>
              <Text style={styles.chevron}>{areasExpanded ? 'v' : '>'}</Text>
              <Text style={styles.sectionTitle}>Project Areas</Text>
            </View>
            <Text style={styles.sectionCount}>{areas.length}</Text>
          </TouchableOpacity>

          <TouchableOpacity accessibilityRole="button" onPress={()=>{setAreasExpanded(true);setManageAreas(true);}} style={{padding:10}}>
            <Text style={{color:colors.cyan,fontWeight:'800'}}>+ Add Area</Text>
          </TouchableOpacity>
          {areasExpanded && (
            <View style={styles.accordionContent}>
              {areas.length === 0 ? (
                <View style={styles.emptyAreas}>
                  <Text style={styles.stateTitle}>No areas available</Text>
                  <Text style={styles.stateMessage}>
                    No areas have been added to this project.
                  </Text>
                </View>
              ) : (
                <View style={styles.areaGrid}>
                  {areas.map(area => (
                    <View key={area.areaId} style={styles.areaCard}>
                      <AuthenticatedImage
                        path={area.layoutImagePath}
                        style={styles.thumbnail}
                      />
                      {(areaImages[area.areaId]?.length ?? 0)>1 && <ScrollView horizontal style={{maxHeight:66}}>
                        {areaImages[area.areaId].map((path,index)=><AuthenticatedImage key={index} path={path} style={{width:84,height:60,marginRight:5}}/>)}
                      </ScrollView>}
                      <View style={styles.areaBody}>
                        <Text style={styles.areaName}>{projectDisplay(area.areaName)}</Text>
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
            </View>
          )}
        </View>

        <View testID="project-view-card" style={styles.accordionSection}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{expanded: equipmentExpanded}}
            onPress={() => {
              setEquipmentExpanded(current => !current);
              setExpandedEquipmentAreaId(null);
            }}
            style={styles.accordionHeader}>
            <View style={styles.accordionHeading}>
              <Text style={styles.chevron}>{equipmentExpanded ? 'v' : '>'}</Text>
              <Text style={styles.sectionTitle}>All Equipment</Text>
            </View>
            <Text style={styles.sectionCount}>{totalEquipment}</Text>
          </TouchableOpacity>

          {equipmentExpanded && (
            <View style={styles.equipmentGroups}>
              {areas.length === 0 ? (
                <Text style={styles.emptyInline}>No equipment areas available.</Text>
              ) : (
                areas.map(area => {
                  const areaEquipment = equipmentByArea[area.areaId] || [];
                  const areaOpen = expandedEquipmentAreaId === area.areaId;
                  return (
                    <View key={area.areaId} style={styles.equipmentGroup}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityState={{expanded: areaOpen}}
                        onPress={() => toggleEquipmentArea(area.areaId)}
                        style={styles.equipmentGroupHeader}>
                        <View style={styles.accordionHeading}>
                          <Text style={styles.smallChevron}>{areaOpen ? 'v' : '>'}</Text>
                          <Text style={styles.equipmentAreaName}>{projectDisplay(area.areaName)}</Text>
                        </View>
                        <Text style={styles.equipmentAreaCount}>{areaEquipment.length}</Text>
                      </TouchableOpacity>

                      {areaOpen && (
                        <View style={styles.equipmentList}>
                          {areaEquipment.length === 0 ? (
                            <Text style={styles.emptyInline}>No equipment in this area.</Text>
                          ) : (
                            <View style={styles.equipmentCardGrid}>
                              {areaEquipment.map(equipment => (
                                <TouchableOpacity
                                  key={equipment.id}
                                  accessibilityRole="button"
                                  onPress={() => onEquipmentPress(area.areaId, equipment.id)}
                                  style={styles.equipmentCard}>
                                  <View style={styles.equipmentSequence}>
                                    <Text style={styles.equipmentSequenceText}>
                                      {equipment.markingNo ?? equipment.sequenceNo}
                                    </Text>
                                  </View>
                                  <View style={styles.equipmentCardBody}>
                                    <Text style={styles.equipmentTag}>{equipment.tagNumber}</Text>
                                    <Text style={styles.equipmentType}>{equipment.type}</Text>
                                    <Text style={styles.equipmentMeta}>
                                      {equipment.equipmentId || 'No equipment ID'}
                                    </Text>
                                    <Text style={styles.equipmentMeta}>
                                      {equipment.location || 'Location not set'}
                                    </Text>
                                    <Text style={styles.equipmentMeta}>
                                      {equipment.manufacturer || 'Manufacturer not set'}
                                    </Text>
                                  </View>
                                  <View style={styles.inspectionStatus}>
                                    <Text style={styles.inspectionStatusText}>
                                      {formatInspectionStatus(equipment.status)}
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>
      </View>
      <View nativeID="ex-view-project-layouts">
        <ProjectImageGallery key={projectId} projectId={projectId} editable />
      </View>
      {manageAreas && <HaerAreaManager project={{id:projectId,projectName:project.projectName,areas:areas.map(a=>({id:a.areaId,areaName:a.areaName}))}}
        canEdit={false} colors={colors} onClose={()=>setManageAreas(false)} onAreaSaved={()=>{}} onSaved={()=>void loadProject(true)}/>}
    </ScrollView>
  );
}

function Detail({styles, label, value}: {styles: ReturnType<typeof makeStyles>; label: string; value?: string | null}) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'Not set'}</Text>
    </View>
  );
}

function TeamMember({styles, role, name}: {styles: ReturnType<typeof makeStyles>; role: string; name?: string | null}) {
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

function PageState({styles, message}: {styles: ReturnType<typeof makeStyles>; message: string}) {
  return (
    <View style={styles.fullState}>
      <ActivityIndicator color="#8fa7f8" size="large" />
      <Text style={styles.stateMessage}>{message}</Text>
    </View>
  );
}

const makeStyles = (c: Colors) => StyleSheet.create({
  screen: {flex: 1, backgroundColor: c.bg},
  content: {padding: 16, paddingBottom: 32, gap: 12, width: '100%', alignSelf: 'center'},
  backButton: {alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 8},
  backText: {color: c.cyan, fontWeight: '800', fontSize: 13},
  heroPhoto: {position: 'absolute', right: 0, width: '76%', height: '100%'},
  nativeOverlay: {backgroundColor: '#03192C88'},
  header: {overflow: 'hidden', borderWidth: 1, borderColor: '#126078', backgroundColor: '#03192C', minHeight: 128, borderRadius: 16, padding: 24, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14},
  headerMain: {flex: 1, minWidth: 0},
  eyebrow: {fontSize: 10, color: '#8ed8d2', fontWeight: '800', letterSpacing: 1.1},
  title: {fontFamily: visual.display, color: '#fff', fontWeight: '900', fontSize: 30, marginTop: 8},
  headerMeta: {flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 15},
  headerMetaText: {fontSize: 12, color: '#dceef1', fontWeight: '600'},
  statusBadge: {borderRadius: 16, paddingHorizontal: 11, paddingVertical: 7},
  statusText: {fontSize: 11, fontWeight: '800'},
  twoColumn: {flexDirection: 'row', flexWrap: 'wrap', gap: 14},
  cardWide: {flexGrow: 2, flexBasis: 310, backgroundColor: c.card, borderRadius: 8, borderWidth: 1, borderColor: c.border, padding: 20},
  cardNarrow: {flexGrow: 1, flexBasis: 250, backgroundColor: c.card, borderRadius: 8, borderWidth: 1, borderColor: c.border, padding: 20},
  cardTitle: {fontSize: 16, color: c.text, fontWeight: '800', marginBottom: 17},
  detailsGrid: {flexDirection: 'row', flexWrap: 'wrap', rowGap: 19},
  detailItem: {width: '50%', minWidth: 150, paddingRight: 15},
  detailLabel: {fontSize: 10, fontWeight: '800', color: c.secondary, textTransform: 'uppercase'},
  detailValue: {fontSize: 13, fontWeight: '700', color: c.text, marginTop: 5},
  teamRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.border},
  avatar: {width: 35, height: 35, borderRadius: 18, backgroundColor: c.elevated, alignItems: 'center', justifyContent: 'center'},
  avatarText: {color: c.cyan, fontWeight: '800', fontSize: 13},
  teamCopy: {flex: 1, marginLeft: 10},
  teamRole: {fontSize: 9, fontWeight: '800', color: c.secondary, textTransform: 'uppercase'},
  teamName: {fontSize: 13, color: c.text, fontWeight: '700', marginTop: 3},
  sectionTitle: {fontSize: 18, color: c.text, fontWeight: '800'},
  accordions: {gap: 12},
  accordionSection: {backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 8, overflow: 'hidden'},
  accordionHeader: {minHeight: 62, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
  accordionHeading: {flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10},
  accordionContent: {borderTopWidth: 1, borderTopColor: c.border, padding: 16},
  chevron: {width: 16, fontSize: 16, color: c.cyan, fontWeight: '800'},
  smallChevron: {width: 14, fontSize: 13, color: c.cyan, fontWeight: '800'},
  sectionCount: {minWidth: 28, textAlign: 'center', fontSize: 12, color: c.text, fontWeight: '800', backgroundColor: c.elevated, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4},
  areaGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 14},
  areaCard: {flexGrow: 1, flexBasis: 280, maxWidth: 380, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 8, overflow: 'hidden'},
  thumbnail: {width: '100%', height: 132},
  areaBody: {padding: 16},
  areaName: {fontSize: 15, color: c.text, fontWeight: '800'},
  areaStats: {fontSize: 11, color: c.secondary, marginTop: 7},
  viewAreaButton: {marginTop: 15, minHeight: 38, borderRadius: 10, backgroundColor: '#8ed8d2', alignItems: 'center', justifyContent: 'center'},
  viewAreaText: {fontSize: 12, color: '#03192C', fontWeight: '800'},
  emptyAreas: {minHeight: 170, backgroundColor: c.card, borderRadius: 8, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', padding: 24},
  equipmentGroups: {borderTopWidth: 1, borderTopColor: c.border},
  equipmentGroup: {borderBottomWidth: 1, borderBottomColor: c.border},
  equipmentGroupHeader: {minHeight: 52, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: c.elevated},
  equipmentAreaName: {fontSize: 13, color: c.text, fontWeight: '800'},
  equipmentAreaCount: {fontSize: 11, color: c.secondary, fontWeight: '800'},
  equipmentList: {paddingHorizontal: 18, paddingBottom: 10},
  equipmentCardGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 12},
  equipmentCard: {flexGrow: 1, flexBasis: 270, maxWidth: 360, minHeight: 150, borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 14, backgroundColor: c.card, flexDirection: 'row', alignItems: 'flex-start', gap: 12},
  equipmentSequence: {width: 38, height: 38, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: c.elevated},
  equipmentSequenceText: {fontSize: 15, color: c.cyan, fontWeight: '900'},
  equipmentCardBody: {flex: 1},
  equipmentTag: {fontSize: 15, color: c.text, fontWeight: '800'},
  equipmentType: {fontSize: 12, color: c.cyan, fontWeight: '700', marginTop: 4},
  equipmentMeta: {fontSize: 10, color: c.secondary, marginTop: 5},
  inspectionStatus: {position: 'absolute', right: 10, bottom: 10, backgroundColor: c.bg, borderRadius: 11, paddingHorizontal: 8, paddingVertical: 4},
  inspectionStatusText: {fontSize: 9, color: c.secondary, fontWeight: '800'},
  emptyInline: {fontSize: 12, color: c.secondary, paddingHorizontal: 18, paddingVertical: 18},
  fullState: {flex: 1, minHeight: 400, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 28},
  stateTitle: {fontSize: 17, color: c.text, fontWeight: '800'},
  stateMessage: {fontSize: 13, color: c.secondary, lineHeight: 19, textAlign: 'center', marginTop: 10},
  stateActions: {flexDirection: 'row', gap: 10, marginTop: 18},
  primaryButton: {backgroundColor: '#8ed8d2', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10},
  primaryButtonText: {fontSize: 12, color: '#03192C', fontWeight: '800'},
  secondaryButton: {backgroundColor: c.card, borderWidth: 1, borderColor: c.border, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 7},
  secondaryButtonText: {fontSize: 12, color: c.text, fontWeight: '800'},
});
