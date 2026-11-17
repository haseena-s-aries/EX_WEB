import QcReviewRecords from '../components/QcReviewRecords';
import ModuleHeading from '../components/ModuleHeading';
import {QcDashboardLayout, useQcStyles} from '../components/QcDashboardLayout';
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {
  getManagerQcArea, getManagerQcDashboard, getManagerQcEquipment, getManagerQcProject, getManagerQcProjects,
  ManagerQcAreaDetails, ManagerQcCounts, ManagerQcEquipment, ManagerQcInspection, ManagerQcProject,
  ManagerQcProjectDetails,
} from '../api/managerQc';
import {getApiErrorMessage} from '../api/errors';
import {projectDisplay} from '../utils/projectDisplay';
import {projectStatusLabel} from '../api/projects';
import AuthenticatedImage from '../components/AuthenticatedImage';
import QcReportingManagers from '../components/QcReportingManagers';
import {Colors} from '../theme/palette';
import {OPERATIONS_DARK} from '../theme/operationsPalette';


type Route = {kind: 'dashboard'} | {kind: 'project'; projectId: string} |
  {kind: 'area'; projectId: string; areaId: string} |
  {kind: 'equipment'; projectId: string; areaId: string; equipmentId: string; inspectionId?: string};
type Props = {userRole: string; onBack?: () => void; onAssignmentsChanged?: () => void};
const label = (value?: string | null) => value ? value.replace(/([a-z])([A-Z])/g, '$1 $2') : 'Not submitted';
const date = (value?: string | null) => value ? new Date(value).toLocaleString() : '—';

export default function ManagerQcReviewScreen({userRole, onBack, onAssignmentsChanged}: Props) {
  const [route, setRoute] = useState<Route>({kind: 'dashboard'});
  const [version, setVersion] = useState(0);
  const [selectedSummary, setSelectedSummary] = useState<ManagerQcProject | undefined>();
  const [counts, setCounts] = useState<ManagerQcCounts | null>(null);
  const [projects, setProjects] = useState<ManagerQcProject[]>([]);
  const [project, setProject] = useState<ManagerQcProjectDetails | null>(null);
  const [area, setArea] = useState<ManagerQcAreaDetails | null>(null);
  const [detail, setDetail] = useState<ManagerQcInspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showManagers, setShowManagers] = useState(false);
  const colors = OPERATIONS_DARK;
  const {styles: qcDashboardStyles} = useQcStyles(true);
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const allowed = userRole === 'Manager' || userRole === 'Admin';
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setLoading(true); setError('');
    const load = async () => {
      try {
        if (route.kind === 'dashboard') {
          const [dashboard, list] = await Promise.all([getManagerQcDashboard(), getManagerQcProjects()]);
          if (active) {setCounts(dashboard.data); setProjects(list.data);}
        } else if (route.kind === 'project') {
          const response = await getManagerQcProject(route.projectId);
          if (active) setProject(response.data);
        } else if (route.kind === 'area') {
          const response = await getManagerQcArea(route.projectId, route.areaId);
          if (active) setArea(response.data);
        } else {
          const response = route.inspectionId ? await getManagerQcEquipment(route.equipmentId, route.inspectionId) : await getManagerQcEquipment(route.equipmentId);
          if (active) setDetail(response.data);
        }
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, 'Could not load QC review activity.'));
      } finally {if (active) setLoading(false);}
    };
    load();
    return () => {active = false;};
  }, [route, version, allowed]);
  const back = () => {
    if (route.kind === 'equipment') setRoute({kind: 'area', projectId: route.projectId, areaId: route.areaId});
    else if (route.kind === 'area') setRoute({kind: 'project', projectId: route.projectId});
    else if (route.kind === 'project') setRoute({kind: 'dashboard'});
    else onBack?.();
  };
  const button = (text: string, action: () => void) => <TouchableOpacity accessibilityRole="button" onPress={action} style={styles.button}><Text style={styles.buttonText}>{text}</Text></TouchableOpacity>;
  const field = (name: string, value: string | number | null | undefined) => <View style={styles.field}><Text style={[styles.fieldLabel, {color: colors.muted}]}>{name}</Text><Text selectable style={{color: colors.text}}>{value ?? '—'}</Text></View>;
  const card = (children: React.ReactNode, key?: string) => <View key={key} style={[styles.card, {backgroundColor: colors.card, borderColor: colors.border}]}>{children}</View>;
  const stats = (value: ManagerQcCounts) => <View style={styles.stats}>{[
    ['Awaiting QC Review', value.awaitingQcReview], ['In Review', value.inReview],
    ['Changes Requested', value.changesRequested], ['QC Approved', value.approved], ['Overdue', value.overdue],
  ].map(([name, amount]) => card(<>{field(String(name), Number(amount))}</>, String(name)))}</View>;
  const equipmentFields = (item: ManagerQcEquipment) => <View style={styles.fields}>
    {field('Sequence No', item.sequenceNo)}{field('Tag Number', item.tagNumber)}{field('Equipment Type', item.type)}
    {field('Surveyor Inspection Status', label(item.inspectionStatus))}{field('QC Review Status', label(item.qcReviewStatus))}
    {field('QC Comments', item.qcComments)}{field('Severity', item.severity)}{field('Reviewed By', item.reviewedBy)}
    {field('Review Started At', date(item.reviewStartedAt))}{field('Reviewed At', date(item.reviewedAt))}
  </View>;
  const projectFields = (item: ManagerQcProject) => <View style={styles.fields}>
    {field('Job Number', item.jobNo)}{field('Location', item.location)}{field('Surveyor', item.surveyorName)}
    {field('Assigned QC', item.assignedQc)}{field('QC Manager', item.managerName || 'Not assigned')}
    {field('Total Equipment', item.totalEquipment)}{field('Pending Review', item.counts.awaitingQcReview)}
    {field('In Review', item.counts.inReview)}{field('Changes Requested', item.counts.changesRequested)}
    {field('Approved', item.counts.approved)}{field('Last QC Activity', date(item.lastQcActivity))}
    {field('Project Status', projectStatusLabel(item.projectStatus))}{field('QC Status', label(item.qcReviewStatus))}
  </View>;
  if (!allowed) return <Text>QC Reviewed List is available to Managers and Admins.</Text>;
  if (route.kind === 'dashboard') return <QcDashboardLayout operations
    eyebrow="QC WORKSPACE" title="QC Reviewed List" compact subtitle="Track inspection reviews, QC decisions, corrections, and approval history."
    heading="QC Review Workspace" loading={loading} error={error} empty={projects.length === 0}
    onRefresh={() => setVersion(v => v + 1)}
    kpis={(selectedSummary?.counts || counts) ? [
      {label: 'Awaiting QC Review', count: (selectedSummary?.counts || counts)!.awaitingQcReview, tone: 'amber'},
      {label: 'In Review', count: (selectedSummary?.counts || counts)!.inReview, tone: 'cyan'},
      {label: 'Changes Requested', count: (selectedSummary?.counts || counts)!.changesRequested, tone: 'critical'},
      {label: 'QC Approved', count: (selectedSummary?.counts || counts)!.approved, tone: 'success'},
      {label: 'Overdue', count: (selectedSummary?.counts || counts)!.overdue, tone: 'indigo'},
    ] : undefined}
    actions={<>
      {(onBack || userRole === 'Admin') && <View style={qcDashboardStyles.heading}>
        {onBack && <TouchableOpacity onPress={back}><Text style={qcDashboardStyles.refresh}>Back</Text></TouchableOpacity>}
        {userRole === 'Admin' && <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded: showManagers}} onPress={() => setShowManagers(v => !v)}>
          <Text style={[qcDashboardStyles.refresh, {color: colors.cyan}]}>{showManagers ? 'Close reporting managers' : 'Reporting managers'}</Text>
        </TouchableOpacity>}
      </View>}
      {showManagers && userRole === 'Admin' && <QcReportingManagers onChanged={() => {setVersion(v => v + 1); onAssignmentsChanged?.();}} />}
    </>}>
    <QcReviewRecords projects={projects} version={version} onSelection={setSelectedSummary}
      onProject={id => setRoute({kind: 'project', projectId: id})}
      onInspection={record => setRoute({kind: 'equipment', projectId: record.projectId, areaId: record.areaId,
        equipmentId: record.equipment.equipmentId, inspectionId: record.equipment.inspectionId || undefined})} />
  </QcDashboardLayout>;

  return <ScrollView style={{flex: 1, backgroundColor: colors.bg}} contentContainerStyle={styles.page}>
    <View style={styles.header}><ModuleHeading eyebrow="QUALITY CONTROL  /  REVIEW" title="QC Reviewed List" />
      {button('Back', back)}
      {button('Refresh', () => setVersion(v => v + 1))}
    </View>
    <Text style={{color: colors.muted}}>Project → Area → Equipment → Inspection → QC History</Text>
    {loading ? <ActivityIndicator color={colors.amber} /> : error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : <>
      {route.kind === 'project' && project && <>
        {card(<><Text style={[styles.subtitle, {color: colors.text}]}>{projectDisplay(project.project.projectName)}</Text>{projectFields(project.project)}</>)}
        {stats(project.project.counts)}
        {project.areas.length === 0 && <Text style={{color: colors.muted}}>No areas yet.</Text>}
        {project.areas.map(item => card(<><Text style={[styles.subtitle, {color: colors.text}]}>{item.areaName}</Text>
          {field('Total Equipment', item.totalEquipment)}{stats(item.counts)}
          {button('View Area', () => setRoute({kind: 'area', projectId: route.projectId, areaId: item.areaId}))}
        </>, item.areaId))}
      </>}
      {route.kind === 'area' && area && <>
        <Text style={[styles.subtitle, {color: colors.text}]}>{area.areaName}</Text>{stats(area.counts)}
        {area.equipment.length === 0 && <Text style={{color: colors.muted}}>No equipment yet.</Text>}
        {area.equipment.map(item => card(<>{equipmentFields(item)}
          {button('View Inspection', () => setRoute({kind: 'equipment', projectId: route.projectId, areaId: route.areaId, equipmentId: item.equipmentId}))}
        </>, item.equipmentId))}
      </>}
      {route.kind === 'equipment' && detail && <>
        {card(<><Text style={[styles.subtitle, {color: colors.text}]}>Equipment Information</Text>{equipmentFields(detail.equipment)}<View style={styles.fields}>{field('Equipment Name', detail.equipmentName)}{field('Description', detail.description)}{field('Item Number', detail.itemNumber)}{field('Area', detail.areaName)}{field('RFID UID', detail.rfidTagUid)}</View></>)}
        {detail.inspection ? <>
          {card(<><Text style={[styles.subtitle, {color: colors.text}]}>Surveyor Inspection</Text><View style={styles.fields}>
            {field('Inspector', detail.inspection.inspectorName)}{field('Inspection Type / Grade', detail.inspectionType)}
            {field('Inspection Date', date(detail.inspection.inspectionTimestamp))}{field('Submitted At', date(detail.inspection.submissionDate))}
            {field('Due Date', date(detail.inspection.dueDate))}{field('Surveyor Remarks', detail.inspection.surveyorRemarks)}
            {field('Certificate Number', detail.inspection.certificateNumber)}{field('Certificate Details', detail.inspection.certificateDetails)}
          </View></>)}
          {card(<><Text style={[styles.subtitle, {color: colors.text}]}>Checklist Answers</Text>
            {detail.inspection.checklistAnswers.map(answer => <View key={answer.answerId} style={styles.answer}>
              <Text style={{color: colors.text, fontSize: 15, fontWeight: '600'}}>{answer.question}</Text>
              <Text style={{color: colors.secondary, fontSize: 14}}>Answer: {answer.value ?? 'Blank'} · Remarks: {answer.comment || '—'}</Text>
            </View>)}
          </>)}
          {card(<><Text style={[styles.subtitle, {color: colors.text}]}>Inspection Photos</Text>
            <View style={styles.fields}>{detail.inspection.inspectionPhotos.map(photo => <View key={photo.fileId}>
              <AuthenticatedImage path={`/api/manager/qc-review/inspections/${detail.inspection!.inspectionId}/photos/${photo.fileId}`} fileName={photo.fileName} style={styles.photo} resizeMode="contain" />
              <Text style={{color: colors.muted}}>{photo.fileName}</Text>
            </View>)}</View>
            {detail.inspection.inspectionPhotos.length === 0 && <Text style={{color: colors.muted}}>No photos.</Text>}
          </>)}
          {detail.inspection.findings.length > 0 && card(<><Text style={[styles.subtitle, {color: colors.text}]}>Findings</Text>
            {detail.inspection.findings.map(f => <View key={f.findingId}>{field('Observation', f.observation)}{field('Recommendation', f.recommendation)}{field('Severity', f.severity)}{field('Status', f.status)}</View>)}
          </>)}
        </> : <Text style={{color: colors.muted}}>The Surveyor has not started this inspection.</Text>}
        {card(<><Text style={[styles.subtitle, {color: colors.text}]}>QC Review History</Text><Text style={{color: colors.muted}}>Recorded events only · {detail.history.filter(event => event.action === 'QC Started Review').length || '—'} recorded review starts</Text>
          {detail.history.length === 0 && <Text style={{color: colors.muted}}>No recorded workflow events.</Text>}
          {[...detail.history].sort((a, b) => (new Date(a.occurredAt).getTime() || 0) - (new Date(b.occurredAt).getTime() || 0)).map(event => <View key={event.id} style={styles.timeline}>
            <Text style={[styles.subtitle, {color: colors.text}]}>{event.action}</Text><View style={styles.fields}>
              {field('When', date(event.occurredAt))}{field('By', event.actorName)}{field('Comments', event.comments)}
              {field('Severity', event.severity)}{event.qcStatus && field('QC Status', label(event.qcStatus))}
              {event.reviewStartedAt && field('Started At', date(event.reviewStartedAt))}{event.reviewedAt && field('Reviewed At', date(event.reviewedAt))}
            </View>
          </View>)}
        </>)}
      </>}
    </>}
  </ScrollView>;
}

const makeStyles = (c: Colors) => StyleSheet.create({
  page: {padding: 20, paddingBottom: 32, gap: 16}, header: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12},
  title: {fontSize: 26, fontWeight: '800', flex: 1}, subtitle: {fontSize: 18, fontWeight: '700', marginBottom: 12},
  card: {padding: 18, borderRadius: 12, borderWidth: 1, gap: 12}, stats: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  fields: {flexDirection: 'row', flexWrap: 'wrap', gap: 16}, field: {minWidth: 160, flexGrow: 1, flexBasis: 190, gap: 4},
  fieldLabel: {fontSize: 12, fontWeight: '600'}, button: {alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.elevated, borderRadius: 8},
  buttonText: {color: c.cyan, fontWeight: '700'}, error: {color: c.critical}, answer: {paddingVertical: 12, gap: 6},
  photo: {width: 280, height: 220}, timeline: {borderLeftWidth: 3, borderLeftColor: c.cyan, paddingLeft: 14, paddingVertical: 14},
});
