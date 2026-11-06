import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {getApiErrorMessage} from '../api/errors';
import {createFindingCorrectiveAction, getInspectionDefects, InspectionPhotoFile, reportCorrectiveActionRectification, submitCorrectiveActionVerification, uploadCorrectiveActionPhoto, verifyCorrectiveAction} from '../api/projects';
import AuthenticatedImage from '../components/AuthenticatedImage';
import InspectionPhotoPicker from '../components/InspectionPhotoPicker';

type Props = {role?: string; projectId?: string; findingId?: string; onBack?: () => void; onChanged?: () => void};
const label = (x: string) => x.replace(/([a-z])([A-Z])/g, '$1 $2');
const date = (x?: string) => x ? new Date(x).toLocaleString() : '—';

export default function DefectRegisterScreen({role, projectId, findingId, onBack, onChanged}: Props) {
  const [rows, setRows] = useState<any[]>([]); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [status, setStatus] = useState(''); const [overdue, setOverdue] = useState(false); const [drafts, setDrafts] = useState<Record<string, any>>({}); const [reviewComments, setReviewComments] = useState<Record<string, string>>({});
  const reload = useCallback(async () => {setBusy(true); try {setRows((await getInspectionDefects(status || undefined, overdue, projectId)).data.filter(row => !findingId || row.id === findingId)); setError('');} catch(e) {setError(getApiErrorMessage(e, 'Could not load the defect register.'));} finally {setBusy(false);}}, [status, overdue, projectId, findingId]);
  useEffect(() => {void reload();}, [reload]);
  const patchDraft = (id: string, key: string, value: string) => setDrafts(old => ({...old, [id]: {...old[id], [key]: value}}));
  const upload = async (actionId: string, roleName: 'Before' | 'After' | 'Correction', files: InspectionPhotoFile[]) => {setBusy(true); setError(''); try {for(const photo of files) await uploadCorrectiveActionPhoto(actionId, photo, roleName); await reload(); onChanged?.();} catch(e) {setError(getApiErrorMessage(e, 'Upload failed. Previously saved evidence remains available; retry the selected photo.'));} finally {setBusy(false);}};
  const report = async (row: any) => {const d = drafts[row.actionId] || {}; if (!d.description?.trim()) {setError('Enter the completed corrective action.'); return;} setBusy(true); setError(''); try {await reportCorrectiveActionRectification(row.actionId, {description: d.description, workOrderReference: d.workOrderReference || row.workOrderReference || null, rectificationAt: new Date().toISOString(), responsibleUserId: null, comments: d.comments || null}); await reload(); onChanged?.();} catch(e) {setError(getApiErrorMessage(e, 'Could not report rectification.'));} finally {setBusy(false);}};
  const submit = async (id: string) => {setBusy(true); try {await submitCorrectiveActionVerification(id); await reload(); onChanged?.();} catch(e) {setError(getApiErrorMessage(e, 'Add after or correction evidence before submission.'));} finally {setBusy(false);}};
  const verify = async (row: any, accepted: boolean) => {const comments = reviewComments[row.actionId] || ''; if (!accepted && !comments.trim()) {setError('A reason is required when rejecting rectification.'); return;} setBusy(true); try {await verifyCorrectiveAction(row.actionId, accepted, comments); await reload(); onChanged?.();} catch(e) {setError(getApiErrorMessage(e, 'Could not record verification.'));} finally {setBusy(false);}};
  const createAction = async (row: any) => {
    setBusy(true);
    setError('');
    try {
      await createFindingCorrectiveAction(row.id, {
        activityFindingId: row.id, actionReference: `CA-${row.id.slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`,
        supplementaryInformation: row.requiredMaterialsOrSupport, proposedAction: row.proposedAction,
        responsibleParty: row.responsibleParty, responsibleUserId: row.responsibleUserId || null,
      });
      await reload();
      onChanged?.();
    } catch (e) {setError(getApiErrorMessage(e, 'Could not create corrective action.'));}
    finally {setBusy(false);}
  };
  const canRectify = ['Surveyor','Manager','Admin'].includes(role || ''); const canVerify = ['Qc','Manager','Admin'].includes(role || '');
  return <ScrollView contentContainerStyle={s.page}>
    {onBack && <TouchableOpacity onPress={onBack}><Text style={s.back}>‹ Back</Text></TouchableOpacity>}
    <Text style={s.title}>Corrective action workflow</Text><Text style={s.muted}>Findings stay open until an assigned client representative closes them after Aries verification.</Text>
    {!findingId && <View style={s.row}><TextInput value={status} onChangeText={setStatus} placeholder="Filter by status (e.g. Open, Verified)" style={s.input}/><TouchableOpacity onPress={() => setOverdue(x => !x)} style={[s.button, overdue && s.on]}><Text>{overdue ? 'Showing overdue' : 'Overdue only'}</Text></TouchableOpacity><TouchableOpacity onPress={() => void reload()} style={s.button}><Text>Refresh</Text></TouchableOpacity></View>}
    {!!error && <Text style={s.error}>{error}</Text>}{busy && <ActivityIndicator color="#4053a0"/>}
    {rows.map(row => {const draft = drafts[row.actionId] || {}; return <View key={row.id} style={s.card}>
      <Text style={s.heading}>{row.faultCode || 'Defect'} · {row.equipmentTag || row.equipmentId || 'Equipment'}</Text>
      <Text style={s.muted}>{row.project} · {row.grade} · {row.checkpoint}</Text>
      <Text style={s.body}>{row.observation}</Text>
      <Text style={s.muted}>Proposed severity: {row.severityCode || 'Not assigned'} · Status: {label(row.actionStatus || row.statusCode)} · Outstanding: {row.isOutstanding ? 'Yes' : 'No'}{row.isOverdue ? ' · OVERDUE' : ''}</Text>
      <Text style={s.muted}>Reported {date(row.reportedAt)} · Age {Math.max(0, Math.floor((Date.now() - new Date(row.reportedAt).getTime()) / 86400000))} days · Due {date(row.dueAt)} · Responsible {row.actionResponsibleParty || row.responsibleParty || 'Unassigned'}</Text>
      {!!row.proposedAction && <Text style={s.muted}>Recommended action: {row.proposedAction}</Text>}
      {!!row.rectificationDescription && <Text style={s.muted}>Rectification reported: {row.rectificationDescription}</Text>}
      {!!row.workOrderReference && <Text style={s.muted}>Work order: {row.workOrderReference}</Text>}
      {(row.evidence || []).map((e: any) => <View key={e.id} style={s.evidence}><AuthenticatedImage path={e.url} style={s.photo} placeholderText="Evidence unavailable"/><Text style={s.muted}>{e.role} · {e.fileName} · {date(e.addedAt)}</Text></View>)}
      <Text style={s.subhead}>History</Text>{(row.history || []).map((h: any, i: number) => <Text key={`${h.occurredAt}-${i}`} style={s.muted}>{label(h.kind)} → {label(h.resultingStatus)} · {date(h.occurredAt)}{h.rectificationAt ? ` · repair date ${date(h.rectificationAt)}` : ''}{h.rectificationDescription ? ` · ${h.rectificationDescription}` : ''}{h.comment ? ` · ${h.comment}` : ''}</Text>)}
      {!row.actionId && canRectify && <TouchableOpacity disabled={busy} style={s.button} onPress={() => void createAction(row)}><Text>Create corrective action</Text></TouchableOpacity>}
      {row.actionId && canRectify && ['Proposed','Assigned','InProgress','ClientRejected','Reopened'].includes(row.actionStatus) && <>
        <TextInput value={draft.description || ''} onChangeText={v => patchDraft(row.actionId, 'description', v)} placeholder="Corrective action completed" multiline style={s.input}/>
        <TextInput value={draft.workOrderReference ?? row.workOrderReference ?? ''} onChangeText={v => patchDraft(row.actionId, 'workOrderReference', v)} placeholder="Work-order reference" style={s.input}/>
        <InspectionPhotoPicker disabled={busy} onSelected={files => void upload(row.actionId, 'Before', files)}/><Text style={s.muted}>Before photographs</Text>
        <InspectionPhotoPicker disabled={busy} onSelected={files => void upload(row.actionId, 'After', files)}/><Text style={s.muted}>Rectification photographs</Text>
        <TouchableOpacity disabled={busy} style={s.button} onPress={() => void report(row)}><Text>Record rectification</Text></TouchableOpacity>
        <TouchableOpacity disabled={busy} style={s.primary} onPress={() => void submit(row.actionId)}><Text style={s.primaryText}>Submit for Aries verification</Text></TouchableOpacity>
      </>}
      {row.actionId && canVerify && row.actionStatus === 'SubmittedForVerification' && <>
        <TextInput value={reviewComments[row.actionId] || ''} onChangeText={v => setReviewComments(old => ({...old, [row.actionId]: v}))} placeholder="Aries verification comments" multiline style={s.input}/>
        <View style={s.row}><TouchableOpacity disabled={busy} style={s.button} onPress={() => void verify(row, false)}><Text>Reject rectification</Text></TouchableOpacity><TouchableOpacity disabled={busy} style={s.primary} onPress={() => void verify(row, true)}><Text style={s.primaryText}>Verify correction</Text></TouchableOpacity></View>
      </>}
    </View>;})}
    {!busy && !rows.length && <Text style={s.muted}>No defects match this filter.</Text>}
  </ScrollView>;
}

const s = StyleSheet.create({page: {padding: 22, gap: 12, width: '100%', maxWidth: 1000, alignSelf: 'center'}, title: {fontSize: 26, fontWeight: '800', color: '#242d52'}, back: {color: '#4053a0', fontWeight: '700'}, muted: {fontSize: 12, color: '#707589', marginTop: 4}, card: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e9f6', padding: 16, borderRadius: 12, gap: 8}, heading: {fontSize: 17, color: '#252f50', fontWeight: '800'}, body: {color: '#343851', lineHeight: 21}, subhead: {fontWeight: '800', color: '#343851', marginTop: 10}, input: {borderWidth: 1, borderColor: '#d7dce9', borderRadius: 9, padding: 11, backgroundColor: '#fff', minWidth: 190, minHeight: 43}, row: {flexDirection: 'row', gap: 9, flexWrap: 'wrap', alignItems: 'center'}, button: {padding: 12, borderWidth: 1, borderColor: '#8992aa', borderRadius: 9}, on: {backgroundColor: '#ffe5cf'}, primary: {padding: 12, borderRadius: 9, backgroundColor: '#4053a0', alignItems: 'center'}, primaryText: {color: '#fff', fontWeight: '700'}, photo: {width: 210, height: 145, borderRadius: 8}, evidence: {marginTop: 8}, error: {color: '#a32929', backgroundColor: '#fff0f0', padding: 10, borderRadius: 8}});
