import ReportWorkflowPanel from '../components/ReportWorkflowPanel';
import {isPdfFile} from '../utils/isPdfFile';
import {projectDisplay} from '../utils/projectDisplay';
import ProjectWorkSchedulePanel from '../components/ProjectWorkSchedulePanel';
import ProjectImageGallery from '../components/ProjectImageGallery';
import OurCompanySection from '../components/OurCompanySection';
import ClientDetailsSection from '../components/ClientDetailsSection';
import DeleteProjectButton from '../components/DeleteProjectButton';
import ZoomableImageViewer from '../components/ZoomableImageViewer';
import HazardousAreaPlanSection from '../components/HazardousAreaPlanSection';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Image, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions} from 'react-native';
import {getApiErrorMessage} from '../api/errors';
import {getProject, getQcProject, updateProject} from '../api/projects';
import AuthenticatedImage from '../components/AuthenticatedImage';
import ProjectDetailModal from '../components/ProjectDetailModal';
import {Colors, LIGHT, tint} from '../theme/palette';
import {OPERATIONS_DARK} from '../theme/operationsPalette';
import {useThemeMode} from '../theme/useThemeMode';
import {visual} from '../theme/visual';

const OFFSHORE_ART = require('../assets/landing/industry-3.jpg');

type UserOption = {id: string; displayName: string; managerId?: string | null; managerName?: string | null};
type Props = {
  backLabel?: string;
  userRole?: string;
  projectId: string;
  onBack: () => void;
  onEdit?: () => void;
  onQcReview?: () => void;
  editOnly?: boolean;
  surveyors: UserOption[];
  qcUsers: UserOption[];
  clients: UserOption[];
};
const first = (obj: any, ...keys: string[]) => {
  for (const key of keys) if (obj?.[key] !== undefined && obj?.[key] !== null) return obj[key];
  return undefined;
};
const dateLabel = (value: any) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export default function ProjectDetailsScreen({userRole, projectId, onBack, backLabel = 'Back to projects', onEdit, onQcReview, editOnly = false, surveyors, qcUsers, clients}: Props) {
  const isQc = userRole?.toLowerCase() === 'qc';
  const colors = useThemeMode() === 'dark' ? OPERATIONS_DARK : LIGHT;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {width} = useWindowDimensions();
  const compact = width < 780;
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [viewingArea, setViewingArea] = useState<any>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [selectedAreaName, setSelectedAreaName] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getProject(projectId);
      // QC cannot read the global team-assignment directory. Reuse its scoped project summary.
      const qcDetails = isQc ? await getQcProject(projectId).then(r => r.data).catch(() => undefined) : undefined;
      setProject({...response.data, qcDetails});
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not load project details.'));
    } finally { setLoading(false); }
  }, [projectId, isQc]);
  useEffect(() => { load(); }, [load]);

  const save = async (data: any) => {
    setSaving(true);
    try {
      await updateProject(projectId, data);
      if (editOnly) onBack();
      else {setEditing(false); await load();}
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not save project changes.'));
    } finally { setSaving(false); }
  };

  if (loading) return <View style={styles.state}><ActivityIndicator color="#8fa7f8" /><Text style={styles.stateText}>Loading project details…</Text></View>;
  if (!project) return <View style={styles.state}><Text style={styles.stateTitle}>Project unavailable</Text><Text style={styles.stateText}>{error}</Text><TouchableOpacity onPress={load} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Try again</Text></TouchableOpacity><TouchableOpacity onPress={onBack} style={styles.backAction}><Text style={styles.backText}>{backLabel}</Text></TouchableOpacity></View>;

  if (!isQc && (editing || editOnly)) return <ProjectDetailModal fullPage saveError={error} userRole={userRole} onDeleted={onBack} visible project={project} onClose={editOnly ? onBack : () => {setEditing(false); void load();}} onSave={save} surveyors={surveyors} qcUsers={qcUsers} clients={clients} loading={saving} />;

  const areas: any[] = Array.isArray(project.areas) ? project.areas : [];
  const status = String(first(project, 'status', 'projectStatus') || 'Pending').replace(/([a-z])([A-Z])/g, '$1 $2');
  const statusStyle = status.toLowerCase().includes('progress') || status.toLowerCase().includes('active')
    ? {backgroundColor: '#e3eff1', color: '#718be8'}
    : status.toLowerCase().includes('complete')
      ? {backgroundColor: '#e5eef7', color: '#3b68aa'}
      : status.toLowerCase().includes('hold')
        ? {backgroundColor: '#fde8e2', color: '#ba4e3c'}
        : {backgroundColor: '#fff0d7', color: '#a75a0b'};
  const assignedName = (id: string, people: UserOption[]) => people.find(person => person.id === id)?.displayName || 'Not assigned';
  const projectName = projectDisplay(String(project.projectName || ''));
  const nameBreak = projectName.lastIndexOf(' ');
  const projectEquipment = areas.flatMap(area => Array.isArray(area.equipment) ? area.equipment : []);
  const inspectedCount = projectEquipment.filter(item => ['Completed','PendingQcReview','Approved','QcApproved'].includes(item.inspectionStatus)).length;
  const inspectedPercent = projectEquipment.length ? Math.round(inspectedCount / projectEquipment.length * 100) : 0;

  return <>
    <ScrollView nativeID="ex-view-project" style={styles.screen} contentContainerStyle={[styles.content, compact && styles.compactContent]}>
      <TouchableOpacity accessibilityRole="button" onPress={onBack} style={styles.back}><Text style={styles.backText}>‹ {backLabel}</Text></TouchableOpacity>
      <View nativeID="ex-view-project-hero" style={[styles.hero, compact && styles.compactHero]}>
        <Image source={OFFSHORE_ART} resizeMode="cover" style={styles.heroPhoto} accessible={false} />
        <View nativeID="ex-operations-hero-overlay" pointerEvents="none"
          style={[StyleSheet.absoluteFill, Platform.OS !== 'web' && styles.nativeOverlay]} />
        <View style={{flex: 1, minWidth: 0}}>
          <Text style={styles.eyebrow}>PROJECT DETAILS</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {nameBreak < 0 ? projectName : <>{projectName.slice(0, nameBreak + 1)}<Text style={{color: '#00D9EE'}}>{projectName.slice(nameBreak + 1)}</Text></>}
          </Text>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaText}>Job: {projectDisplay(project.jobNo) || 'Not set'}</Text>
            <Text style={styles.heroMetaText}>Created: {dateLabel(project.createdAt)}</Text>
          </View>
        </View>
        <View style={styles.heroActions}><View style={[styles.statusBadge, {backgroundColor: statusStyle.backgroundColor}]}><Text style={[styles.statusText, {color: statusStyle.color}]}>{status}</Text></View>{!isQc && <TouchableOpacity accessibilityRole="button" onPress={onEdit ?? (() => setEditing(true))} style={styles.editButton}><Text style={styles.editText}>Edit project</Text></TouchableOpacity>}{isQc && onQcReview && <TouchableOpacity accessibilityRole="button" onPress={onQcReview} style={styles.editButton}><Text style={styles.editText}>QC Inspection Review</Text></TouchableOpacity>}<DeleteProjectButton userRole={userRole} projectId={projectId} projectName={project.projectName} onDeleted={onBack} /></View>
      </View>
      {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
      <ReportWorkflowPanel projectId={projectId} readOnly compact/>
      <ProjectWorkSchedulePanel projectId={projectId} projectName={project.projectName} overview />
      <View testID="project-view-card" style={styles.detailsCard}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Inspection Progress</Text>
        <Text style={styles.detailValue}>{inspectedCount} / {projectEquipment.length} equipment inspected · {inspectedPercent}%</Text>
        <View accessibilityRole="progressbar" accessibilityLabel="Equipment inspection progress" accessibilityValue={{min: 0, max: 100, now: inspectedPercent}}
          style={{height: 7, marginTop: 12, borderRadius: 4, backgroundColor: colors.elevated, overflow: 'hidden'}}>
          <View style={{height: '100%', width: `${inspectedPercent}%`, backgroundColor: colors.success}} />
        </View>
      </View>
      <View style={[styles.columns, compact && styles.stack]}>
        <View testID="project-view-card" style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Project Details</Text>
          <View style={styles.detailsGrid}>
            <Detail styles={styles} label="Project Name" value={projectDisplay(project.projectName)} />
            <Detail styles={styles} label="Job Number" value={projectDisplay(project.jobNo)} />
            <Detail styles={styles} label="Location" value={projectDisplay(project.location)} />
            <Detail styles={styles} label="Vessel / Site Name" value={projectDisplay(project.vesselOrSiteName)} />
            <Detail styles={styles} label="UID Number" value={project.uidNumber} /><Detail styles={styles} label="Document Number" value={project.documentNumber} /><Detail styles={styles} label="Revision" value={project.revision} /><Detail styles={styles} label="Description" value={project.description} />
            <Detail styles={styles} label="Created Date" value={dateLabel(project.createdAt)} />
            <Detail styles={styles} label="Last Updated" value={dateLabel(project.updatedAt)} />
          </View>
        </View>
        <View testID="project-view-card" style={styles.teamCard}>
          <Text style={styles.sectionTitle}>Assigned Team</Text>
          <TeamMember styles={styles} role="Surveyor" name={project.qcDetails?.assignedSurveyor || assignedName(project.assignedSurveyorId, surveyors)} />
          <TeamMember styles={styles} role="QC" name={project.qcDetails?.assignedQc || assignedName(project.assignedQcId, qcUsers)} />
          {(project.assignedClientIds?.length ? project.assignedClientIds : project.assignedClientId ? [project.assignedClientId] : []).map((id: string) => <TeamMember key={id} styles={styles} role="Client" name={project.assignedClients?.find((c: {id: string; displayName: string}) => c.id === id)?.displayName || assignedName(id, clients)} />)}
          {!project.assignedClientIds?.length && !project.assignedClientId && <TeamMember styles={styles} role="Client" name="Not assigned" />}
        </View>
      </View>
      <View nativeID="ex-view-project-company" testID="project-view-card" style={styles.detailsCard}><Text accessibilityRole="header" style={styles.sectionTitle}>Our Company Details</Text><OurCompanySection value={project.ourCompanyId} existing={project.ourCompany} /></View>
      <View nativeID="ex-view-project-client" testID="project-view-card" style={styles.detailsCard}><Text accessibilityRole="header" style={styles.sectionTitle}>Client Company Details</Text><ClientDetailsSection name={project.clientName || ''} existingPath={project.clientLogoPath} /></View>
      <View nativeID="ex-view-project-plan" testID="project-view-card" style={styles.detailsCard}><HazardousAreaPlanSection key={project.hazardousAreaPlanPath || 'no-plan'} project={project} /></View>
      <View nativeID="ex-view-project-layouts">
        <ProjectImageGallery key={projectId} projectId={projectId} editable={['admin','manager','surveyor'].includes(userRole?.toLowerCase() ?? '')}/>
      </View>
      <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Project Areas</Text><Text style={styles.sectionHint}>Area layouts and equipment totals</Text></View><Text style={styles.areaCount}>{areas.length} areas</Text></View>
      {areas.length === 0 ? <View style={styles.empty}><Text style={styles.sectionTitle}>No areas added</Text><Text style={styles.sectionHint}>{isQc ? 'No project areas have been registered.' : 'Use Edit project to add areas.'}</Text></View> : <View style={styles.projectAreaList}>{areas.map((area: any, index: number) => {
        const photos = Array.isArray(area.photos) ? area.photos : [];
        const photoUrl = photos.filter((photo: any) => !isPdfFile(photo.fileName)).map((photo: any) => first(photo, 'downloadUrl')).find(Boolean);
        const layoutPath = first(area, 'layoutImagePath', 'drawingPath');
        const path = photoUrl || (typeof layoutPath === 'string' && (/^https?:\/\//i.test(layoutPath) || layoutPath.startsWith('/api/')) ? layoutPath : undefined);
        const areaId = String(first(area, 'id', 'areaId') || index);
        const equipment: any[] = Array.isArray(area.equipment) ? area.equipment : [];
        return <View key={areaId} style={[styles.projectAreaRow, compact && styles.stack]}>
          <View testID="project-view-card" style={[styles.areaCard, compact && styles.fullWidth]}>
            <AuthenticatedImage path={path} style={styles.areaImage} resizeMode="cover" />
            <View style={styles.areaBody}><Text style={styles.areaName}>{projectDisplay(first(area, 'areaName', 'name')) || `Area ${index + 1}`}</Text><Text style={styles.areaMeta}>{photos.length} photos  |  {first(area, 'equipmentCount') ?? equipment.length} equipment</Text>
              <TouchableOpacity accessibilityRole="button" onPress={() => setViewingArea({...area, id:areaId, imagePath: path})} style={styles.viewAreaButton}><Text style={styles.viewAreaText}>View Area</Text></TouchableOpacity>
            </View>
          </View>
          <View testID="project-view-card" style={styles.projectEquipmentPanel}>
            <View style={styles.equipmentPanelHeader}><Text style={styles.sectionTitle}>Equipment</Text><Text style={styles.areaMeta}>{equipment.length} total</Text></View>
            {equipment.length === 0 ? <Text style={styles.emptyEquipmentText}>No equipment in this area.</Text> : equipment.map((item: any, itemIndex: number) => <TouchableOpacity key={item.id || itemIndex} activeOpacity={0.85} style={styles.equipmentSummaryRow} onPress={() => { setSelectedEquipment(item); setSelectedAreaName(String(first(area, 'areaName', 'name') || `Area ${index + 1}`)); }}>
              <View style={styles.summaryNumber}><Text style={styles.summaryNumberText}>{item.markingNo ?? item.sequenceNo ?? itemIndex + 1}</Text></View>
              <View style={styles.summaryCopy}><Text numberOfLines={1} style={styles.summaryTag}>{item.tagNumber || `Equipment ${itemIndex + 1}`}</Text><Text numberOfLines={1} style={styles.summaryMeta}>{[item.type, item.equipmentCode, item.location].filter(Boolean).join(' · ') || 'Equipment details'}</Text>{item.rfidTagUid ? <Text numberOfLines={1} style={styles.summaryMeta}>RFID: {item.rfidTagUid}</Text> : null}</View>
              <View style={[styles.summaryStatus,
                ['Completed', 'Approved'].includes(inspectionStatusLabel(item.inspectionStatus)) && {backgroundColor: tint(colors.success, '26'), borderColor: colors.success}]}>
                <Text style={styles.summaryStatusText}>{inspectionStatusLabel(item.inspectionStatus)}</Text></View><Text style={styles.summaryArrow}>›</Text>
            </TouchableOpacity>)}
          </View>
        </View>;
      })}</View>}
    </ScrollView>
    <AreaDetailsModal styles={styles} projectId={projectId} area={viewingArea} onClose={() => setViewingArea(null)} />
    <EquipmentDetailsModal styles={styles} equipment={selectedEquipment} areaName={selectedAreaName} onClose={() => setSelectedEquipment(null)} />
  </>;
}

const inspectionStatusLabel = (value: any) => {
  const status = String(value || 'NotStarted').replace(/([a-z])([A-Z])/g, '$1 $2');
  if (status === 'Not Started') return 'Pending Inspection';
  if (status === 'Qc Approved') return 'Approved';
  if (status === 'Changes Requested') return 'Changes Required';
  return status;
};

function EquipmentDetailsModal({styles, equipment, areaName, onClose}: {styles: ViewStyles; equipment: any; areaName: string; onClose: () => void}) {
  if (!equipment) return null;
  const status = inspectionStatusLabel(equipment.inspectionStatus);
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.equipmentModalBackdrop}><ScrollView style={styles.equipmentDetailsModal} contentContainerStyle={styles.equipmentDetailsContent}>
      <TouchableOpacity onPress={onClose} style={styles.backToProject}><Text style={styles.backText}>‹ Back to project</Text></TouchableOpacity>
      <View style={styles.equipmentDetailsHero}><View style={styles.equipmentDetailsSequence}><Text style={styles.equipmentDetailsSequenceText}>{equipment.markingNo ?? equipment.sequenceNo}</Text></View><View style={{flex: 1}}><Text style={styles.eyebrow}>EQUIPMENT DETAILS</Text><Text style={styles.equipmentDetailsTitle}>{equipment.tagNumber}</Text><Text style={styles.equipmentDetailsSubtitle}>{equipment.type || '—'} | {areaName}</Text></View><View style={styles.equipmentDetailsStatus}><Text style={styles.equipmentDetailsStatusText}>{status}</Text></View></View>
      <View style={styles.equipmentDetailsCard}><Text style={styles.sectionTitle}>Equipment Information</Text><View style={styles.detailsGrid}>
        <Detail styles={styles} label="Area Marking No" value={equipment.markingNo ?? equipment.sequenceNo} /><Detail styles={styles} label="HAER Sl. No" value={equipment.sequenceNo} /><Detail styles={styles} label="Tag Number" value={equipment.tagNumber} /><Detail styles={styles} label="Equipment ID" value={equipment.equipmentCode} /><Detail styles={styles} label="RFID Tag UID" value={equipment.rfidTagUid} /><Detail styles={styles} label="Type" value={equipment.type} /><Detail styles={styles} label="Circuit ID" value={equipment.circuitId} /><Detail styles={styles} label="Location" value={equipment.location} /><Detail styles={styles} label="Manufacturer" value={equipment.manufacturer} /><Detail styles={styles} label="Protection Details" value={equipment.protectionDetails} /><Detail styles={styles} label="Certificate Number" value={equipment.certificateNumber} /><Detail styles={styles} label="Area Name" value={areaName} /><Detail styles={styles} label="Created Date" value={dateLabel(equipment.createdAt)} /><Detail styles={styles} label="Inspection Status" value={status} />
      </View></View>
    </ScrollView></View>
  </Modal>;
}
function AreaDetailsModal({styles, area, projectId, onClose}: {styles: ViewStyles; area: any; projectId:string; onClose: () => void}) {
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [viewingLayout, setViewingLayout] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  if (!area) return null;
  const equipment: any[] = Array.isArray(area.equipment) ? area.equipment : [];
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.areaModalBackdrop}>
      <View style={styles.areaModal}>
        <View style={styles.areaModalHeader}><View><Text style={styles.eyebrow}>AREA DETAILS</Text><Text style={styles.sectionTitle}>{area.areaName || 'Area'}</Text><Text style={styles.areaMeta}>{equipment.length} equipment items</Text></View><TouchableOpacity onPress={onClose} style={styles.modalClose}><Text style={styles.modalCloseText}>Close</Text></TouchableOpacity></View>
        <ScrollView style={styles.areaModalScroll} contentContainerStyle={styles.areaModalContent}>
        <ProjectImageGallery projectId={projectId}/>

          <Text style={styles.areaSectionTitle}>Area Layout</Text>
          {!!(area.imagePath || area.layoutImagePath) && <TouchableOpacity onPress={() => setViewingLayout(true)} style={styles.viewAreaButton}><Text style={styles.viewAreaText}>View Layout</Text></TouchableOpacity>}
          {viewingLayout && <ZoomableImageViewer visible title="Area Layout" images={[area.imagePath || area.layoutImagePath]} pins={equipment.map(item => ({id: item.id, label: String(item.markingNo ?? item.sequenceNo), xPercent: Number(item.xPercent) || 0, yPercent: Number(item.yPercent) || 0, title: item.tagNumber, lines: [item.type]}))} onClose={() => setViewingLayout(false)} />}
          <View style={[styles.areaLayoutCanvas, {aspectRatio}]}>
            <AuthenticatedImage path={area.imagePath || area.layoutImagePath} resizeMode="contain" onLoad={event => {const source = event?.nativeEvent?.source; if (source?.width > 0 && source?.height > 0) setAspectRatio(source.width / source.height);}} style={styles.areaLayoutImage} />
            {equipment.map((item, index) => <TouchableOpacity key={item.id || index} onPress={() => setSelectedEquipmentId(item.id)} style={[styles.areaPin, selectedEquipmentId === item.id && styles.areaPinSelected, {left: `${Math.max(0, Math.min(100, Number(item.xPercent) || 0))}%` as any, top: `${Math.max(0, Math.min(100, Number(item.yPercent) || 0))}%` as any}]}><Text style={styles.areaPinText}>{item.markingNo ?? item.sequenceNo ?? index + 1}</Text></TouchableOpacity>)}
          </View>
          <View style={styles.areaEquipmentHeader}><Text style={styles.areaSectionTitle}>Equipment Details</Text><Text style={styles.areaMeta}>{equipment.length} total</Text></View>
          {equipment.length === 0 ? <Text style={styles.areaMeta}>No equipment listed in this area.</Text> : equipment.map((item, index) => <TouchableOpacity key={item.id || index} activeOpacity={0.95} onPress={() => setSelectedEquipmentId(item.id || '')} style={[styles.equipmentCard, selectedEquipmentId === item.id && styles.equipmentCardSelected]}>
            <View style={styles.equipmentHeading}><View style={[styles.areaPin, styles.equipmentSequencePin]}><Text style={styles.areaPinText}>{item.markingNo ?? item.sequenceNo ?? index + 1}</Text></View><Text style={styles.areaName}>{item.tagNumber || `Equipment ${index + 1}`}</Text></View>
            <View style={styles.detailsGrid}><Detail styles={styles} label="Tag Number" value={item.tagNumber} /><Detail styles={styles} label="Equipment ID" value={item.equipmentCode} /><Detail styles={styles} label="RFID Tag UID" value={item.rfidTagUid} /><Detail styles={styles} label="Type" value={item.type} /><Detail styles={styles} label="Circuit ID" value={item.circuitId} /><Detail styles={styles} label="Location" value={item.location} /><Detail styles={styles} label="Manufacturer" value={item.manufacturer} /><Detail styles={styles} label="Protection Details" value={item.protectionDetails} /><Detail styles={styles} label="Certificate Number" value={item.certificateNumber} /></View>
          </TouchableOpacity>)}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

function Detail({styles, label, value}: {styles: ViewStyles; label: string; value?: any}) {
  return <View style={styles.detailItem}><Text style={styles.detailLabel}>{label.toUpperCase()}</Text><Text style={styles.detailValue}>{value || 'Not set'}</Text></View>;
}

function TeamMember({styles, role, name}: {styles: ViewStyles; role: string; name: string}) {
  return <View style={styles.teamRow}><View style={styles.avatar}><Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text></View><View style={{flex: 1}}><Text style={styles.teamRole}>{role.toUpperCase()}</Text><Text style={styles.teamName}>{name}</Text></View></View>;
}

type ViewStyles = ReturnType<typeof makeStyles>;

const makeStyles = (c: Colors) => StyleSheet.create({
  compactContent: {padding: 12},
  compactHero: {flexDirection: 'column', gap: 12, padding: 16},
  stack: {flexDirection: 'column', alignItems: 'stretch'},
  fullWidth: {width: '100%'},
  heroPhoto: {position: 'absolute', right: 0, width: '76%', height: '100%'},
  nativeOverlay: {backgroundColor: '#03192C88'},
  screen: {flex: 1, backgroundColor: c.bg}, content: {padding: 20, paddingBottom: 40, gap: 14, width: '100%', alignSelf: 'center'},
  back: {alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 8}, backText: {fontSize: 12, color: c.cyan, fontWeight: '800'},
  hero: {backgroundColor: '#03192c', overflow: 'hidden', borderWidth: 1, borderColor: '#126078', borderRadius: 15, padding: 24, minHeight: 150, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18},
  eyebrow: {fontSize: 10, color: '#00D9EE', fontWeight: '800', letterSpacing: 1.2}, title: {fontFamily: visual.display, fontSize: 34, color: '#F5FAFF', fontWeight: '800', marginTop: 8}, heroMeta: {flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 15}, heroMetaText: {fontSize: 11, color: '#dceef1', fontWeight: '700'},
  heroActions: {alignItems: 'flex-end', gap: 14}, statusBadge: {borderRadius: 18, paddingHorizontal: 10, paddingVertical: 6}, statusText: {fontSize: 10, fontWeight: '800'}, editButton: {minHeight: 38, borderRadius: 7, backgroundColor: '#00D9EE', paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center'}, editText: {fontSize: 13, color: '#03192C', fontWeight: '800'},
  columns: {flexDirection: 'row', flexWrap: 'wrap', gap: 14, }, detailsCard: {flex: 2, minWidth: 0, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 15, padding: 18}, teamCard: {flex: 1, minWidth: 0, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 15, padding: 18}, sectionTitle: {fontSize: 19, color: c.text, fontWeight: '800'}, detailsGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 18}, detailItem: {flexGrow: 1, flexBasis: 150, minWidth: 125, borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 8}, detailLabel: {fontSize: 11, color: c.secondary, fontWeight: '800'}, detailValue: {fontSize: 14, color: c.text, fontWeight: '700', marginTop: 5},
  teamRow: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.border, marginTop: 9}, avatar: {width: 34, height: 34, borderRadius: 17, backgroundColor: c.elevated, alignItems: 'center', justifyContent: 'center'}, avatarText: {fontSize: 12, color: c.cyan, fontWeight: '800'}, teamRole: {fontSize: 11, color: c.secondary, fontWeight: '800'}, teamName: {fontSize: 14, color: c.text, fontWeight: '800', marginTop: 3},
  sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 12}, sectionHint: {fontSize: 11, color: c.secondary, marginTop: 4}, areaCount: {fontSize: 11, color: c.secondary, fontWeight: '700'}, areaGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 14}, areaCard: {width: 350, maxWidth: '100%', backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 9, overflow: 'hidden'}, areaImage: {width: '100%', height: 222, backgroundColor: c.elevated}, areaBody: {padding: 14}, areaName: {fontSize: 14, color: c.text, fontWeight: '800'}, areaMeta: {fontSize: 10, color: c.secondary, marginTop: 6}, viewAreaButton: {marginTop: 12, minHeight: 36, borderRadius: 7, backgroundColor: '#00D9EE', alignItems: 'center', justifyContent: 'center'}, viewAreaText: {fontSize: 14, color: '#03192C', fontWeight: '800'}, equipmentCard: {padding: 14, borderWidth: 1, borderColor: c.border, borderRadius: 8, backgroundColor: c.card}, equipmentCardSelected: {borderColor: '#7163dc', backgroundColor: c.elevated}, empty: {minHeight: 140, padding: 24, borderRadius: 9, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, justifyContent: 'center', alignItems: 'center'},
  projectAreaList: {gap: 16}, projectAreaRow: {width: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 16}, projectEquipmentPanel: {flex: 1, minWidth: 0, padding: 16, borderWidth: 1, borderColor: c.border, borderRadius: 9, backgroundColor: c.card, gap: 9}, equipmentPanelHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2}, equipmentSummaryRow: {minHeight: 58, padding: 10, borderWidth: 1, borderColor: c.border, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.card}, summaryNumber: {width: 34, height: 34, borderRadius: 7, backgroundColor: c.elevated, alignItems: 'center', justifyContent: 'center'}, summaryNumberText: {fontSize: 13, color: c.cyan, fontWeight: '800'}, summaryCopy: {flex: 1, minWidth: 0}, summaryTag: {fontSize: 14, color: c.text, fontWeight: '800'}, summaryMeta: {fontSize: 12, color: c.secondary, marginTop: 4}, summaryStatus: {borderWidth: 1, borderColor: c.border, maxWidth: 132, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 12, backgroundColor: c.elevated}, summaryStatusText: {fontSize: 9, color: c.cyan, fontWeight: '800'}, summaryArrow: {fontSize: 18, color: c.cyan}, emptyEquipmentText: {fontSize: 11, color: c.secondary, paddingVertical: 14}, equipmentDetailsModal: {width: '100%', maxWidth: 1000, maxHeight: '94%', flexGrow: 0, flexShrink: 1, backgroundColor: c.bg, borderRadius: 12, borderWidth: 1, borderColor: c.border, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: {width: 0, height: 6}, elevation: 8}, equipmentModalBackdrop: {flex: 1, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', padding: 18}, equipmentDetailsContent: {padding: 22}, backToProject: {alignSelf: 'flex-start', marginBottom: 14}, equipmentDetailsHero: {minHeight: 140, padding: 22, backgroundColor: '#03192c', borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 16}, equipmentDetailsSequence: {width: 54, height: 54, borderRadius: 8, backgroundColor: '#00D9EE', alignItems: 'center', justifyContent: 'center'}, equipmentDetailsSequenceText: {fontSize: 21, color: c.text, fontWeight: '800'}, equipmentDetailsTitle: {fontSize: 24, color: '#F5FAFF', fontWeight: '800', marginTop: 4}, equipmentDetailsSubtitle: {fontSize: 11, color: '#dceef1', marginTop: 5}, equipmentDetailsStatus: {paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, backgroundColor: c.elevated}, equipmentDetailsStatusText: {fontSize: 10, color: c.cyan, fontWeight: '800'}, equipmentDetailsCard: {marginTop: 14, padding: 22, borderWidth: 1, borderColor: c.border, borderRadius: 9, backgroundColor: c.card}, areaModalBackdrop: {flex: 1, backgroundColor: 'rgba(23, 29, 54, 0.62)', alignItems: 'center', justifyContent: 'center', padding: 18}, areaModal: {width: '100%', maxWidth: 1050, maxHeight: '94%', backgroundColor: c.bg, borderRadius: 12, overflow: 'hidden'}, areaModalHeader: {paddingHorizontal: 22, paddingVertical: 18, backgroundColor: c.card, borderBottomWidth: 1, borderColor: c.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}, modalClose: {borderRadius: 7, borderWidth: 1, borderColor: c.border, paddingVertical: 9, paddingHorizontal: 14}, modalCloseText: {fontSize: 11, color: c.text, fontWeight: '800'}, areaModalScroll: {flexGrow: 0, flexShrink: 1}, areaModalContent: {padding: 20, gap: 12}, areaSectionTitle: {fontSize: 15, color: c.text, fontWeight: '800'}, areaLayoutCanvas: {width: '100%', position: 'relative', overflow: 'hidden', backgroundColor: c.elevated, borderRadius: 8}, areaLayoutImage: {position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%'}, areaPin: {position: 'absolute', width: 27, height: 27, marginLeft: -13, marginTop: -13, borderRadius: 14, borderWidth: 2, borderColor: c.card, backgroundColor: '#4b42ce', alignItems: 'center', justifyContent: 'center', zIndex: 2}, areaPinSelected: {width: 34, height: 34, marginLeft: -17, marginTop: -17, backgroundColor: '#ed8c35'}, areaPinText: {fontSize: 10, color: '#F5FAFF', fontWeight: '800'}, areaEquipmentHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8}, equipmentHeading: {flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8}, equipmentSequencePin: {position: 'relative', left: undefined, top: undefined, marginLeft: 0, marginTop: 0, width: 25, height: 25, borderWidth: 0},
  state: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: c.bg}, stateTitle: {fontSize: 17, color: c.text, fontWeight: '800'}, stateText: {fontSize: 12, color: c.secondary, textAlign: 'center', marginTop: 8}, primaryButton: {marginTop: 18, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 7, backgroundColor: '#00D9EE'}, primaryButtonText: {fontSize: 11, color: c.text, fontWeight: '800'}, backAction: {marginTop: 15}, errorBox: {padding: 10, backgroundColor: '#fff0f0', borderRadius: 7, marginTop: 12}, errorText: {fontSize: 11, color: '#b3404c', fontWeight: '700'},
});
