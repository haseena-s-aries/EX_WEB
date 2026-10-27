import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {getApiErrorMessage} from '../api/errors';
import {approveQcInspection, getQcArea, getQcEquipmentInspection, getQcProject, requestQcChanges, startQcReview, updateQcComments} from '../api/projects';
import AuthenticatedImage from '../components/AuthenticatedImage';
import ZoomableImageViewer, {ViewerPin} from '../components/ZoomableImageViewer';

type Props = {projectId: string; projectSummary?: any; onBack: () => void};
const first = (obj: any, ...keys: string[]) => {
  for (const key of keys) if (obj?.[key] != null) return obj[key];
  return undefined;
};
const formatDate = (value: any) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
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
const LOCKED_STATUS = /approved|changes.?requested|changes required/i;
// Project-level QC status derived from every equipment inspection in the project.
// Any equipment returned for changes => project needs changes; all approved => approved.
const rollupQcStatus = (statuses: string[], fallback?: string) => {
  if (statuses.length === 0) return fallback;
  if (statuses.some(s => /changes.?requested|changes required/i.test(s))) return 'ChangesRequested';
  if (statuses.every(s => /approved/i.test(s))) return 'Approved';
  if (statuses.some(s => /in.?review/i.test(s))) return 'InReview';
  return 'PendingReview';
};
// Status text colour next to the "Review / View inspection" button.
const statusColor = (status: any) => {
  const value = String(status ?? '');
  if (/changes.?requested|changes required/i.test(value)) return '#d12f3a'; // red
  if (/approved/i.test(value)) return '#1f7a4d'; // green
  if (/pending.?review|in.?review/i.test(value)) return '#e07b00'; // orange
  return undefined; // anything else keeps the default grey
};
const imagePath = (item: any) => first(item, 'downloadUrl', 'filePath', 'layoutImagePath', 'layoutPath', 'areaImagePath', 'imagePath', 'photoPath', 'equipmentImagePath', 'equipmentPhotoPath', 'storageKey', 'path', 'url');

export default function QcProjectDetailsScreen({projectId, projectSummary, onBack}: Props) {
  const [project, setProject] = useState<any>(null);
  const [areas, setAreas] = useState<any[]>([]);
  const [areaDetails, setAreaDetails] = useState<Record<string, any>>({});
  const [inspections, setInspections] = useState<Record<string, any>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [severities, setSeverities] = useState<Record<string, 'Low' | 'Medium' | 'High' | 'Critical'>>({});
  const [viewer, setViewer] = useState<{images: string[]; index: number; title: string; subtitle?: string; pins?: ViewerPin[]} | null>(null);
  const [busyEquipmentId, setBusyEquipmentId] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<{item: any; areaName: string} | null>(null);
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

  const reviewEquipment = async (item: any, areaName: string) => {
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
      const locked = /approved|changes.?requested|changes required/i.test(currentStatus);
      if (!locked && !/in.?review/i.test(currentStatus)) {
        await startQcReview(inspectionId);
        inspection = {...inspection, qcReviewStatus: 'InReview'};
      }
      setInspections(previous => ({...previous, [id]: locked ? {...inspection, inspectionId} : {...inspection, inspectionId, qcReviewStatus: 'InReview'}}));
      setReviewing({item, areaName});
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
      // The displayed status can be out of sync with the server. If the backend says the
      // review has not been started, start it and retry the action once.
      const runAction = async () => {
        if (action === 'approve') await approveQcInspection(inspectionId, comment || undefined);
        if (action === 'change') await requestQcChanges(inspectionId, comment, severities[id] || 'Medium');
      };
      try {
        await runAction();
      } catch (actionError: any) {
        if (action === 'comment' || !/start.*review/i.test(getApiErrorMessage(actionError, ''))) throw actionError;
        try { await startQcReview(inspectionId); } catch { /* already started elsewhere; retry anyway */ }
        await runAction();
      }
      const status = action === 'approve' ? 'Approved' : action === 'change' ? 'ChangesRequested' : first(inspection, 'status', 'inspectionStatus') || 'InReview';
      if (action === 'comment') {
        await updateQcComments(inspectionId, comment);
      }
      // Re-read the inspection from the server so the UI shows what was really saved,
      // and fall back to the expected status only if that read fails.
      let saved: any = {};
      try { saved = (await getQcEquipmentInspection(id)).data || {}; } catch { saved = {}; }
      const savedStatus = first(saved, 'qcReviewStatus');
      const nextInspection = {...inspection, ...saved, inspectionId, qcReviewStatus: savedStatus || status, status: savedStatus || status, inspectionStatus: savedStatus || status, qcComments: first(saved, 'qcComments') ?? comment, comments: comment};
      const nextInspections = {...inspections, [id]: nextInspection};
      setInspections(nextInspections);
      if (action === 'approve' || action === 'change') {
        const allStatuses = Object.values(nextInspections).map((entry: any) => String(first(entry, 'qcReviewStatus', 'status', 'inspectionStatus') || 'PendingReview'));
        const projectStatus = rollupQcStatus(allStatuses, status) || status;
        setProject((previous: any) => previous ? {...previous, qcStatus: projectStatus, qcReviewStatus: projectStatus, reviewStatus: projectStatus} : previous);
        if (savedStatus && action === 'change' && !/changes.?requested|changes required/i.test(String(savedStatus))) {
          throw new Error(`The server saved the inspection as "${savedStatus}" instead of "ChangesRequested". The backend request-changes endpoint is not persisting the status.`);
        }
        if (savedStatus && action === 'approve' && !/approved/i.test(String(savedStatus))) {
          throw new Error(`The server saved the inspection as "${savedStatus}" instead of "Approved". The backend approve endpoint is not persisting the status.`);
        }
      }
      if (action !== 'comment') setReviewing(null);
      setNotice(action === 'comment' ? 'QC comment saved.' : `Inspection ${action === 'approve' ? 'approved' : 'returned for changes'}.`);
    } catch (requestError) {
      setNotice(getApiErrorMessage(requestError, 'Could not update this inspection.'));
    } finally { setBusyEquipmentId(null); }
  };

  const equipmentView = (item: any, fallbackIndex: number) => {
    const equipmentId = String(first(item, 'equipmentId', 'id') || fallbackIndex);
    const inspection = inspections[equipmentId] || {};
    const fullEquipment = first(inspection, 'equipment') || item;
    const hasSubmittedInspection = !!(first(item, 'inspectionId') || first(inspection, 'inspectionId')) && !inspection.notSubmitted;
    const statusText = first(inspection, 'qcReviewStatus', 'status', 'inspectionStatus') || first(item, 'qcReviewStatus', 'status') || (hasSubmittedInspection ? 'PendingReview' : 'Awaiting surveyor submission');
    const locked = /approved|changes.?requested|changes required/i.test(String(statusText));
    return {equipmentId, inspection, fullEquipment, hasSubmittedInspection, statusText, locked};
  };

  const viewerNode = <ZoomableImageViewer visible={!!viewer} onClose={() => setViewer(null)} images={viewer?.images || []} startIndex={viewer?.index || 0} title={viewer?.title} subtitle={viewer?.subtitle} pins={viewer?.pins} />;

  const renderReviewModal = () => {
    if (!reviewing) return null;
    const {item, areaName} = reviewing;
    const {equipmentId, inspection, hasSubmittedInspection, statusText, locked} = equipmentView(item, 0);
    const equipmentInfo = {...item, ...(first(inspection, 'equipment') || {})};
    const busy = busyEquipmentId === equipmentId;
    const disabled = !hasSubmittedInspection || busy || locked;
    const toPath = (photo: any) => (typeof photo === 'string' ? photo : imagePath(photo));
    const inspectionIdForPhotos = first(inspection, 'inspectionId') || first(item, 'inspectionId');
    const inspectionPhotoPath = (photo: any) => {
      if (typeof photo === 'string') return photo;
      const direct = first(photo, 'downloadUrl', 'filePath', 'photoPath', 'url');
      if (direct) return direct;
      const photoId = first(photo, 'fileId', 'photoId', 'id');
      return inspectionIdForPhotos && photoId ? `/qc/inspections/${inspectionIdForPhotos}/photos/${photoId}` : undefined;
    };
    const photoPaths = Array.from(new Set([
      first(equipmentInfo, 'imagePath', 'photoPath', 'equipmentImagePath', 'equipmentPhotoPath'),
      ...array(item, 'equipmentImages', 'equipmentPhotos', 'images', 'photos').map(toPath),
      ...array(inspection, 'inspectionPhotos', 'photos', 'images', 'inspectionImages').map(inspectionPhotoPath),
    ].filter(Boolean)));
    const checklist = array(inspection, 'checklistAnswers');
    const findings = array(inspection, 'findings');
    const remarks = first(inspection, 'surveyorRemarks');
    const previousComments = first(inspection, 'qcComments', 'qcComment', 'comments');
    const severity = severities[equipmentId] || 'Medium';
    const yesNo = (value: any) => (/^(true|yes|pass|passed|ok)$/i.test(String(value)) ? 'yes' : /^(false|no|fail|failed)$/i.test(String(value)) ? 'no' : null);
    return <Modal visible transparent animationType="fade" onRequestClose={() => setReviewing(null)}>
      <View style={styles.modalBackdrop}><View style={styles.modalCard}>
        <View style={styles.modalHeader}>
          <View style={{flex: 1}}><Text style={styles.eyebrowDark}>INSPECTION REVIEW</Text><Text style={styles.sectionTitle}>{first(equipmentInfo, 'tagNumber', 'equipmentId', 'name') || 'Equipment'}</Text><Text style={styles.muted}>{areaName}</Text></View>
          <Text style={styles.statusPill}>{statusText}</Text>
          <TouchableOpacity onPress={() => setReviewing(null)} style={styles.modalClose}><Text style={styles.commentText}>Close</Text></TouchableOpacity>
        </View>
        <ScrollView style={{flexGrow: 0, flexShrink: 1}} contentContainerStyle={styles.modalContent}>

          <Text style={styles.blockTitle}>Equipment Information</Text>
          <View style={styles.grid}>
            <Field label="Sequence" value={first(equipmentInfo, 'sequenceNo')} />
            <Field label="Tag Number" value={first(equipmentInfo, 'tagNumber')} />
            <Field label="Equipment ID" value={first(equipmentInfo, 'equipmentCode', 'equipmentId')} />
            <Field label="RFID Tag UID" value={first(equipmentInfo, 'rfidTagUid')} />
            <Field label="Type" value={first(equipmentInfo, 'type')} />
            <Field label="Circuit ID" value={first(equipmentInfo, 'circuitId')} />
            <Field label="Location" value={first(equipmentInfo, 'location')} />
            <Field label="Manufacturer" value={first(equipmentInfo, 'manufacturer')} />
            <Field label="Protection Details" value={first(equipmentInfo, 'protectionDetails') || first(inspection, 'certificateDetails')} />
            <Field label="Certificate Number" value={first(equipmentInfo, 'certificateNumber') || first(inspection, 'certificateNumber')} />
            <Field label="Added Date" value={formatDate(first(equipmentInfo, 'createdAt'))} />
            <Field label="Last Updated" value={formatDate(first(equipmentInfo, 'updatedAt'))} />
            <Field label="Inspection Status" value={statusText} />
          </View>

          {photoPaths.length > 0 && <>
            <Text style={styles.blockTitle}>Photos</Text>
            <View style={styles.photoGrid}>{photoPaths.map((path: any, i: number) => <TouchableOpacity key={`${path}-${i}`} accessibilityLabel="View photo" activeOpacity={0.85} onPress={() => setViewer({images: photoPaths.filter(Boolean), index: photoPaths.filter(Boolean).indexOf(path), title: String(first(equipmentInfo, 'tagNumber') || 'Inspection photo'), subtitle: areaName})}><AuthenticatedImage path={path} resizeMode="cover" style={styles.photo} /></TouchableOpacity>)}</View>
          </>}

          {checklist.length > 0 && <>
            <Text style={styles.blockTitle}>Checklist</Text>
            <View style={styles.listBox}>{checklist.map((answer: any, i: number) => {
              const value = first(answer, 'value');
              const kind = yesNo(value);
              const comment = first(answer, 'comment');
              return <View key={`answer-${i}`} style={[styles.checkRow, i > 0 && styles.checkRowBorder]}>
                <View style={{flex: 1}}><Text style={styles.checkQuestion}>{first(answer, 'question') || `Checklist item ${i + 1}`}</Text>{!!comment && <Text style={styles.muted}>{comment}</Text>}</View>
                {kind ? <Text style={[styles.chip, kind === 'yes' ? styles.chipYes : styles.chipNo]}>{kind === 'yes' ? 'Yes' : 'No'}</Text> : <Text style={styles.checkValue}>{value != null && value !== '' ? String(value) : '—'}</Text>}
              </View>;
            })}</View>
          </>}

          {findings.length > 0 && <>
            <Text style={styles.blockTitle}>Findings</Text>
            {findings.map((finding: any, i: number) => <View key={`finding-${i}`} style={styles.finding}>
              <Text style={styles.checkQuestion}>Finding {i + 1}: {first(finding, 'observation') || '—'}</Text>
              <Text style={styles.muted}>{[first(finding, 'recommendation'), first(finding, 'severity'), first(finding, 'status')].filter(Boolean).join(' · ')}</Text>
            </View>)}
          </>}

          {(!!remarks || !!previousComments) && <View style={styles.remarkBox}>
            {!!remarks && <><Text style={styles.infoLabel}>SURVEYOR REMARKS</Text><Text style={styles.remarkText}>{remarks}</Text></>}
            {!!previousComments && <><Text style={[styles.infoLabel, !!remarks && {marginTop: 10}]}>PREVIOUS QC COMMENTS</Text><Text style={styles.remarkText}>{previousComments}</Text></>}
          </View>}
        </ScrollView>

        <View style={styles.modalFooter}>
          {!!notice && <View style={[styles.notice, {marginBottom: 10}]}><Text style={styles.noticeText}>{notice}</Text></View>}
          {locked
            ? <Text style={styles.awaiting}>{/approved/i.test(String(statusText)) ? 'This inspection is approved and locked.' : 'Changes were requested. Wait for the Surveyor to resubmit the inspection.'}</Text>
            : <>
              <TextInput editable={!disabled} value={comments[equipmentId] || ''} onChangeText={value => setComments(previous => ({...previous, [equipmentId]: value}))} multiline placeholder="Add QC comments" placeholderTextColor="#9095a4" style={styles.footerInput} />
              <View style={styles.footerRow}>
                <View style={styles.severityRow}><Text style={styles.severityLabel}>Change severity</Text>{(['Low', 'Medium', 'High', 'Critical'] as const).map(level => <TouchableOpacity key={level} onPress={() => setSeverities(previous => ({...previous, [equipmentId]: level}))} style={[styles.severityOption, severity === level && styles.severitySelected]}><Text style={[styles.severityText, severity === level && styles.severitySelectedText]}>{level}</Text></TouchableOpacity>)}</View>
                <View style={styles.actionsRight}>
                  <TouchableOpacity disabled={disabled} onPress={() => updateInspection(item, 'change')} style={[styles.changeButton, disabled && styles.disabledButton]}><Text style={styles.changeText}>Request changes</Text></TouchableOpacity>
                  <TouchableOpacity disabled={disabled} onPress={() => updateInspection(item, 'comment')} style={[styles.commentButton, disabled && styles.disabledButton]}><Text style={styles.commentText}>Save comment</Text></TouchableOpacity>
                  <TouchableOpacity disabled={disabled} onPress={() => updateInspection(item, 'approve')} style={[styles.approveButton, disabled && styles.disabledButton]}><Text style={styles.buttonText}>{busy ? 'Working…' : 'Approve'}</Text></TouchableOpacity>
                </View>
              </View>
            </>}
        </View>
      </View></View>
      {viewerNode}
    </Modal>;
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
      <Info label="Created Date" value={formatDate(first(project, 'createdDate', 'createdAt'))} />
      <Info label="Due Date" value={formatDate(first(project, 'dueDate', 'reviewDueDate', 'qcDueDate'))} />
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
          {photos.length > 0 && <ScrollView horizontal>{photos.map((photo: any, photoIndex: number) => {
            const photoPaths = photos.map((entry: any) => (typeof entry === 'string' ? entry : imagePath(entry))).filter(Boolean) as string[];
            const photoPath = typeof photo === 'string' ? photo : imagePath(photo);
            const pins: ViewerPin[] = equipment.map((item: any, pinIndex: number) => {
              const view = equipmentView(item, pinIndex);
              return {
                id: String(view.equipmentId),
                label: String(first(view.fullEquipment, 'sequenceNo') ?? pinIndex + 1),
                xPercent: Number(first(item, 'xPercent') ?? first(view.fullEquipment, 'xPercent')) || 0,
                yPercent: Number(first(item, 'yPercent') ?? first(view.fullEquipment, 'yPercent')) || 0,
                title: String(first(view.fullEquipment, 'tagNumber', 'equipmentId', 'name') || `Equipment ${pinIndex + 1}`),
                lines: [[first(view.fullEquipment, 'type'), first(view.fullEquipment, 'location')].filter(Boolean).join(' · '), `QC status: ${view.statusText}`],
              };
            });
            return <TouchableOpacity key={photoIndex} accessibilityLabel="View area image" activeOpacity={0.85} onPress={() => setViewer({images: photoPaths, index: Math.max(0, photoPaths.indexOf(photoPath as string)), title: String(first(area, 'areaName', 'name') || `Area ${index + 1}`), subtitle: `${equipment.length} equipment`, pins})}><AuthenticatedImage path={photoPath} resizeMode="contain" style={styles.areaImage} /></TouchableOpacity>;
          })}</ScrollView>}
          {equipment.length === 0 ? <Text style={styles.muted}>No equipment listed in this area.</Text> : equipment.map((item: any, equipmentIndex: number) => {
            const {equipmentId, fullEquipment, hasSubmittedInspection, statusText, locked} = equipmentView(item, equipmentIndex);
            const areaLabel = String(first(area, 'areaName', 'name') || `Area ${index + 1}`);
            return <View key={equipmentId} style={styles.equipmentRow}>
              <View style={{flex: 1, minWidth: 0}}>
                <Text numberOfLines={1} style={styles.equipmentName}>{first(fullEquipment, 'tagNumber', 'equipmentId', 'name') || `Equipment ${equipmentIndex + 1}`}</Text>
                <Text numberOfLines={1} style={styles.muted}>{[first(fullEquipment, 'type'), first(fullEquipment, 'equipmentCode'), first(fullEquipment, 'location')].filter(Boolean).join(' · ') || 'Equipment'}</Text>
                {first(fullEquipment, 'rfidTagUid') ? <Text numberOfLines={1} style={styles.muted}>RFID: {first(fullEquipment, 'rfidTagUid')}</Text> : null}
                {!hasSubmittedInspection && <Text style={styles.awaiting}>Waiting for the surveyor to submit the inspection.</Text>}
              </View>
              <Text style={[styles.status, {fontWeight: '900'}, statusColor(statusText) ? {color: statusColor(statusText)} : null]}>{statusText}</Text>
              <TouchableOpacity disabled={!hasSubmittedInspection || busyEquipmentId === equipmentId} onPress={() => reviewEquipment(item, areaLabel)} style={[styles.rowButton, !hasSubmittedInspection && styles.disabledButton]}><Text style={styles.buttonText}>{busyEquipmentId === equipmentId ? 'Opening…' : locked ? 'View inspection' : 'Review inspection'}</Text></TouchableOpacity>
            </View>;
          })}
        </View>
      </View>;
    })}
    {reviewing && renderReviewModal()}
    {!reviewing && viewerNode}
  </ScrollView>;
}

function Info({label, value}: {label: string; value?: any}) {
  return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value || '—'}</Text></View>;
}

function Field({label, value}: {label: string; value?: any}) {
  return <View style={styles.field}><Text style={styles.infoLabel}>{label.toUpperCase()}</Text><Text style={styles.infoValue}>{value || '—'}</Text></View>;
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
  equipmentRow: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderColor: '#e8eaf1', borderRadius: 8, marginBottom: 4},
  rowButton: {backgroundColor: '#3f47d6', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 7, alignItems: 'center'},
  modalBackdrop: {flex: 1, backgroundColor: 'rgba(23, 29, 54, 0.62)', alignItems: 'center', justifyContent: 'center', padding: 18},
  modalCard: {width: '100%', maxWidth: 900, maxHeight: '94%', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden'},
  modalHeader: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderBottomWidth: 1, borderColor: '#e5e9f6'},
  modalContent: {padding: 20, paddingBottom: 12},
  statusPill: {fontSize: 10, color: '#5d56ba', fontWeight: '800', backgroundColor: '#f0eeff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, overflow: 'hidden'},
  blockTitle: {fontSize: 13, color: '#242d52', fontWeight: '800', marginTop: 18, marginBottom: 10},
  grid: {flexDirection: 'row', flexWrap: 'wrap'},
  field: {width: '25%', minWidth: 170, paddingRight: 14, marginBottom: 14},
  photoGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  photo: {width: 200, height: 140, borderRadius: 8, backgroundColor: '#eef0f6'},
  listBox: {borderWidth: 1, borderColor: '#e5e9f6', borderRadius: 8, overflow: 'hidden'},
  checkRow: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14},
  checkRowBorder: {borderTopWidth: 1, borderTopColor: '#eef0f5'},
  checkQuestion: {fontSize: 12, color: '#242d52', fontWeight: '700'},
  checkValue: {fontSize: 12, color: '#3d4159', fontWeight: '700'},
  chip: {fontSize: 10, fontWeight: '800', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12, overflow: 'hidden', minWidth: 44, textAlign: 'center'},
  chipYes: {color: '#1d7048', backgroundColor: '#e3f5ec'},
  chipNo: {color: '#bf3441', backgroundColor: '#fdebed'},
  remarkBox: {marginTop: 16, padding: 14, backgroundColor: '#f7f9ff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e9f6'},
  remarkText: {fontSize: 12, color: '#3d4159', marginTop: 4, lineHeight: 18},
  modalFooter: {padding: 16, borderTopWidth: 1, borderColor: '#e5e9f6', backgroundColor: '#fafbff'},
  footerInput: {minHeight: 56, maxHeight: 110, borderWidth: 1, borderColor: '#d8dbe5', borderRadius: 6, padding: 10, color: '#272b49', backgroundColor: '#fff', textAlignVertical: 'top'},
  footerRow: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10},
  actionsRight: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  modalClose: {borderRadius: 7, borderWidth: 1, borderColor: '#dce1ee', paddingVertical: 9, paddingHorizontal: 14},
  eyebrowDark: {fontSize: 10, color: '#685bd0', fontWeight: '800', letterSpacing: 1.1, marginBottom: 4},
  equipmentDetails2: {flexDirection: 'row', flexWrap: 'wrap', gap: 14},
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
