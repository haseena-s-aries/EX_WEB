import {notifyProjectChanged, onProjectChanged} from '../api/projectChanges';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {OPERATIONS_DARK} from '../theme/operationsPalette';
import {Modal, ScrollView, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {getProjectWorkSchedule, ProjectWorkSchedule, saveProjectWorkSchedule} from '../api/projects';
import {getApiErrorMessage} from '../api/errors';
import {DARK, LIGHT} from '../theme/palette';
import {useThemeMode} from '../theme/useThemeMode';
import ProjectDateField from './ProjectDateField';
import {projectDisplay} from '../utils/projectDisplay';

const requestId = () => globalThis.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
  const value = Math.floor(Math.random() * 16);
  return (char === 'x' ? value : (value & 3) | 8).toString(16);
});
const display = (value?: string | null) => value || '—';
const daysBetween = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 86_400_000;

export default function ProjectWorkSchedulePanel({projectId, projectName, editable = false, overview = false}: {
  projectId: string; projectName: string; editable?: boolean; overview?: boolean;
}) {
  const c = useThemeMode() === 'dark' ? (overview ? OPERATIONS_DARK : DARK) : LIGHT;
  const [data, setData] = useState<ProjectWorkSchedule>();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const pending = useRef<{key: string; id: string} | null>(null);
  const saving = useRef(false);
  const load = useCallback(async () => {
    const response = (await getProjectWorkSchedule(projectId)).data;
    setData(response);
    setStart(response.mine?.workStartDate || '');
    setEnd(response.mine?.expectedWorkEndDate || '');
    setReason(response.mine?.delayReason || '');
  }, [projectId]);
  useEffect(() => {void load().catch(e => setError(getApiErrorMessage(e, 'Could not load the work schedule.')));}, [load]);

  // Refresh saved server indicators without replacing a Surveyor's unsaved dates.
  useEffect(() => {
    const refresh = () => {
      if (saving.current) return;
      void getProjectWorkSchedule(projectId).then(response => setData(response.data)).catch(() => {});
    };
    const unsubscribe = onProjectChanged(id => {if (id === projectId) refresh();});
    if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('focus', refresh);
    return () => {unsubscribe(); if (typeof window !== 'undefined' && window.removeEventListener) window.removeEventListener('focus', refresh);};
  }, [projectId]);
  const target = data?.targetDate;
  const expectsDelay = !!target && end > target;
  const delayedDays = target ? Math.max(0, daysBetween(target, expectsDelay ? end : data.today)) : 0;
  const canEdit = editable && !!target && data.summary.status !== 'Completed';
  const submit = async (confirmed: boolean) => {
    if (saving.current || !canEdit) return;
    setError(''); setNotice('');
    if (!start || !end || end < start) {
      setError('Select both dates. Expected Work End Date must be on or after Work Start Date.');
      return;
    }
    if (!confirmed && (expectsDelay || data.reasonRequired)) {setDialog(true); return;}
    if (confirmed && !reason.trim()) {setError('Delay Reason is required.'); return;}
    const delayReason = confirmed ? reason.trim() : undefined;
    const key = JSON.stringify([projectId, start, end, delayReason]);
    if (pending.current?.key !== key) pending.current = {key, id: requestId()};
    saving.current = true; setBusy(true);
    try {
      const saved = await saveProjectWorkSchedule(projectId, {requestId: pending.current.id, workStartDate: start, expectedWorkEndDate: end, delayReason});
      pending.current = null;
      setDialog(false);
      setNotice('Work schedule saved.');
      if (saved?.data?.summary) {
        setData(saved.data); setStart(saved.data.mine?.workStartDate || ''); setEnd(saved.data.mine?.expectedWorkEndDate || ''); setReason(saved.data.mine?.delayReason || '');
      } else await load();
      notifyProjectChanged(projectId);
    } catch (e) {setError(getApiErrorMessage(e, 'Could not save or refresh the work schedule.'));}
    finally {saving.current = false; setBusy(false);}
  };
  const button = (label: string, onPress: () => void, disabled = false) =>
    <TouchableOpacity accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={{padding: 10, alignSelf: 'flex-start', backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border, borderRadius: 6, opacity: disabled ? .55 : 1}}>
      <Text style={{color: c.text, fontWeight: '700'}}>{label}</Text>
    </TouchableOpacity>;
  const original = new Map<string, {start?: string | null; end?: string | null}>();
  for (const {entry} of [...(data?.history ?? [])].reverse()) {
    if (entry.kind === 'Schedule' && entry.actorId && !original.has(entry.actorId))
      original.set(entry.actorId, {start: entry.workStartDate, end: entry.expectedWorkEndDate});
  }
  return <View testID={overview ? 'project-view-card' : undefined}
    style={{gap: 10, padding: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: overview ? 15 : 10}}>
    <Text accessibilityRole="header" style={{color: c.text, fontWeight: '800', fontSize: 18}}>{editable ? 'Survey Work Schedule' : 'Schedule & Delay History'}</Text>
    {!data && !error && <Text style={{color: c.muted}}>Loading schedule…</Text>}
    {!!error && !dialog && <Text accessibilityRole="alert" style={{color: c.critical}}>{error}</Text>}
    {!data && !!error && button('Retry schedule', () => {setError(''); void load().catch(e => setError(getApiErrorMessage(e, 'Could not load the work schedule.')));})}
    {!!notice && <Text accessibilityLiveRegion="polite" style={{color: c.text}}>{notice}</Text>}
    {!!data && <>
      <View style={overview ? {flexDirection: 'row', flexWrap: 'wrap', gap: 12} : {gap: 10}}>
        {[
          {label: 'Project Target Date', value: display(target), color: c.text},
          {label: 'Schedule Status', value: data.summary.status + (data.summary.delayDays > 0 ? ` · ${data.summary.delayDays} calendar days` : ''),
            color: data.summary.status === 'Overdue' ? c.critical : data.summary.status === 'Delay Expected' ? c.amber : data.summary.status === 'On Track' ? c.success : overview ? c.cyan : c.text},
          {label: 'Project Expected Completion', value: display(data.summary.expectedCompletion), color: overview ? c.text : c.muted},
        ].map(({label, value, color}) => overview ? (
          <View key={label} style={{flexGrow: 1, flexBasis: 180, gap: 4, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.border}}>
            <Text style={{color: c.secondary, fontSize: 13}}>{label}</Text>
            <Text style={{color, fontSize: 16, fontWeight: '800'}}>{value}</Text>
          </View>
        ) : <Text key={label} style={{color}}>{label}: {value}</Text>)}
      </View>
      {!!data.summary.latestDelayReason && <Text style={{color: c.text}}>Latest delay reason: {data.summary.latestDelayReason}</Text>}
      {editable && !target && <Text style={{color: c.muted}}>An Admin or Manager must set the Target Date before you can save a schedule.</Text>}
      {canEdit && <>
        {data.reasonRequired && <Text style={{color: c.critical}}>This project is overdue. Submit your work dates and a delay reason.</Text>}
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
          <View style={{flex: 1, minWidth: 180}}><ProjectDateField label="Work Start Date" required value={start} onChange={setStart} disabled={busy} /></View>
          <View style={{flex: 1, minWidth: 180}}><ProjectDateField label="Expected Work End Date" required value={end} disabled={busy}
            onChange={value => {
              setEnd(value);
              if (start && value >= start && value > target) {setError(''); setDialog(true);}
            }} /></View>
        </View>
        {button(busy ? 'Saving…' : 'Save Work Schedule', () => void submit(false), busy)}
      </>}
      {button(showHistory ? 'Hide Schedule & Delay History' : 'Show Schedule & Delay History', () => setShowHistory(v => !v))}
      {showHistory && (!data.history.length ? <Text style={{color: c.muted}}>No schedule changes recorded.</Text> : data.history.map(({entry, submittedBy, emailStatuses}) => {
        const first = entry.actorId ? original.get(entry.actorId) : undefined;
        return <View key={entry.id} style={{gap: 4, padding: 10, backgroundColor: c.elevated, borderRadius: 6}}>
          <Text style={{color: c.text, fontWeight: '700'}}>{entry.kind === 'Target' ? 'Target Date updated' : entry.kind === 'Overdue' ? 'Overdue alert' : 'Work schedule saved'}</Text>
          <Text style={{color: c.muted}}>{submittedBy || 'System'} · {new Date(entry.occurredAt).toLocaleString()}</Text>
          <Text style={{color: c.text}}>Target Date: {entry.kind === 'Target' && entry.previousTargetDate ? `${entry.previousTargetDate} → ` : ''}{display(entry.targetDate)}</Text>
          {entry.kind === 'Schedule' && <>
            <Text style={{color: c.text}}>Original Work Start: {display(first?.start)} · Original Expected End: {display(first?.end)}</Text>
            <Text style={{color: c.text}}>Work Start: {display(entry.workStartDate)} · Revised Expected End: {display(entry.expectedWorkEndDate)}</Text>
          </>}
          {entry.delayDays > 0 && <Text style={{color: c.text}}>{entry.delayDays} calendar days delayed{entry.delayReason ? ` · ${entry.delayReason}` : ''}</Text>}
          {!!emailStatuses.length && <Text style={{color: c.muted}}>Email: {emailStatuses.map(status => status === 'Accepted' ? 'Accepted by SMTP' : status === 'Sending' ? 'Awaiting confirmation' : status).join(', ')}</Text>}
        </View>;
      }))}
    </>}
    {dialog && <Modal visible transparent onRequestClose={() => {if (!busy) setDialog(false);}}>
      <View style={{flex: 1, justifyContent: 'center', padding: 16, backgroundColor: '#0008'}}>
        <ScrollView keyboardShouldPersistTaps="handled" style={{flexGrow: 0, maxHeight: '90%', width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: c.card, borderRadius: 10}}
          contentContainerStyle={{padding: 18, gap: 10}}>
          <Text accessibilityRole="header" style={{color: c.text, fontWeight: '800', fontSize: 20}}>Project Delay Alert</Text>
          <Text style={{color: c.text}}>{expectsDelay
            ? "The selected expected completion date exceeds the project's Target Date. Please provide a reason for the delay before proceeding."
            : 'The project is overdue. Please provide a reason for the delay before proceeding.'}</Text>
          <Text style={{color: c.text, fontWeight: '700'}}>{projectDisplay(projectName)}</Text>
          <Text style={{color: c.text}}>Target Date: {display(target)} · Expected Work End Date: {display(end)}</Text>
          <Text style={{color: c.text}}>Number of Calendar Days Delayed: {delayedDays}</Text>
          <Text style={{color: c.text, fontWeight: '700'}}>Delay Reason *</Text>
          <TextInput accessibilityLabel="Delay Reason" value={reason} onChangeText={setReason} editable={!busy} multiline maxLength={2000}
            style={{color: c.text, minHeight: 100, textAlignVertical: 'top', borderRadius: 6, borderWidth: 1, borderColor: c.border, padding: 10}} />
          {!!error && <Text accessibilityRole="alert" style={{color: c.critical}}>{error}</Text>}
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
            {button('Cancel', () => {setDialog(false); setError('');}, busy)}
            {button(busy ? 'Saving…' : 'Submit Delay Reason', () => void submit(true), busy)}
          </View>
        </ScrollView>
      </View>
    </Modal>}
  </View>;
}
