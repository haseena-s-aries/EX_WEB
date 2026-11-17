import {isPdfFile} from '../utils/isPdfFile';
import {visual} from '../theme/visual';
import {OPERATIONS_DARK} from '../theme/operationsPalette';
import apiClient from '../api/client';
import {readTsv} from '../utils/readTsv';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {Defect, DefectInput, getDefects, getRegisterEquipment, getRegisterProjects, RegisterEquipment, RegisterProject, saveDefect, saveDefectPhoto} from '../api/defects';
import {getApiErrorMessage} from '../api/errors';
import {getInspectionDefects, InspectionPhotoFile} from '../api/projects';
import AuthenticatedImage from '../components/AuthenticatedImage';
import HaerGrid from '../components/HaerGrid';
import InspectionPhotoPicker from '../components/InspectionPhotoPicker';
import {LIGHT} from '../theme/palette';
import {useThemeMode} from '../theme/useThemeMode';
import DefectWorkflowScreen from './DefectWorkflowScreen';
import RegisterDateInput from '../components/RegisterDateInput';

const OFFSHORE_ART = require('../assets/landing/industry-3.jpg');

const columns = [
  ['Action No', 119], ['Date', 139], ['Item #', 88], ['AOSD ID', 120], ['Fault Category (A, B, C)', 111],
  ['Fault Code', 110], ['Area', 108], ['Type of Inspection', 132], ['Equipment Description', 192],
  ['Observation', 207], ['Recommendation', 207], ['Status', 145], ['Photo', 133], ['Photo', 133],
  ['Remarks', 180], ['Remarks', 180],
].map(([label, width]) => ({label: String(label), width: Number(width)}));
const grades = ['Visual', 'Close', 'Detailed'];
const today = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};
const makeId = () => globalThis.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const digit = Math.floor(Math.random() * 16);
  return (c === 'x' ? digit : (digit & 3) | 8).toString(16);
});
const human = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2');
type Draft = {id: string; inspectionLinked?: boolean; data: DefectInput; isNew: boolean; photos: Record<number, InspectionPhotoFile | null>; error?: string};
type ModernRow = {
  id: string; actionReference?: string; reportedAt: string; inspectionDate?: string; failedGrades?: string;
  aosdId?: string; faultCategory?: string; remarks?: string; additionalRemarks?: string; photos?: {id:string;url:string;fileName?:string}[]; itemNumber?: string; equipmentTag?: string; areaName?: string;
  equipmentDescription?: string; grade: string; observation: string; proposedAction?: string; faultCode?: string;
  actionStatus?: string; statusCode: string; isOverdue: boolean; requiredMaterialsOrSupport?: string;
  evidence?: {id: string; url: string; role: string; fileName?: string}[];
};
type Choice = {value: string; label: string};
type Picker = {title: string; choices: Choice[]; onPick: (value: string) => void; searchable?: boolean};
const blank = (equipmentId: string): Draft => ({id: makeId(), isNew: true, photos: {}, data: {
  equipmentId, date: today(), grade: '', aosdId: '', faultCategory: '', faultCode: '', observation: '',
  recommendation: '', remarks: '', additionalRemarks: '',
}});
const edit = (row: Defect): Draft => ({id: row.id, isNew: false, photos: {}, data: {
  equipmentId: row.equipmentId, date: row.registerDate || '', grade: row.grade || '', aosdId: row.aosdId || '',
  faultCategory: row.faultCategory || '', faultCode: row.faultCode || '', observation: row.observation,
  recommendation: row.recommendation || '', remarks: row.remarks || '', additionalRemarks: row.additionalRemarks || '',
}});
const equipmentLabel = (item: RegisterEquipment) => [item.itemNumber, item.tagNumber, item.description, item.area].filter(Boolean).join(' · ');

export default function DefectRegisterScreen({role, onBack}: {role?: string; onBack?: () => void}) {
  const colors = useThemeMode() === 'dark' ? OPERATIONS_DARK : LIGHT;
  const [projects, setProjects] = useState<RegisterProject[]>([]);
  const [project, setProject] = useState('');
  const [loadedProject, setLoadedProject] = useState('');
  const [equipment, setEquipment] = useState<RegisterEquipment[]>([]);
  const [rows, setRows] = useState<Defect[]>([]);
  const [modern, setModern] = useState<ModernRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft[]>>({});
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [overdue, setOverdue] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [workflowError, setWorkflowError] = useState('');
  const [notice, setNotice] = useState('');
  const [workflow, setWorkflow] = useState('');
  const [selected, setSelected] = useState('');
  const [bulk, setBulk] = useState(false);
  const [paste, setPaste] = useState('');
  const [picker, setPicker] = useState<Picker>();
  const [pickerQuery, setPickerQuery] = useState('');
  const [preview, setPreview] = useState<{path?: string; uri?: string}>();
  const version = useRef(0);
  const pending = drafts[project] || [];
  const scoped = loadedProject === project;
  const canEditRegister = ['admin','manager','surveyor'].includes(role?.toLowerCase() ?? '');
  const mayWrite = canEditRegister && !!project && scoped && !saving && !busy;
  const reload = useCallback(async () => {
    if (!project) return;
    const request = ++version.current;
    setBusy(true);
    setError('');
    setWorkflowError('');
    const [register, options, activity] = await Promise.allSettled([
      getDefects(false, project), getRegisterEquipment(project),
      (async () => {
        if (['admin','manager','surveyor'].includes(role?.toLowerCase() ?? '')) {
          try {await apiClient.post(`/v1/inspection-activities/defects/reconcile/${project}`);}
          catch (reason) {
            if (request === version.current) setWorkflowError(getApiErrorMessage(reason,'Could not synchronize failed checkpoints.'));
          }
        }
        return getInspectionDefects(undefined, false, project);
      })(),
    ]);
    if (request !== version.current) return;
    setRows(register.status === 'fulfilled' ? register.value.data.items : []);
    setEquipment(options.status === 'fulfilled' ? options.value.data : []);
    setModern(activity.status === 'fulfilled' ? activity.value.data : []);
    if (register.status === 'rejected' || options.status === 'rejected')
      setError('Could not load the project’s defects or equipment. Use Refresh to retry.');
    if (activity.status === 'rejected') setWorkflowError(getApiErrorMessage(activity.reason, 'Could not load inspection-linked defects.'));
    setLoadedProject(project);
    setBusy(false);
  }, [project, role]);
  useEffect(() => {
    let active = true;
    getRegisterProjects().then(({data}) => {
      if (active) {setProjects(data); setProject(data[0]?.id || '');}
    }).catch(reason => {if (active) setError(getApiErrorMessage(reason, 'Could not load projects.'));});
    return () => {active = false;};
  }, []);
  useEffect(() => {void reload(); return () => {version.current++;};}, [reload]);

  const update = (fn: (current: Draft[]) => Draft[]) => setDrafts(old => ({...old, [project]: fn(old[project] || [])}));
  const add = (id = selected) => update(old => [...old, blank(id)]);
  const remove = (id: string) => update(old => old.filter(d => d.id !== id));
  const patch = (id: string, field: keyof DefectInput, value: string) => update(old =>
    old.map(d => d.id === id ? {...d, error: undefined, data: {...d.data, [field]: value}} : d));
  const choose = (value: Picker) => {setPickerQuery(''); setPicker(value);};
  const save = async () => {
    if (!pending.length || !mayWrite) return;
    setSaving(true);
    let saved = 0;
    const failed: Draft[] = [];
    try {
      for (const draft of pending) {
        let remaining = {...draft, photos: {...draft.photos}};
        try {
          if (draft.inspectionLinked) {
            const {aosdId, faultCategory, faultCode, recommendation, remarks, additionalRemarks} = draft.data;
            await apiClient.put(`/v1/inspection-activities/defects/${draft.id}/register-details`,
              {aosdId,faultCategory,faultCode,recommendation,remarks,additionalRemarks});
            saved++;
            continue;
          }
          if (!draft.data.equipmentId || !draft.data.grade || !draft.data.date || !draft.data.observation.trim())
            throw new Error('Select equipment, date and inspection grade, and enter an observation.');
          await saveDefect(project, draft.id, draft.data);
          remaining.isNew = false;
          for (const [slot, photo] of Object.entries(remaining.photos)) {
            await saveDefectPhoto(draft.id, Number(slot), photo);
            delete remaining.photos[Number(slot)];
          }
          saved++;
        } catch (reason) {
          remaining = {...remaining, error: getApiErrorMessage(reason, reason instanceof Error ? reason.message : 'Could not save this row.')};
          failed.push(remaining);
        }
      }
      update(() => failed);
      setNotice(`${saved} saved · ${failed.length} failed or incomplete`);
      await reload();
    } finally {setSaving(false);}
  };

  const button = (text: string, action: () => void, disabled = false, primary = false) =>
    <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={action}
      style={[s.button, {borderColor: colors.border, backgroundColor: primary ? '#00D9EE' : colors.elevated, opacity: disabled ? 0.48 : 1}]}>
      <Text style={{color: primary ? '#03192C' : colors.text, fontWeight: '800', fontSize: 13}}>{text}</Text>
    </Pressable>;
  const value = (text?: string | null) => <Text style={{color: colors.text, fontSize: 12}}>{text || '—'}</Text>;
  const inputStyle = [s.input, {borderColor: colors.border, color: colors.text, backgroundColor: colors.card}];
  const choices = (items: string[]) => items.map(item => ({value: item, label: human(item)}));
  const equipmentChoices = equipment.map(item => ({value: item.id, label: equipmentLabel(item)}));
  const pickEquipment = (onPick: (id: string) => void) => choose({title: 'Select equipment from this project', choices: equipmentChoices, searchable: true, onPick});
  const field = (draft: Draft, key: keyof DefectInput, label: string, multiline = false) =>
    <TextInput accessibilityLabel={label} editable={!saving} value={draft.data[key]} onChangeText={v => patch(draft.id, key, v)} multiline={multiline} style={[inputStyle, multiline && {minHeight: 66, textAlignVertical: 'top'}]} />;
  const dropdown = (draft: Draft, key: keyof DefectInput, label: string, options: string[]) =>
    button(draft.data[key] || `Select ${label}`, () => choose({title: label, choices: choices(options), onPick: v => patch(draft.id, key, v)}), saving);
  const thumbnail = (path?: string, uri?: string, fileName?: string) => (path || uri) ? isPdfFile(fileName)
    ? <AuthenticatedImage path={path} localUri={uri} fileName={fileName} style={s.photo} />
    : <Pressable accessibilityRole="button" accessibilityLabel="Preview photo" onPress={() => setPreview({path, uri})}>
    {uri ? <Image source={{uri}} style={s.photo}/> : <AuthenticatedImage path={path!} style={s.photo} placeholderText="Photo unavailable"/>}
  </Pressable> : value();
  const photoCell = (slot: number, row?: Defect, draft?: Draft) => {
    const photo = row?.photos.find(p => p.slot === `DefectPhoto${slot}`) || row?.photos.filter(p => !p.slot)[slot - 1];
    const changed = draft && Object.prototype.hasOwnProperty.call(draft.photos, slot);
    const staged = draft?.photos[slot];
    const stage = (file: InspectionPhotoFile | null) => draft && update(old => old.map(d =>
      d.id === draft.id ? {...d, photos: {...d.photos, [slot]: file}} : d));
    return <View style={s.stack}>{thumbnail(changed ? undefined : photo?.downloadUrl, staged?.uri, changed ? staged?.fileName || staged?.name : photo?.fileName)}
      {draft && <><InspectionPhotoPicker disabled={saving} onSelected={files => {if (files[0]) stage(files[0]);}}/>
        {(staged || photo && !changed) && button('Remove', () => stage(null), saving)}</>}
    </View>;
  };
  const badge = (state: string, late = false) => <Text style={[s.badge, {color: late || state === 'Open' ? colors.critical : /closed/i.test(state) ? colors.success : colors.cyan, backgroundColor: colors.elevated}]}>{late ? `${human(state)} · Overdue` : human(state)}</Text>;
  const statuses = Array.from(new Set([...rows.map(r => r.status), ...modern.map(r => r.actionStatus || r.statusCode), 'Open']));
  const match = (parts: (string | null | undefined)[], state: string, late: boolean) =>
    (!status || state === status) && (!overdue || late) && parts.join(' ').toLowerCase().includes(query.trim().toLowerCase());
  const legacyLate = (r: Defect) => !!r.inspectionDueDate && Date.parse(r.inspectionDueDate) < Date.now() && !['Closed', 'Verified'].includes(r.status);
  const visible = scoped ? [
    ...rows.filter(r => !pending.some(d => d.id === r.id) && match([r.itemNumber, r.tagNumber, r.areaName, r.equipmentDescription, r.faultCode, r.observation, r.recommendation, r.aosdId], r.status, legacyLate(r))).map(row => ({id: row.id, date: row.registerDate || row.inspectionDate, row})),
    ...modern.filter(r => !pending.some(d=>d.id===r.id) && match([r.itemNumber, r.equipmentTag, r.areaName, r.equipmentDescription, r.faultCode, r.observation, r.proposedAction, r.actionReference], r.actionStatus || r.statusCode, r.isOverdue)).map(activity => ({id: activity.id, date: activity.inspectionDate || activity.reportedAt, activity})),
  ].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)) : [];
  const currentPage = Math.min(page, Math.max(0, Math.ceil(visible.length / pageSize) - 1));
  const pageRows = visible.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const renderDefect = (row?: Defect, draft?: Draft) => {
    const item = equipment.find(e => e.id === draft?.data.equipmentId);
    const code = row?.id || draft?.id;
    return {id: code!, cells: [
      <View style={s.stack}>{value(draft?.isNew ? 'New' : code?.slice(0, 8).toUpperCase())}
        {draft ? button('Cancel', () => remove(draft.id), saving) : canEditRegister && row?.canEdit && button('Edit', () => update(old => [...old, edit(row)]), saving)}
        {draft && <Text style={{color: draft.error ? colors.critical : colors.cyan, fontSize: 11}}>{draft.error || 'Unsaved changes'}</Text>}
      </View>,
      draft ? <RegisterDateInput value={draft.data.date} disabled={saving} onChange={v => patch(draft.id, 'date', v)} style={inputStyle}/> : value(row?.registerDate || row?.inspectionDate.slice(0, 10)),
      value(item?.itemNumber || row?.itemNumber), draft ? field(draft, 'aosdId', 'AOSD ID') : value(row?.aosdId),
      draft ? dropdown(draft, 'faultCategory', 'category', ['', 'A', 'B', 'C']) : value(row?.faultCategory),
      draft ? field(draft, 'faultCode', 'Fault code') : value(row?.faultCode), value(item?.area || row?.areaName),
      draft ? dropdown(draft, 'grade', 'grade', grades) : value(row?.grade),
      draft?.isNew ? button(item ? equipmentLabel(item) : 'Select equipment', () => pickEquipment(id => patch(draft.id, 'equipmentId', id)), saving) : value(item?.description || row?.equipmentDescription),
      draft ? field(draft, 'observation', 'Observation', true) : value(row?.observation),
      draft ? field(draft, 'recommendation', 'Recommendation', true) : value(row?.recommendation),
      badge(row?.status || 'Open', row ? legacyLate(row) : false), photoCell(1, row, draft), photoCell(2, row, draft),
      draft ? field(draft, 'remarks', 'Remarks 1', true) : value(row?.remarks),
      draft ? field(draft, 'additionalRemarks', 'Remarks 2', true) : value(row?.additionalRemarks),
    ]};
  };
  const renderActivity = (r: ModernRow, draft?: Draft) => {
    const status = r.actionStatus || r.statusCode;
    const canEdit = ['admin','manager','surveyor'].includes(role?.toLowerCase() ?? '') &&
      status !== 'ClientClosed' && status !== 'Closed';
    const grade = r.failedGrades?.split(',').map(code => ({D:'Detailed',C:'Close',V:'Visual'}[code] || code)).join(' / ') || r.grade;
    return {id:r.id,cells:[
      <View style={s.stack}>
        {value(r.actionReference || r.id.slice(0,8).toUpperCase())}
        {button('Workflow',()=>setWorkflow(r.id))}
        {draft ? button('Cancel',()=>remove(draft.id),saving) : canEdit && button('Edit',()=>update(old=>[...old,{
          id:r.id, inspectionLinked:true, isNew:false, photos:{}, data:{...blank('').data,
            aosdId:r.aosdId || '', faultCategory:r.faultCategory || '', faultCode:r.faultCode || '',
            recommendation:r.proposedAction || '', remarks:r.remarks || '', additionalRemarks:r.additionalRemarks || '',
          },
        }]),saving)}
        {!!draft && <Text style={{color:draft.error?colors.critical:colors.cyan,fontSize:11}}>{draft.error || 'Unsaved changes'}</Text>}
      </View>,
      value((r.inspectionDate || r.reportedAt).slice(0,10)), value(r.itemNumber),
      draft ? field(draft,'aosdId','AOSD ID') : value(r.aosdId || 'NA'),
      draft ? dropdown(draft,'faultCategory','category',['','A','B','C']) : value(r.faultCategory),
      draft ? field(draft,'faultCode','Fault code') : value(r.faultCode),
      value(r.areaName), value(grade), value(r.equipmentDescription || r.equipmentTag), value(r.observation),
      draft ? field(draft,'recommendation','Recommendation',true) : value(r.proposedAction), badge(status,r.isOverdue),
      thumbnail(r.photos?.[0]?.url ?? r.evidence?.find(e=>e.role==='Before')?.url, undefined, r.photos?.[0]?.fileName ?? r.evidence?.find(e=>e.role==='Before')?.fileName),
      thumbnail(r.photos?.[1]?.url ?? (!r.photos?.length ? r.evidence?.find(e=>['After','Correction'].includes(e.role))?.url : undefined), undefined, r.photos?.[1]?.fileName ?? r.evidence?.find(e=>['After','Correction'].includes(e.role))?.fileName),
      draft ? field(draft,'remarks','Remarks 1',true) : value(r.remarks),
      draft ? field(draft,'additionalRemarks','Remarks 2',true) : value(r.additionalRemarks),
    ]};
  };
  const gridRows = [...pending.flatMap(d => {
    if (!d.inspectionLinked) return [renderDefect(rows.find(r=>r.id===d.id),d)];
    const row = modern.find(r=>r.id===d.id);
    return row ? [renderActivity(row,d)] : [];
  }), ...pageRows.map(entry => 'activity' in entry ? renderActivity(entry.activity) : renderDefect(entry.row))];
  const importRows = () => {
    let cells: string[][];
    try {cells = readTsv(paste);}
    catch (reason) {setError(reason instanceof Error ? reason.message : 'Could not read pasted rows.'); return;}
    setError('');
    const incoming = cells.map(line => {
      const [identifier, observation = '', recommendation = '', faultCode = '', remarks = '', additionalRemarks = ''] = line;
      const key = identifier.trim().toLowerCase();
      const matches = equipment.filter(e => e.tagNumber.toLowerCase() === key || e.itemNumber?.toLowerCase() === key);
      const draft = blank(matches.length === 1 ? matches[0].id : '');
      return {...draft, data: {...draft.data, observation, recommendation, faultCode, remarks, additionalRemarks},
        error: matches.length !== 1 ? `Choose equipment for “${identifier}”.` : undefined};
    });
    update(old => [...old, ...incoming]);
    setPaste('');
  };

  const currentProject = projects.find(p => p.id === project);
  const panel = [s.panel, {backgroundColor: colors.card, borderColor: colors.border}];
  return <ScrollView nativeID="ex-defects" style={{flex: 1, backgroundColor: colors.bg}}
    contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    {onBack && button('Back', onBack)}
    <View nativeID="ex-defects-hero" style={s.hero}>
      <Image source={OFFSHORE_ART} resizeMode="cover" style={s.heroPhoto} accessible={false} />
      <View nativeID="ex-operations-hero-overlay" pointerEvents="none"
        style={[StyleSheet.absoluteFill, Platform.OS !== 'web' && s.nativeOverlay]} />
      <Text style={s.eyebrow}>RECTIFICATION  /  DEFECTS</Text>
      <Text accessibilityRole="header" style={s.heroTitle}>Defect <Text style={s.accent}>Register</Text></Text>
      <Text style={s.heroDescription}>Manage defects by project and link them to equipment already in HAER.</Text>
    </View>
    {canEditRegister && <View style={[s.line, {justifyContent: 'flex-end'}]}>
        {button('+ Add Defect', () => add(), !mayWrite, true)}
        {button('+ Bulk Add', () => setBulk(!bulk), !mayWrite)}
        {button(saving ? 'Saving…' : 'Save Changes', () => void save(), !mayWrite || !pending.length)}
    </View>}
    <View nativeID="ex-defects-filters" style={panel}>
      <View style={[s.line, s.projectStrip, {borderColor: colors.border}]}>
        {button(currentProject?.name || 'Select project', () => choose({title: 'Project', choices: projects.map(p => ({value: p.id, label: p.name})), onPick: id => {
          setProject(id); setSelected(''); setPage(0); setStatus(''); setNotice(''); setBulk(false); setPaste('');
        }}), saving || !projects.length)}
        <View style={s.client}>
          <Text style={{color:colors.secondary,fontSize:11}}>Client Company Name</Text>
          <Text accessibilityLiveRegion="polite" style={{color:colors.text}}>
            {project ? currentProject?.clientName?.trim() || 'Client company not specified' : 'Select a project'}
          </Text>
        </View>
      </View>
      <View style={s.line}>
        <TextInput accessibilityLabel="Search defects" placeholder="Search equipment, observation, fault code, area…" placeholderTextColor={colors.muted} value={query} onChangeText={v => {setQuery(v); setPage(0);}} style={[inputStyle, {flexGrow: 1, minWidth: 170}]}/>
        {button(status ? human(status) : 'All statuses', () => choose({title: 'Status', choices: [{value: '', label: 'All statuses'}, ...choices(statuses)], onPick: v => {setStatus(v); setPage(0);}}))}
        {button(overdue ? 'Overdue only ✓' : 'Overdue only', () => {setOverdue(!overdue); setPage(0);})}
        {button('Refresh', () => void reload(), busy || saving || !project)}
      </View>
      <Text style={[s.info, {backgroundColor: colors.elevated, color: colors.text, borderColor: colors.border}]}>
        <Text style={{color: colors.cyan}}>ⓘ  </Text>Inspection-linked defects follow Aries verification and authorized client closure. Surveyors can add defects for equipment in their assigned projects.
      </Text>
    </View>
    {canEditRegister && <View style={panel}>
      <View style={s.line}>
        <Text style={{fontWeight: '700', color: colors.text}}>Add Defect for Equipment</Text>
        {button(equipment.find(e => e.id === selected) ? equipmentLabel(equipment.find(e => e.id === selected)!) : 'Select equipment', () => pickEquipment(setSelected), !mayWrite)}
        {button('Attach equipment', () => add(selected), !mayWrite || !selected)}
      </View>
      {bulk && <View style={s.stack}>
        <Text style={{color: colors.secondary}}>Paste Excel rows as tab-separated values without headers in this order. Ex-Tag or Item #, Observation, Recommendation, Fault Code, Remarks 1, Remarks 2.</Text>
        <TextInput multiline accessibilityLabel="Excel defect rows" value={paste} onChangeText={setPaste} style={[inputStyle, {minHeight: 64}]} editable={!saving}/>
        <View style={s.line}>{button('Add Row', () => add(), !mayWrite)}{button('Import pasted rows', importRows, !mayWrite || !paste.trim())}</View>
      </View>}
    </View>}
    {!!error && <Text accessibilityRole="alert" style={{color: colors.critical}}>{error}</Text>}
    {!!workflowError && <Text accessibilityRole="alert" style={{color: colors.critical}}>{workflowError}</Text>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={{color: colors.text}}>{notice}</Text>}
    {busy && <ActivityIndicator color={colors.cyan}/>}
    <View nativeID="ex-defects-register" style={panel}>
      <Text accessibilityRole="header" style={{color: colors.text, fontSize: 18, fontWeight: '800'}}>
        <Text style={{color: colors.cyan}}>⚠  </Text>{visible.length} defects{pending.length ? ` · ${pending.length} unsaved` : ''}
      </Text>
      <HaerGrid label="Defect register" columns={columns} rows={gridRows} colors={colors}/>
      {!gridRows.length && !busy && <View nativeID="ex-defects-empty" style={s.empty}>
        <Text accessible={false} style={[s.emptyIcon, {color: colors.cyan, borderColor: colors.border, backgroundColor: colors.elevated}]}>▤</Text>
        <Text style={{color: colors.text, fontWeight: '800'}}>{project ? 'No defects match this filter.' : 'No project is available.'}</Text>
      </View>}
    </View>
    <View style={[s.line, s.between]}>
      <Text style={{color: colors.secondary}}>{visible.length ? `Showing ${currentPage * pageSize + 1}–${currentPage * pageSize + pageRows.length} of ${visible.length}` : 'Showing 0 defects'}</Text>
      <View style={s.line}>
        {button('Previous', () => setPage(currentPage - 1), !currentPage)}
        <Text style={{color: colors.text}}>Page {currentPage + 1}</Text>
        {button('Next', () => setPage(currentPage + 1), (currentPage + 1) * pageSize >= visible.length)}
        {button(`${pageSize} / page`, () => choose({title: 'Rows per page', choices: choices(['10', '20', '50']), onPick: v => {setPageSize(Number(v)); setPage(0);}}))}
      </View>
    </View>
    <Modal visible={!!picker} transparent animationType="fade" onRequestClose={() => setPicker(undefined)}>
      <View style={s.overlay}><View style={[s.dialog, {backgroundColor: colors.card}]}>
        <Text style={[s.title, {color: colors.text}]}>{picker?.title}</Text>
        {picker?.searchable && <TextInput autoFocus accessibilityLabel="Search project equipment" placeholder="Search item, tag, description or area" value={pickerQuery} onChangeText={setPickerQuery} style={inputStyle}/>}
        <ScrollView keyboardShouldPersistTaps="handled" style={{maxHeight: 360}} contentContainerStyle={s.stack}>
          {picker?.choices.filter(choice => choice.label.toLowerCase().includes(pickerQuery.trim().toLowerCase())).map(choice =>
            <React.Fragment key={choice.value}>{button(choice.label || 'None', () => {picker.onPick(choice.value); setPicker(undefined);})}</React.Fragment>)}
        </ScrollView>
        {button('Cancel', () => setPicker(undefined))}
      </View></View>
    </Modal>
    <Modal visible={!!preview} transparent onRequestClose={() => setPreview(undefined)}>
      <View style={s.overlay}><View style={[s.dialog, {backgroundColor: colors.card}]}>
        {preview?.uri ? <Image source={{uri: preview.uri}} resizeMode="contain" style={s.largePhoto}/> : preview?.path && <AuthenticatedImage path={preview.path} style={s.largePhoto} placeholderText="Photo unavailable"/>}
        {button('Close preview', () => setPreview(undefined))}
      </View></View>
    </Modal>
    <Modal visible={!!workflow} onRequestClose={() => setWorkflow('')}>
      {!!workflow && <DefectWorkflowScreen role={role} projectId={project} findingId={workflow} onBack={() => {setWorkflow(''); void reload();}}/>}
    </Modal>
  </ScrollView>;
}

const s = StyleSheet.create({
  page: {padding: 16, gap: 12, width: '100%'}, line: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 9},
  hero: {minHeight: 154, padding: 22, justifyContent: 'center', gap: 6, borderWidth: 1,
    borderColor: '#126078', borderRadius: 17, backgroundColor: '#03192C', overflow: 'hidden'},
  heroPhoto: {position: 'absolute', right: 0, width: '76%', height: '100%'},
  nativeOverlay: {backgroundColor: '#03192C88'},
  eyebrow: {fontFamily: visual.mono, color: '#00D9EE', fontSize: 11, letterSpacing: 1.6, fontWeight: '800'},
  heroTitle: {fontFamily: visual.display, color: '#F5FAFF', fontSize: 38, fontWeight: '900'},
  accent: {color: '#00D9EE'},
  heroDescription: {color: '#F5FAFF', fontSize: 14, lineHeight: 20},
  between: {justifyContent: 'space-between'}, stack: {gap: 6}, title: {fontSize: 26, fontWeight: '800'},
  panel: {borderWidth: 1, borderRadius: 16, padding: 12, gap: 10, minWidth: 0},
  projectStrip: {borderBottomWidth: 1, paddingBottom: 10},
  client: {paddingHorizontal: 10, paddingVertical: 3, gap: 2},
  info: {padding: 11, borderRadius: 10, borderWidth: 1, lineHeight: 20},
  empty: {alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 122, padding: 14},
  emptyIcon: {fontSize: 22, textAlign: 'center', lineHeight: 42, width: 44, borderRadius: 22, borderWidth: 1, overflow: 'hidden'},
  button: {minHeight: 39, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 10, borderWidth: 1, justifyContent: 'center'},
  input: {borderWidth: 1, borderRadius: 9, padding: 8, minHeight: 39, fontSize: 12},
  badge: {fontWeight: '700', fontSize: 11, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 8, alignSelf: 'flex-start'},
  photo: {width: 108, height: 70, borderRadius: 5}, largePhoto: {width: '100%', height: 340},
  overlay: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 14, backgroundColor: '#0008'},
  dialog: {width: '100%', maxWidth: 620, borderRadius: 10, padding: 15, gap: 10},
});
