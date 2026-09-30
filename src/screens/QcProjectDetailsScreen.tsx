import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {getApiErrorMessage} from '../api/errors';
import {approveQcInspection, getQcArea, getQcEquipmentInspection, getQcProject, requestQcChanges, startQcReview, updateQcComments} from '../api/projects';
import AuthenticatedImage from '../components/AuthenticatedImage';

type Props = {projectId: string; projectSummary?: any; onBack: () => void};
const first = (obj: any, ...keys: string[]) => {
  for (const key of keys) if (obj?.[key] != null) return obj[key];
  return undefined;
};
const array = (obj: any, ...keys: string[]): any[] => {
  const result = first(obj, ...keys);
  return Array.isArray(result) ? result : [];
};
const equipmentList = (...sources: any[]): any[] => {
  const names = ['equipment', 'equipmentitems', 'equipments', 'areaequipment', 'equipmentlist', 'equipmentdetails'];
  const search = (value: any, depth = 0): any[] => {
    if (!value || typeof value !== 'object' || depth > 3) return [];
    for (const [key, child] of Object.entries(value)) {
      if (names.includes(key.replace(/[^a-z]/gi, '').toLowerCase()) && Array.isArray(child) && child.length) return child;
    }
    for (const child of Object.values(value)) {
      if (child && typeof child === 'object' && !Array.isArray(child)) {
        const result = search(child, depth + 1);
        if (result.length) return result;
      }
    }
    return [];
  };
  for (const source of sources) {
    const result = search(source);
    if (result.length) return result;
  }
  return [];
};
const imagePath = (item: any) => first(item, 'downloadUrl', 'filePath', 'layoutImagePath', 'layoutPath', 'areaImagePath', 'imagePath', 'photoPath', 'equipmentImagePath', 'equipmentPhotoPath', 'storageKey', 'path', 'url');

export default function QcProjectDetailsScreen({projectId, projectSummary, onBack}: Props) {
  const [project, setProject] = useState<any>(null);
  const [areas, setAreas] = useState<any[]>([]);
  const [areaDetails, setAreaDetails] = useState<Record<string, any>>({});
  const [inspections, setInspections] = useState<Record<string, any>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [severities, setSeverities] = useState<Record<string, 'Low' | 'Medium' | 'High' | 'Critical'>>({});
  const [busyEquipmentId, setBusyEquipmentId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getQcProject(projectId);
      const data = response.data || {};
      const detailQcStatus = first(data, 'qcStatus', 'qcReviewStatus', 'reviewStatus', 'inspectionStatus');
      const assignedQcStatus = first(projectSummary, 'qcStatus', 'qcReviewStatus', 'reviewStatus', 'inspectionStatus', 'status');
      const projectDetails = detailQcStatus != null ? data : {...data, qcStatus: assignedQcStatus};
      const projectAreas = array(data, 'areas', 'projectAreas');
      setProject(projectDetails);
      setAreas(projectAreas);

      const details = await Promise.all(projectAreas.map(async area => {
        const areaId = String(first(area, 'areaId', 'id'));
        try {
          const areaResponse = await getQcArea(projectId, areaId);
          return [areaId, {...area, ...areaResponse.data}] as const;
        } catch {
          return [areaId, area] as const;
        }
      }));
      const detailMap = Object.fromEntries(details);
      setAreaDetails(detailMap);

      const equipment = details.flatMap(([, detail]) => equipmentList(detail));
      const inspectionResults = await Promise.all(equipment.map(async item => {
        const equipmentId = String(first(item, 'equipmentId', 'id'));
        if (!first(item, 'inspectionId')) {
          return [equipmentId, {inspectionId: null, qcReviewStatus: first(item, 'qcReviewStatus') || 'PendingReview', notSubmitted: true}] as const;
        }
        try {
          const inspectionResponse = await getQcEquipmentInspection(equipmentId);
          return [equipmentId, inspectionResponse.data || {}] as const;
        } catch (inspectionError: any) {
          return [equipmentId, {notSubmitted: inspectionError?.response?.status === 404}] as const;
        }
      }));
      setInspections(Object.fromEntries(inspectionResults));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not load QC project details.'));
    } finally {
      setLoading(false);
    }
  }, [projectId, projectSummary]);

  useEffect(() => { load(); }, [load]);

  const reviewEquipment = async (item: any) => {
    const id = String(first(item, 'equipmentId', 'id'));
    const assignedInspectionId = first(item, 'inspectionId');
      if (!assignedInspectionId || inspections[id]?.notSubmitted) {
      setNotice('This equipment is waiting for the surveyor to submit its inspection.');
      return;
    }
    setBusyEquipmentId(id);
    setNotice('');
    try {
      let inspection = inspections[id];
      if (!first(inspection, 'inspectionId')) inspection = (await getQcEquipmentInspection(id)).data || {};
      inspection = inspection || {};
      const inspectionId = String(first(inspection, 'inspectionId') || assignedInspectionId);
      const currentStatus = String(first(inspection, 'qcReviewStatus', 'status', 'inspectionStatus') || first(item, 'qcReviewStatus') || 'PendingReview');
      if (/approved/i.test(currentStatus)) {
        setNotice('This inspection is approved and locked.');
        return;
      }
      if (/changes.?requested|changes required/i.test(currentStatus)) {
        setNotice('Changes were requested. Wait for the Surveyor to resubmit the inspection.');
        return;
      }
      if (!/in.?review/i.test(currentStatus)) {
        await startQcReview(inspectionId);
        inspection = {...inspection, inspectionId, qcReviewStatus: 'InReview'};
      }
      setInspections(previous => ({...previous, [id]: {...inspection, inspectionId, qcReviewStatus: 'InReview'}}));
      setNotice(`${first(item, 'tagNumber', 'equipmentId') || 'Equipment'} review opened.`);
    } catch (requestError) {
      setNotice(getApiErrorMessage(requestError, 'Could not start inspection review.'));
    } finally { setBusyEquipmentId(null); }
  };

  const updateInspection = async (item: any, action: 'approve' | 'change' | 'comment') => {
    const id = String(first(item, 'equipmentId', 'id'));
    setBusyEquipmentId(id);
    setNotice('');
    try {
      let inspection = inspections[id];
      const assignedInspectionId = first(item, 'inspectionId');
      if (!assignedInspectionId || inspection?.notSubmitted) throw new Error('This equipment is waiting for the surveyor to submit its inspection.');
      if (!first(inspection, 'inspectionId') && assignedInspectionId) inspection = (await getQcEquipmentInspection(id)).data || {};
      inspection = inspection || {};
      const inspectionId = String(first(inspection, 'inspectionId') || assignedInspectionId || '');
      if (!inspectionId) throw new Error('This equipment is waiting for the surveyor to submit its inspection.');
      const comment = (comments[id] || '').trim();
      if (action !== 'approve' && !comment) throw new Error(action === 'change' ? 'Add QC comments describing the required changes.' : 'Enter a QC comment first.');
      if (action === 'approve' || action === 'change') {
        const reviewStatus = String(first(inspection, 'qcReviewStatus', 'status', 'inspectionStatus') || first(item, 'qcReviewStatus') || 'PendingReview');
        if (/approved/i.test(reviewStatus)) throw new Error('This inspection is approved and locked.');
        if (/changes.?requested|changes required/i.test(reviewStatus)) throw new Error('Wait for the Surveyor to resubmit the requested changes.');
        if (!/in.?review/i.test(reviewStatus)) {
          await startQcReview(inspectionId);
          inspection = {...inspection, qcReviewStatus: 'InReview'};
        }
      }
      if (action === 'approve') await approveQcInspection(inspectionId, comment || undefined);
      if (action === 'change') await requestQcChanges(inspectionId, comment, severities[id] || 'Medium');
      const status = action === 'approve' ? 'Approved' : action === 'change' ? 'ChangesRequested' : first(inspection, 'status', 'inspectionStatus') || 'InReview';
      setInspections(previous => ({...previous, [id]: {...inspection, qcReviewStatus: status, status, inspectionStatus: status, qcComments: comment, comments: comment}}));
      if (action === 'approve' || action === 'change') {
        setProject((previous: any) => previous ? {...previous, qcStatus: status, qcReviewStatus: status, reviewStatus: status} : previous);
      }
      if (action === 'comment') {
        await updateQcComments(inspectionId, comment);
      }
      setNotice(action === 'comment' ? 'QC comment saved.' : `Inspection ${action === 'approve' ? 'approved' : 'returned for changes'}.`);
    } catch (requestError) {
      setNotice(getApiErrorMessage(requestError, 'Could not update this inspection.'));
    } finally { setBusyEquipmentId(null); }
  };

  if (loading) return <View style={styles.state}><ActivityIndicator color="#3f47d6" /><Text style={styles.muted}>Loading project details...</Text></View>;
  if (error || !project) return <View style={styles.state}><Text style={styles.title}>Project unavailable</Text><Text style={styles.muted}>{error}</Text><TouchableOpacity onPress={onBack}><Text style={styles.link}>Back to QC projects</Text></TouchableOpacity></View>;

  const name = first(project, 'projectName', 'name') || 'Project';
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <TouchableOpacity onPress={onBack} style={styles.back}><Text style={styles.link}>‹ Back to QC projects</Text></TouchableOpacity>
    <View style={styles.hero}><Text style={styles.eyebrow}>PROJECT DETAILS</Text><Text style={styles.title}>{name}</Text><Text style={styles.subtitle}>Job {first(project, 'jobNo', 'jobNumber') || '—'} · {first(project, 'location') || 'Location not set'}</Text></View>
    <View style={styles.card}><Text style={styles.sectionTitle}>Project Details</Text><View style={styles.details}>
      <Info label="Sector" value={first(project, 'sector')} />
      <Info label="Job Number" value={first(project, 'jobNo', 'jobNumber')} />
      <Info label="Location" value={first(project, 'location')} />
      <Info label="Vessel / Site" value={first(project, 'vesselOrSiteName', 'vesselName')} />
      <Info label="Surveyor" value={first(project, 'assignedSurveyor', 'surveyorName')} />
      <Info label="QC" value={first(project, 'assignedQc', 'qcName')} />
      <Info label="Client" value={first(project, 'assignedClient', 'clientName')} />
      <Info label="Project Status" value={first(project, 'projectStatus', 'status')} />
      <Info label="QC Status" value={first(project, 'qcStatus', 'qcReviewStatus', 'reviewStatus', 'status')} />
      <Info label="Created Date" value={first(project, 'createdDate', 'createdAt')} />
      <Info label="Due Date" value={first(project, 'dueDate', 'reviewDueDate', 'qcDueDate')} />
    </View></View>
    <View style={styles.heading}><Text style={styles.sectionTitle}>Areas and Equipment</Text><Text style={styles.muted}>{areas.length} areas</Text></View>
    {!!notice && <View style={styles.notice}><Text style={styles.noticeText}>{notice}</Text></View>}
    {areas.length === 0 ? <View style={styles.card}><Text style={styles.muted}>No project areas were returned.</Text></View> : areas.map((area, index) => {
      const areaId = String(first(area, 'areaId', 'id') || index);
      const detail = areaDetails[areaId] || area;
      const equipment = equipmentList(detail, area);
      const photos = [...array(detail, 'photos', 'images', 'areaPhotos'), ...(imagePath(detail) ? [imagePath(detail)] : [])];
      return <View key={areaId} style={styles.area}>
        <View style={styles.areaHead}><Text style={styles.areaName}>{first(area, 'areaName', 'name') || `Area ${index + 1}`}</Text><Text style={styles.muted}>{equipment.length || first(area, 'equipmentCount') || 0} equipment · {first(area, 'photoCount') ?? photos.length} images</Text></View>
        <View style={styles.areaBody}>
          {photos.length > 0 && <ScrollView horizontal>{photos.map((photo: any, photoIndex: number) => <AuthenticatedImage key={photoIndex} path={typeof photo === 'string' ? photo : imagePath(photo)} resizeMode="contain" style={styles.areaImage} />)}</ScrollView>}
          {equipment.length === 0 ? <Text style={styles.muted}>No equipment listed in this area.</Text> : equipment.map((item: any, equipmentIndex: number) => {
            const equipmentId = String(first(item, 'equipmentId', 'id') || equipmentIndex);
            const inspection = inspections[equipmentId] || {};
            const fullEquipment = first(inspection, 'equipment') || item;
            const photosForEquipment = [...array(item, 'images', 'photos', 'equipmentImages'), ...array(inspection, 'images', 'photos', 'equipmentImages', 'inspectionImages', 'inspectionPhotos')];
            const directImage = first(fullEquipment, 'imagePath', 'photoPath', 'equipmentImagePath', 'equipmentPhotoPath');
            const hasSubmittedInspection = !!(first(item, 'inspectionId') || first(inspection, 'inspectionId')) && !inspection.notSubmitted;
            return <View key={equipmentId} style={styles.equipment}>
              <View style={styles.equipmentTop}><View style={{flex: 1}}><Text style={styles.equipmentName}>{first(fullEquipment, 'tagNumber', 'equipmentId', 'name') || `Equipment ${equipmentIndex + 1}`}</Text></View><Text style={styles.status}>{first(inspection, 'qcReviewStatus', 'status', 'inspectionStatus') || first(item, 'qcReviewStatus', 'status') || (hasSubmittedInspection ? 'PendingReview' : 'Awaiting surveyor submission')}</Text></View>
              <View style={styles.equipmentDetails}>
                <Info label="Sequence" value={first(fullEquipment, 'sequenceNo')} />
                <Info label="Tag Number" value={first(fullEquipment, 'tagNumber')} />
                <Info label="Equipment ID" value={first(fullEquipment, 'equipmentCode', 'equipmentId')} />
                <Info label="Type" value={first(fullEquipment, 'type')} />
                <Info label="Circuit ID" value={first(fullEquipment, 'circuitId')} />
                <Info label="Location" value={first(fullEquipment, 'location')} />
                <Info label="Manufacturer" value={first(fullEquipment, 'manufacturer')} />
                <Info label="Protection Details" value={first(fullEquipment, 'protectionDetails') || first(inspection, 'certificateDetails')} />
                <Info label="Certificate Number" value={first(fullEquipment, 'certificateNumber') || first(inspection, 'certificateNumber')} />
                <Info label="Created By" value={first(fullEquipment, 'createdByUserId')} />
                <Info label="Added Date" value={first(fullEquipment, 'createdAt')} />
                <Info label="Last Updated" value={first(fullEquipment, 'updatedAt')} />
                <Info label="Inspection Status" value={first(inspection, 'qcReviewStatus', 'status', 'inspectionStatus') || first(item, 'qcReviewStatus', 'status')} />
                <Info label="Previous QC Comments" value={first(inspection, 'qcComments', 'qcComment', 'comments')} />
              </View>
              {directImage ? <AuthenticatedImage path={directImage} resizeMode="contain" style={styles.equipmentImage} /> : null}
              {array(item, 'equipmentImages', 'equipmentPhotos').map((photo: any, photoIndex: number) => <AuthenticatedImage key={`equipment-${photoIndex}`} path={typeof photo === 'string' ? photo : imagePath(photo)} resizeMode="contain" style={styles.equipmentImage} />)}
              {photosForEquipment.map((photo: any, photoIndex: number) => <AuthenticatedImage key={photoIndex} path={typeof photo === 'string' ? photo : imagePath(photo)} resizeMode="contain" style={styles.equipmentImage} />)}
              {array(inspection, 'checklistAnswers').map((answer: any, answerIndex: number) => <Info key={`answer-${answerIndex}`} label={first(answer, 'question') || `Checklist item ${answerIndex + 1}`} value={[first(answer, 'value'), first(answer, 'comment')].filter(Boolean).join(' · ')} />)}
              {array(inspection, 'findings').map((finding: any, findingIndex: number) => <View key={`finding-${findingIndex}`} style={styles.finding}><Text style={styles.equipmentName}>Finding {findingIndex + 1}: {first(finding, 'observation') || '—'}</Text><Text style={styles.muted}>{[first(finding, 'recommendation'), first(finding, 'severity'), first(finding, 'status')].filter(Boolean).join(' · ')}</Text></View>)}
              {!!first(inspection, 'surveyorRemarks') && <Text style={styles.muted}>Surveyor remarks: {first(inspection, 'surveyorRemarks')}</Text>}
              {!hasSubmittedInspection && <Text style={styles.awaiting}>QC actions are available after the surveyor submits this inspection.</Text>}
              <TouchableOpacity disabled={!hasSubmittedInspection || busyEquipmentId === equipmentId} onPress={() => reviewEquipment(item)} style={[styles.reviewButton, !hasSubmittedInspection && styles.disabledButton]}><Text style={styles.buttonText}>{busyEquipmentId === equipmentId ? 'Working…' : 'Review inspection'}</Text></TouchableOpacity>
              <TextInput editable={hasSubmittedInspection} value={comments[equipmentId] || ''} onChangeText={value => setComments(previous => ({...previous, [equipmentId]: value}))} multiline placeholder="Add QC comments" placeholderTextColor="#9095a4" style={styles.input} />
              <View style={styles.severityRow}><Text style={styles.severityLabel}>Change severity</Text>{(['Low', 'Medium', 'High', 'Critical'] as const).map(level => <TouchableOpacity key={level} onPress={() => setSeverities(previous => ({...previous, [equipmentId]: level}))} style={[styles.severityOption, (severities[equipmentId] || 'Medium') === level && styles.severitySelected]}><Text style={[styles.severityText, (severities[equipmentId] || 'Medium') === level && styles.severitySelectedText]}>{level}</Text></TouchableOpacity>)}</View>
              <View style={styles.actions}>
                <TouchableOpacity disabled={!hasSubmittedInspection || busyEquipmentId === equipmentId} onPress={() => updateInspection(item, 'change')} style={[styles.changeButton, !hasSubmittedInspection && styles.disabledButton]}><Text style={styles.changeText}>Request changes</Text></TouchableOpacity>
                <TouchableOpacity disabled={!hasSubmittedInspection || busyEquipmentId === equipmentId} onPress={() => updateInspection(item, 'comment')} style={[styles.commentButton, !hasSubmittedInspection && styles.disabledButton]}><Text style={styles.commentText}>Save comment</Text></TouchableOpacity>
                <TouchableOpacity disabled={!hasSubmittedInspection || busyEquipmentId === equipmentId} onPress={() => updateInspection(item, 'approve')} style={[styles.approveButton, !hasSubmittedInspection && styles.disabledButton]}><Text style={styles.buttonText}>Approve</Text></TouchableOpacity>
              </View>
            </View>;
          })}
        </View>
      </View>;
    })}
  </ScrollView>;
}

function Info({label, value}: {label: string; value?: any}) {
  return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value || '—'}</Text></View>;
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#f7f9ff'},
  content: {padding: 24, paddingBottom: 48, maxWidth: 1180, width: '100%', alignSelf: 'center'},
  back: {alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 8},
  link: {fontSize: 12, color: '#3f47d6', fontWeight: '800'},
  hero: {backgroundColor: '#242d52', borderRadius: 14, padding: 24, minHeight: 130, justifyContent: 'center'},
  eyebrow: {fontSize: 10, color: '#b8a5f8', fontWeight: '800', letterSpacing: 1.1},
  title: {fontSize: 23, color: '#fff', fontWeight: '800', marginTop: 7},
  subtitle: {fontSize: 12, color: '#d0d4e9', marginTop: 6},
  card: {backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e9f6', padding: 18, marginTop: 14},
  sectionTitle: {fontSize: 17, color: '#242d52', fontWeight: '800'},
  details: {flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 14},
  info: {flexGrow: 1, flexBasis: 160},
  infoLabel: {fontSize: 9, color: '#9095a5', fontWeight: '800'},
  infoValue: {fontSize: 13, color: '#3d4159', fontWeight: '700', marginTop: 4},
  heading: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 10},
  muted: {fontSize: 12, color: '#777c8d', marginTop: 5},
  area: {backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e9f6', marginBottom: 10, overflow: 'hidden'},
  areaHead: {padding: 16},
  areaName: {fontSize: 15, fontWeight: '800', color: '#242d52'},
  areaBody: {padding: 14, borderTopWidth: 1, borderColor: '#eef0f5', gap: 12},
  areaImage: {width: 250, height: 170, marginRight: 9, borderRadius: 7, backgroundColor: '#eef0f6'},
  equipment: {padding: 14, borderWidth: 1, borderColor: '#e8eaf1', borderRadius: 8, marginBottom: 4},
  equipmentTop: {flexDirection: 'row', gap: 10, alignItems: 'center'},
  equipmentDetails: {flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eef0f5'},
  equipmentName: {fontSize: 13, color: '#242d52', fontWeight: '800'},
  status: {fontSize: 10, color: '#555b73', fontWeight: '800'},
  equipmentImage: {width: '100%', height: 210, marginTop: 12, borderRadius: 6, backgroundColor: '#eef0f6'},
  reviewButton: {backgroundColor: '#3f47d6', padding: 11, borderRadius: 7, alignItems: 'center', marginTop: 12},
  buttonText: {color: '#fff', fontSize: 11, fontWeight: '800'},
  input: {minHeight: 64, borderWidth: 1, borderColor: '#d8dbe5', borderRadius: 6, padding: 10, color: '#272b49', marginTop: 10, textAlignVertical: 'top'},
  actions: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8},
  changeButton: {paddingHorizontal: 12, paddingVertical: 9, borderRadius: 6, backgroundColor: '#fdebed'},
  changeText: {fontSize: 10, color: '#bf3441', fontWeight: '800'},
  commentButton: {paddingHorizontal: 12, paddingVertical: 9, borderRadius: 6, backgroundColor: '#eef0ff'},
  commentText: {fontSize: 10, color: '#3f47d6', fontWeight: '800'},
  approveButton: {paddingHorizontal: 14, paddingVertical: 9, borderRadius: 6, backgroundColor: '#258455'},
  disabledButton: {opacity: 0.45},
  severityRow: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10},
  severityLabel: {fontSize: 10, color: '#555a70', fontWeight: '800', marginRight: 3},
  severityOption: {paddingHorizontal: 9, paddingVertical: 6, borderWidth: 1, borderColor: '#d8dbe5', borderRadius: 5},
  severitySelected: {borderColor: '#3f47d6', backgroundColor: '#eef0ff'},
  severityText: {fontSize: 10, color: '#666b7d', fontWeight: '700'},
  severitySelectedText: {color: '#3f47d6'},
  awaiting: {fontSize: 11, color: '#a75a0b', marginTop: 12},
  finding: {padding: 10, borderWidth: 1, borderColor: '#e5e9f6', borderRadius: 6, marginTop: 8},
  notice: {padding: 12, backgroundColor: '#eef0ff', borderRadius: 7, marginBottom: 10},
  noticeText: {fontSize: 12, color: '#3038a8', fontWeight: '700'},
  state: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#f7f9ff'},
});
