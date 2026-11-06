import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {getApiErrorMessage} from '../api/errors';
import {importSampleChecklist, approveChecklistTemplate, archiveChecklistTemplate, ChecklistQuestionDraft, ChecklistTemplate, cloneChecklistTemplate, createChecklistTemplate, editChecklistTemplate, getChecklistTemplates, previewChecklistTemplate, submitChecklistTemplate} from '../api/checklistAdmin';

const sections: ChecklistQuestionDraft['sectionCode'][] = ['Apparatus', 'Installation', 'Environment'];
const blankQuestion = (sortOrder: number): ChecklistQuestionDraft => ({text: '', sortOrder, sectionCode: 'Apparatus', isRequired: true, responseScaleCode: 'PassFailNA', applicableProtectionTypes: null, requireRemarkOnFail: false, numericReadingEnabled: false, measurementUnit: null, minimumReading: null, maximumReading: null, numericReadingRequired: false});
type TemplateForm = {name: string; grade: 'Visual' | 'Close' | 'Detailed'; standardReference: string; standardEdition: string; controlledSourceReference: string; applicableProtectionTypes: string};
const blank: TemplateForm = {name: '', grade: 'Visual', standardReference: '', standardEdition: '', controlledSourceReference: '', applicableProtectionTypes: ''};

export default function ChecklistAdminScreen({role, onBack}: {role: string; onBack?: () => void}) {
  const [items, setItems] = useState<ChecklistTemplate[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<TemplateForm>(blank);
  const [questions, setQuestions] = useState<ChecklistQuestionDraft[]>([]);
  const [comment, setComment] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems((await getChecklistTemplates()).data); }
    catch (e) { setError(getApiErrorMessage(e, 'Could not load checklists.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {void load();}, [load]);
  const selected = items.find(x => x.id === selectedId);
  const editable = !!selected && selected.lifecycleStatus === 'Draft' && ['Admin', 'Manager'].includes(role);
  const displayedQuestions = editable ? questions : selected?.questions || [];
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true); setError(''); setMessage('');
    try {await fn(); setMessage(ok); await load();}
    catch (e) {setError(getApiErrorMessage(e, 'Checklist action failed.'));}
    finally {setBusy(false);}
  };
  const field = (label: string, value: string, onChange: (v: string) => void) => <TextInput accessibilityLabel={label} placeholder={label} value={value} onChangeText={onChange} style={{padding: 10, borderWidth: 1, borderColor: '#d8ddea', borderRadius: 7, backgroundColor: '#fff'}}/>;
  const button = (label: string, onPress: () => void, disabled = false) => <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress} style={{padding: 10, backgroundColor: '#4053a0', borderRadius: 7, opacity: disabled ? 0.5 : 1}}><Text style={{color: '#fff', fontWeight: '700'}}>{label}</Text></TouchableOpacity>;
  const create = async () => {
    setBusy(true); setError('');
    try {await createChecklistTemplate({...form, standardEdition: form.standardEdition || null, controlledSourceReference: form.controlledSourceReference || null}); setCreating(false); setForm(blank); setMessage('Draft created. Open it to add checkpoints.'); await load();}
    catch (e) {setError(getApiErrorMessage(e, 'Could not create draft.'));}
    finally {setBusy(false);}
  };
  const patchQ = (i: number, patch: Partial<ChecklistQuestionDraft>) => setQuestions(old => old.map((q, n) => n === i ? {...q, ...patch} : q));
  const open = (template: ChecklistTemplate) => {
    setSelectedId(template.id); setCreating(false); setPreviewing(false); setQuestions(template.questions.map(q => ({...q})));
    setForm({name: template.name, grade: template.inspectionType, standardReference: template.standardReference || '', standardEdition: template.standardEdition || '', controlledSourceReference: template.controlledSourceReference || '', applicableProtectionTypes: template.applicableProtectionTypes || ''});
  };
  const preview = async () => {
    if (!selected) return;
    try {await previewChecklistTemplate(selected.id); setPreviewing(true); setError('');}
    catch (e) {setError(getApiErrorMessage(e, 'Could not load checklist preview.'));}
  };
  const questionView = (q: ChecklistQuestionDraft, index: number) => <View key={`${q.sortOrder}-${index}`} style={{padding: 10, backgroundColor: '#fff', borderRadius: 7, gap: 5}}>
    <Text style={{fontWeight: '700'}}>{q.sourceItemNumber ?? q.sortOrder}. {q.text}</Text>
    <Text style={{color: '#707589'}}>{q.sectionCode || 'Section not recorded (legacy)'} · {q.responseScaleCode === 'BooleanChecked' ? 'Checked / unchecked' : q.responseScaleCode || 'Response scale not recorded (legacy)'}{q.requireRemarkOnFail ? ' · Remark required on Fail' : ''}{q.numericReadingEnabled ? ` · ${q.measurementUnit || 'unit missing'} ${q.minimumReading ?? '—'}–${q.maximumReading ?? '—'}` : ''}</Text>
    <Text style={{color: '#707589'}}>Applies to {q.applicableProtectionTypes || 'all configured Ex types'}</Text>
    {!!q.applicableGrades && <Text style={{color: '#707589'}}>Source grades: {q.applicableGrades.split(',').join(', ')}</Text>}
  </View>;


  return <ScrollView contentContainerStyle={{padding: 22, gap: 12, maxWidth: 1100, width: '100%', alignSelf: 'center'}}>
    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap'}}>
      <View><Text style={{fontSize: 24, fontWeight: '800', color: '#242d52'}}>Checklist administration</Text><Text style={{color: '#707589'}}>Draft → technical approval → publish. Use approved controlled checklist content.</Text></View>
      {onBack && button('Back', onBack)}
      {button(creating ? 'Cancel' : 'New checklist', () => {setCreating(!creating); setSelectedId(''); setForm(blank); setQuestions([]);})}
    </View>
    {!!error && <Text accessibilityRole="alert" style={{color: '#a32929'}}>{error}</Text>}
    {!!message && <Text style={{color: '#26734d'}}>{message}</Text>}
    {loading && <ActivityIndicator/>}
    {creating && <View style={{padding: 14, gap: 9, backgroundColor: '#f7f8fc', borderRadius: 9}}>
      <Text style={{fontWeight: '800'}}>Create checklist draft</Text>
      {field('Template name', form.name, value => setForm(x => ({...x, name: value})))}
      <View style={{flexDirection: 'row', gap: 7}}>{(['Visual', 'Close', 'Detailed'] as const).map(grade => button(grade, () => setForm(x => ({...x, grade}))))}</View>
      {field('Standard reference', form.standardReference, value => setForm(x => ({...x, standardReference: value})))}
      {field('Standard edition', form.standardEdition, value => setForm(x => ({...x, standardEdition: value})))}
      {field('Controlled source reference', form.controlledSourceReference, value => setForm(x => ({...x, controlledSourceReference: value})))}
      {field('Applicable Ex protection types, comma separated', form.applicableProtectionTypes, value => setForm(x => ({...x, applicableProtectionTypes: value})))}
      {button('Create draft', () => {void create();}, busy)}
    </View>}
    {!creating && !selected && ['Admin', 'Manager'].includes(role) && <View style={{padding: 14, gap: 8, borderWidth: 1, borderColor: '#d8ddea', backgroundColor: '#fff'}}>
      <Text style={{fontWeight: '800'}}>Sample PDF checklist · 59 numbered points</Text>
      <Text>23 Apparatus · 33 Installation · 3 Environment. Import creates grade-specific drafts and preserves existing inspections. Review and publish through technical approval.</Text>
      {button('Import sample checklist drafts', () => {void run(importSampleChecklist, 'Sample drafts ready. Open each grade, review the mapping, and submit for independent technical approval.');}, busy)}
    </View>}
    {!creating && !selected && items.map(template => <TouchableOpacity key={template.id} accessibilityRole="button" onPress={() => open(template)} style={{padding: 14, borderWidth: 1, borderColor: '#e0e4ee', borderRadius: 9, backgroundColor: '#fff'}}>
      <Text style={{fontWeight: '800', color: '#252f50'}}>{template.name} · {template.inspectionType} · v{template.version}</Text>
      <Text style={{color: '#707589', marginTop: 4}}>{template.lifecycleStatus} · {template.standardReference || 'No standard recorded'} {template.standardEdition || ''} · {template.questions.length} checkpoints</Text>
    </TouchableOpacity>)}
    {selected && <View style={{padding: 15, gap: 11, backgroundColor: '#f7f8fc', borderRadius: 9}}>
      <TouchableOpacity onPress={() => {setSelectedId(''); setPreviewing(false);}}><Text style={{color: '#4053a0'}}>‹ All checklists</Text></TouchableOpacity>
      <Text style={{fontSize: 19, fontWeight: '800', color: '#242d52'}}>{previewing ? 'Checklist preview · ' : ''}{selected.name} · {selected.inspectionType} · v{selected.version}</Text>
      <Text style={{color: '#707589'}}>{selected.lifecycleStatus} · {selected.standardReference || 'No standard'} {selected.standardEdition || ''} · {selected.controlledSourceReference || 'No controlled source reference'}</Text>
      {previewing ? <>
        {sections.map(section => <View key={section} style={{gap: 5}}><Text style={{fontWeight: '800', color: '#252f50'}}>{section}</Text>{displayedQuestions.filter(q => q.sectionCode === section).map(questionView)}</View>)}
        {displayedQuestions.some(q => !q.sectionCode) && <View style={{gap:5}}><Text style={{fontWeight:'800',color:'#707589'}}>Section not recorded (legacy)</Text>{displayedQuestions.filter(q=>!q.sectionCode).map(questionView)}</View>}
        <Text style={{color: '#707589'}}>Template applicability: {editable ? form.applicableProtectionTypes || 'Not configured' : selected.applicableProtectionTypes || 'Not configured'} · {editable ? form.grade : selected.inspectionType} inspection</Text>
        <TouchableOpacity onPress={() => setPreviewing(false)}><Text style={{color: '#4053a0'}}>Return to editing</Text></TouchableOpacity>
      </> : <>
        {editable ? <>
          {field('Template name', form.name, value => setForm(x => ({...x, name: value})))}
          {field('Standard reference', form.standardReference, value => setForm(x => ({...x, standardReference: value})))}
          {field('Standard edition', form.standardEdition, value => setForm(x => ({...x, standardEdition: value})))}
          {field('Controlled source reference', form.controlledSourceReference, value => setForm(x => ({...x, controlledSourceReference: value})))}
          {field('Applicable Ex protection types', form.applicableProtectionTypes, value => setForm(x => ({...x, applicableProtectionTypes: value})))}
          <Text style={{color: '#707589'}}>Draft revision {selected.draftRevision}. Approved publication version {selected.version}.</Text>
          <Text style={{fontWeight: '800'}}>Checkpoint sections</Text>
          {questions.map((q, i) => <View key={`${i}-${q.sortOrder}`} style={{padding: 11, gap: 7, backgroundColor: '#fff', borderRadius: 8}}>
            <Text style={{fontWeight: '700'}}>Checkpoint {i + 1}</Text>
            {field('Checkpoint text', q.text, value => patchQ(i, {text: value}))}
            <View style={{flexDirection: 'row', gap: 6, flexWrap: 'wrap'}}>{sections.map(section => <TouchableOpacity key={section} onPress={() => patchQ(i, {sectionCode: section})} style={{padding: 7, backgroundColor: q.sectionCode === section ? '#dce4ff' : '#f0f2f7', borderRadius: 6}}><Text>{section}</Text></TouchableOpacity>)}</View>
            <Text style={{color:'#707589'}}>{q.responseScaleCode === 'BooleanChecked' ? 'Responses: checked / unchecked' : q.responseScaleCode ? 'Responses: Pass / Fail / NA' : 'Legacy response scale is not recorded; explicitly select the supported scale for this draft.'}</Text>
            {!q.responseScaleCode && <TouchableOpacity onPress={()=>patchQ(i,{responseScaleCode:'PassFailNA'})}><Text style={{color:'#4053a0'}}>Select Pass / Fail / NA</Text></TouchableOpacity>}
            {field('Question Ex applicability (optional)', q.applicableProtectionTypes || '', value => patchQ(i, {applicableProtectionTypes: value || null}))}
            <TouchableOpacity onPress={() => patchQ(i, {isRequired: !q.isRequired})}><Text>{q.isRequired ? '☑ Required' : '☐ Optional'}</Text></TouchableOpacity>
            {q.responseScaleCode === 'PassFailNA' && <TouchableOpacity onPress={() => patchQ(i, {requireRemarkOnFail: !q.requireRemarkOnFail})}><Text>{q.requireRemarkOnFail ? '☑ Remark required on Fail' : '☐ Require remark on Fail'}</Text></TouchableOpacity>}
            <TouchableOpacity onPress={() => patchQ(i, {numericReadingEnabled: !q.numericReadingEnabled, numericReadingRequired: false})}><Text>{q.numericReadingEnabled ? '☑ Numeric reading' : '☐ Add numeric reading'}</Text></TouchableOpacity>
            {q.numericReadingEnabled && <>
              {field('Measurement unit', q.measurementUnit || '', value => patchQ(i, {measurementUnit: value}))}
              {field('Minimum from approved source', q.minimumReading?.toString() || '', value => patchQ(i, {minimumReading: value ? Number(value) : null}))}
              {field('Maximum from approved source', q.maximumReading?.toString() || '', value => patchQ(i, {maximumReading: value ? Number(value) : null}))}
              <TouchableOpacity onPress={() => patchQ(i, {numericReadingRequired: !q.numericReadingRequired})}><Text>{q.numericReadingRequired ? '☑ Reading required' : '☐ Reading optional'}</Text></TouchableOpacity>
            </>}
          </View>)}
          {button('Add checkpoint', () => setQuestions(old => [...old, blankQuestion(old.length + 1)]))}
          {button('Save draft', () => {void run(() => editChecklistTemplate(selected.id, {expectedRevision: selected.draftRevision, ...form, standardEdition: form.standardEdition || null, controlledSourceReference: form.controlledSourceReference || null, questions}), 'Draft saved.');}, busy)}
          {button('Submit for technical approval', () => {void run(() => submitChecklistTemplate(selected.id), 'Submitted for technical approval.');}, busy)}
        </> : sections.map(section => <View key={section} style={{gap: 5}}><Text style={{fontWeight: '800', color: '#252f50'}}>{section}</Text>{selected.questions.filter(q => q.sectionCode === section).map(questionView)}</View>)}
        <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
          {selected.lifecycleStatus === 'Published' && ['Admin', 'Manager'].includes(role) && button('Create next version', () => {void run(() => cloneChecklistTemplate(selected.id), 'Draft created from the published version.');}, busy)}
          {selected.lifecycleStatus === 'PendingTechnicalApproval' && ['Qc', 'Admin'].includes(role) && <>{field('Technical approval comments', comment, setComment)}{button('Approve and publish', () => {void run(() => approveChecklistTemplate(selected.id, comment), 'Checklist published.');}, busy || !comment.trim())}</>}
          {selected.lifecycleStatus === 'Published' && ['Qc', 'Admin'].includes(role) && button('Archive version', () => {void run(() => archiveChecklistTemplate(selected.id), 'Version archived; inspection snapshots are retained.');}, busy)}
        </View>
        <TouchableOpacity accessibilityRole="button" onPress={() => {void preview();}}><Text style={{color: '#4053a0', fontWeight: '700'}}>Preview checklist</Text></TouchableOpacity>
      </>}
    </View>}
    {!loading && !items.length && !creating && <Text style={{color: '#707589'}}>No checklist templates. Create one from an approved controlled source.</Text>}
  </ScrollView>;
}
