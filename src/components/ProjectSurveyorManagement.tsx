import React, {useCallback, useEffect, useState} from 'react';
import {Modal, ScrollView, Text, TextInput, TouchableOpacity, View} from 'react-native';
import apiClient from '../api/client';
import {getApiErrorMessage} from '../api/errors';
import {LIGHT} from '../theme/palette';
import {OPERATIONS_DARK} from '../theme/operationsPalette';
import {useThemeMode} from '../theme/useThemeMode';

type Surveyor = {id: string; displayName: string};
type AssignmentType = 'Shared' | 'Full' | 'Remove';
type Assignments = {
  primarySurveyorId: string;
  additionalSurveyorId: string | null;
  qcHistory?: {id: string; occurredAt: string; actorName?: string; previousPrimary?: string; previousAdditional?: string;
    primary?: string; additional?: string}[];
  history: {id: string; actorId: string; occurredAt: string; status: string; actorName?: string; previousName?: string; newName?: string; assignment: {
    previousSurveyorId: string; newSurveyorId: string; type: AssignmentType; reason: string;
  }}[];
};

export default function ProjectSurveyorManagement({projectId, surveyors, onPrimaryChanged}: {
  projectId: string; surveyors: Surveyor[]; onPrimaryChanged: (id: string) => void;
}) {
  const c = useThemeMode() === 'dark' ? OPERATIONS_DARK : LIGHT;
  const path = `/projects/${projectId}/surveyors`;
  const [data, setData] = useState<Assignments>();
  const [type, setType] = useState<AssignmentType>();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const [reason, setReason] = useState('');
  const [keep, setKeep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const name = (id?: string | null) => id ? surveyors.find(s => s.id === id)?.displayName ?? id : 'None';
  const load = useCallback(async () => {
    setError('');
    try {setData((await apiClient.get<Assignments>(path)).data);}
    catch (e) {setError(getApiErrorMessage(e, 'Could not load Surveyor assignments.'));}
  }, [path]);
  useEffect(() => {void load();}, [load]);
  const open = (value: AssignmentType) => {
    setQuery(''); setSelected(''); setReason(''); setKeep(false); setError(''); setType(value);
  };
  const save = async () => {
    if (busy || !data || !type || !reason.trim() || (type !== 'Remove' && !selected)) return;
    setBusy(true); setError('');
    try {
      const result = (await apiClient.post<Assignments>(path, {primarySurveyorId: data.primarySurveyorId,
        additionalSurveyorId: data.additionalSurveyorId, newSurveyorId: type === 'Remove' ? data.primarySurveyorId : selected,
        type, reason: reason.trim(), keepPrevious: keep})).data;
      setData(result); onPrimaryChanged(result.primarySurveyorId); setType(undefined);
    } catch (e) {setError(getApiErrorMessage(e, 'Could not update the Surveyor assignment.'));}
    finally {setBusy(false);}
  };
  const label = (value: AssignmentType) => ({Shared: 'Temporary / Shared Assignment', Full: 'Full Handover', Remove: 'Remove Additional Surveyor'})[value];
  const button = (title: string, onPress: () => void, disabled = false) =>
    <TouchableOpacity accessibilityRole="button" onPress={onPress} disabled={disabled} style={{backgroundColor: c.elevated, borderColor: c.border, borderWidth: 1, borderRadius: 6, padding: 10, opacity: disabled ? .5 : 1}}><Text style={{color: c.text, fontWeight: '700'}}>{title}</Text></TouchableOpacity>;
  const input = {borderWidth: 1, borderColor: c.border, borderRadius: 6, color: c.text, padding: 10};
  return <View style={{gap: 8, marginBottom: 16}}>
    <Text accessibilityRole="header" style={{color: c.text, fontSize: 16, fontWeight: '800'}}>Surveyor Team</Text>
    <Text style={{color: c.text}}>Primary Surveyor: {data ? name(data.primarySurveyorId) : 'Loading…'}</Text>
    <Text style={{color: c.text}}>Additional Surveyor: {data ? name(data.additionalSurveyorId) : 'Loading…'}</Text>
    {!!error && !type && <Text accessibilityRole="alert" style={{color: c.critical}}>{error}</Text>}
    <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
      {button('Add Surveyor', () => open('Shared'), !data || !!data.additionalSurveyorId)}
      {button('Handover Project', () => open('Full'), !data)}
      {!!data?.additionalSurveyorId && button('Remove Additional Surveyor', () => open('Remove'))}
      {button('Assignment / Handover History', () => setShowHistory(value => !value), !data)}
      {button('Refresh assignments', () => void load())}
    </View>
    {showHistory && <View style={{gap: 8}}>
      <Text accessibilityRole="header" style={{color: c.text, fontWeight: '800'}}>Assignment History</Text>
      {!data?.history.length && !data?.qcHistory?.length && <Text style={{color: c.muted}}>No assignment changes recorded.</Text>}
      {data?.history.map(event => <View key={event.id} style={{padding: 8, backgroundColor: c.elevated}}>
      <Text style={{color: c.text}}>{label(event.assignment.type)} · {event.previousName || name(event.assignment.previousSurveyorId)} → {event.newName || name(event.assignment.newSurveyorId)}</Text>
      <Text style={{color: c.muted}}>{new Date(event.occurredAt).toLocaleString()} · {event.status} · By {event.actorName || name(event.actorId)}</Text>
      <Text style={{color: c.text}}>{event.assignment.reason}</Text>
      </View>)}
      {data?.qcHistory?.map(event => <View key={event.id} style={{padding: 8, backgroundColor: c.elevated}}>
        <Text style={{color: c.text}}>Primary QC · {event.previousPrimary || 'None'} → {event.primary || 'None'}</Text>
        <Text style={{color: c.text}}>Additional QC · {event.previousAdditional || 'None'} → {event.additional || 'None'}</Text>
        <Text style={{color: c.muted}}>{new Date(event.occurredAt).toLocaleString()} · By {event.actorName || 'Unknown'}</Text>
      </View>)}
    </View>}
    {!!type && <Modal transparent visible onRequestClose={() => {if (!busy) setType(undefined);}}>
      <View style={{flex: 1, justifyContent: 'center', padding: 16, backgroundColor: '#0008'}}>
        <ScrollView keyboardShouldPersistTaps="handled" style={{flexGrow: 0, maxHeight: '90%', width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: c.card, borderRadius: 10}} contentContainerStyle={{padding: 16, gap: 10}}>
          <Text accessibilityRole="header" style={{color: c.text, fontSize: 20, fontWeight: '800'}}>{label(type)}</Text>
          <Text style={{color: c.text}}>Current Primary Surveyor: {name(data?.primarySurveyorId)}</Text>
          {type !== 'Remove' && <>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
              {button('Temporary / Shared', () => setType('Shared'), busy || type === 'Shared' || !!data?.additionalSurveyorId)}
              {button('Full Handover', () => setType('Full'), busy || type === 'Full')}
            </View>
            <TextInput accessibilityLabel="Search Surveyors" placeholder="Search Surveyors" placeholderTextColor={c.muted} style={input} value={query} onChangeText={setQuery} editable={!busy}/>
            {!!selected && <Text style={{color: c.text}}>New Surveyor: {name(selected)}</Text>}
            {surveyors.filter(s => s.id !== data?.primarySurveyorId && s.displayName.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 10).map(s => <View key={s.id}>{button(s.displayName, () => setSelected(s.id), busy || selected === s.id)}</View>)}
            {type === 'Full' && button(keep ? '✓ Keep previous Surveyor' : 'Keep previous Surveyor', () => setKeep(v => !v), busy)}
          </>}
          <TextInput accessibilityLabel="Assignment reason" placeholder="Reason / notes (required)" placeholderTextColor={c.muted} multiline maxLength={1000} style={input} value={reason} onChangeText={setReason} editable={!busy}/>
          {!!error && <Text accessibilityRole="alert" style={{color: c.critical}}>{error}</Text>}
          <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
            {button('Cancel', () => setType(undefined), busy)}
            {button(busy ? 'Saving…' : 'Confirm Assignment', () => void save(), busy || !reason.trim() || (type !== 'Remove' && !selected))}
          </View>
        </ScrollView>
      </View>
    </Modal>}
  </View>;
}
