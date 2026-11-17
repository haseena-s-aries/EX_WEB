import {visual} from '../theme/visual';
import {OPERATIONS_DARK} from '../theme/operationsPalette';
import {readTsv} from '../utils/readTsv';
import React, {useEffect, useMemo, useState} from 'react';
import {Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {
  bulkRegisterEquipment, editEquipmentIdentification, getEquipmentRegistrationProjects,
} from '../api/equipmentIdentification';
import {getApiErrorMessage} from '../api/errors';
import type {EquipmentRow} from '../api/adminEquipment';
import {inspectionLabel} from '../api/adminEquipment';
import {getHaerRegister, HaerRegisterRow} from '../api/reports';
import HaerAreaManager from '../components/HaerAreaManager';
import HaerGrid from '../components/HaerGrid';
import SearchableOptionPicker from '../components/SearchableOptionPicker';
import {equipmentOptions, equipmentTypes, zoneOptions} from '../equipment/equipmentOptions';
import {LIGHT} from '../theme/palette';
import {useThemeMode} from '../theme/useThemeMode';
import {projectDisplay} from '../utils/projectDisplay';

const OFFSHORE_ART = require('../assets/landing/industry-3.jpg');

type Props = {
  onEquipmentPress: (projectId: string) => void;
  onDocumentsPress?: (row: EquipmentRow) => void;
  refreshVersion?: number;
  creationOnly?: boolean;
};
const TECHNICAL = [
  ['manufacturer', 'Manufacturer', 155, 200],
  ['serialNumber', 'Serial No', 135, 150],
  ['hazardousAreaZone', 'Zone/Division', 120, 100],
  ['exProtectionType', 'Protection', 126, 150],
  ['gasGroup', 'Gas Group', 100, 100],
  ['temperatureClass', 'Temp Class', 100, 100],
  ['ambientTemperatureRange', 'Amb Temp', 111, 100],
  ['ipRating', 'IP/NEMA Code', 116, 50],
  ['notifiedBody', 'Notified Body', 135, 250],
  ['certificateNumber', 'Cert/EC #', 128, 150],
  ['specialConditionsOfUse', 'Special Conditions', 180, 2000],
] as const;
const COLUMNS = [
  {label:'Sl. No', width:65}, {label:'Project Name', width:200}, {label:'Item #', width:117}, {label:'Ex-Tag', width:158},
  {label:'Area', width:135}, {label:'Description', width:205},
  {label:'Manufacturer', width:155}, {label:'Type/Model', width:173},
  ...TECHNICAL.slice(1).map(([, label, width]) => ({label, width})),
  {label:'Type of Inspection (V, C, D)', width:141}, {label:'Date of Last Inspection', width:142},
  {label:'Comments', width:210}, {label:'Status', width:150},
];
const LIMITS: Record<string, number> = {
  tagNumber: 100, equipmentCode: 100, description: 1000, type: 100, model: 200,
  ...Object.fromEntries(TECHNICAL.map(([key,,, limit]) => [key, limit])),
};
type Choice = {id: string; label: string};
type RegisterRow = HaerRegisterRow & {projectId: string; projectName: string};
type Draft = {
  id: string; areaId: string; equipmentName: string; existing?: RegisterRow;
  values: Record<string, string>; errors: Record<string, string>; error?: string;
};
const EMPTY = Object.fromEntries(Object.keys(LIMITS).map(key => [key, '']));
const PAGE_SIZE = 20;
const ALL_PROJECTS = 'all';
const makeId = () => globalThis.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
  const value = Math.floor(Math.random() * 16);
  return (char === 'x' ? value : (value & 3) | 8).toString(16);
});

export default function AdminEquipmentListScreen({onEquipmentPress, onDocumentsPress, refreshVersion, creationOnly = false}: Props) {
  const mode = useThemeMode();
  const c = mode === 'dark' ? OPERATIONS_DARK : LIGHT;
  const [projects, setProjects] = useState<Awaited<ReturnType<typeof getEquipmentRegistrationProjects>>['data']>([]);
  const [projectId, setProjectId] = useState(ALL_PROJECTS);
  const [rows, setRows] = useState<RegisterRow[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [projectError, setProjectError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [bulk, setBulk] = useState(false);
  const [paste, setPaste] = useState('');
  const [pasteError, setPasteError] = useState('');
  const [message, setMessage] = useState('');
  const [picker, setPicker] = useState('');
  const [projectPicker, setProjectPicker] = useState(false);
  const [projectQuery, setProjectQuery] = useState('');
  const [manageAreas, setManageAreas] = useState(false);
  const currentProject = projects.find(item => item.id === projectId);
  const areas = currentProject?.areas.map(area => ({id: area.id, label: projectDisplay(area.areaName)})) ?? [];
  const projectChoices = [{id: ALL_PROJECTS, label: 'All Projects'}, ...projects.map(project => ({id: project.id, label: projectDisplay(project.projectName)}))];
  const registerProjectIds = projectId === ALL_PROJECTS ? projects.map(project => project.id).join(',') : projectId;

  useEffect(() => {
    let active = true;
    setLoadingProjects(true);
    setProjectError('');
    getEquipmentRegistrationProjects().then(({data}) => {
      if (!active) return;
      setProjects(data);
      setProjectId(previous => previous === ALL_PROJECTS || data.some(project => project.id === previous) ? previous : ALL_PROJECTS);
    }).catch(error => {if (active) setProjectError(getApiErrorMessage(error, 'Could not load HAER projects.'));})
      .finally(() => {if (active) setLoadingProjects(false);});
    return () => {active = false;};
  }, [refreshVersion, refresh]);

  useEffect(() => {
    if (!registerProjectIds) {setRows([]); setLoading(false); return;}
    let active = true;
    setLoading(true);
    setLoadError('');
    Promise.all(registerProjectIds.split(',').map(async id => {
      const {data} = await getHaerRegister(id);
      return data.equipment.map(row => ({...row, projectId: id, projectName: data.projectName}));
    })).then(groups => {if (active) setRows(groups.flat());})
      .catch(error => {if (active) setLoadError(getApiErrorMessage(error, 'Could not load this HAER register.'));})
      .finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, [registerProjectIds, refresh, refreshVersion]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter(row => !term || [
      row.itemNumber ?? row.equipmentId, row.tagNumber, row.equipmentName, row.area, row.description,
      row.manufacturer, row.serialNumber, row.model, row.equipmentType, row.rfidTagUid, row.certificateNumber, row.projectName, inspectionLabel(row.inspectionStatus),
    ].some(value => value?.toLowerCase().includes(term)));
  }, [rows, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visiblePage = Math.min(page, pageCount);
  const displayed = filtered.slice((visiblePage - 1) * PAGE_SIZE, visiblePage * PAGE_SIZE);

  const button = (label: string, action: () => void, disabled = false, primary = false, stretch = false) => (
    <TouchableOpacity accessibilityRole="button" onPress={action} disabled={disabled} style={[
      styles.button, {borderColor: c.border, backgroundColor: primary ? '#00D9EE' : c.elevated, opacity: disabled ? .45 : 1},
      stretch && styles.stretchedButton,
    ]}>
      <Text style={{color: primary ? '#03192C' : c.text, fontWeight: '700'}}>{label}</Text>
    </TouchableOpacity>
  );
  const rowAction = (label: string, action: () => void, disabled = false) =>
    <TouchableOpacity accessibilityRole="button" onPress={action} disabled={disabled} style={{paddingVertical:4, opacity:disabled ? .45 : 1}}>
      <Text style={{color:c.cyan, fontWeight:'700', fontSize:11}}>{label}</Text>
    </TouchableOpacity>;
  const text = (value: string | number | null | undefined) => <Text style={{color: c.text, fontSize: 12}}>{value ?? '—'}</Text>;
  function choice(key: string, label: string, value: string, choices: Choice[], onChange: (value: string) => void, disabled = false) {
    return <View style={styles.choice}>
      {button(choices.find(option => option.id === value)?.label ?? label, () => setPicker(picker === key ? '' : key), disabled)}
      {picker === key && !disabled && <ScrollView nestedScrollEnabled style={{maxHeight: 155}}>
        {choices.map(option => <View key={option.id}>{button(option.label, () => {onChange(option.id); setPicker('');})}</View>)}
      </ScrollView>}
    </View>;
  }
  function createDraft(): Draft {
    return {id: makeId(), areaId: areas.length === 1 ? areas[0].id : '', equipmentName: '', values: {...EMPTY}, errors: {}};
  }
  function add() {
    setDrafts(previous => [...previous, createDraft()]);
    setMessage('');
  }
  function edit(row: RegisterRow) {
    setDrafts(previous => [...previous, {id: row.equipmentRecordId, areaId: row.areaId, equipmentName: row.equipmentName ?? '',
      existing: row, values: {
        ...Object.fromEntries(TECHNICAL.map(([key]) => [key, row[key] ?? ''])),
        equipmentCode: row.itemNumber ?? '', tagNumber: row.tagNumber, description: row.description ?? '',
        type: row.equipmentType, model: row.model ?? '',
      }, errors: {}}]);
  }
  function patch(id: string, key: string, value: string) {
    setDrafts(previous => previous.map(row => row.id === id ? {
      ...row, values: {...row.values, [key]: value}, errors: {...row.errors, [key]: ''}, error: undefined,
    } : row));
  }
  function pasteRows() {
    setPasteError('');
    try {
      const cells = readTsv(paste);
      if (cells[0]?.[0]?.trim().toLowerCase().replace(/[^a-z]/g, '') === 'slno') cells.shift();
      if (!cells.length || cells.some(row => row.length !== 21 && row.length !== COLUMNS.length))
        throw new Error('Paste 22 columns in the displayed order, or the original 21 columns without Project Name. Keep empty cells in their columns.');
      if (drafts.length + cells.length > 100) throw new Error('Save or remove rows before adding more than 100 pending rows.');
      const imported = cells.map(cellsRow => {
        // Project is always supplied by the selected project, never by pasted text.
        const row = cellsRow.length === COLUMNS.length ? [cellsRow[0], ...cellsRow.slice(2)] : cellsRow;
        const draft = createDraft();
        const [type, ...model] = row[6].split(' / ');
        const area = areas.find(option => option.label.toLowerCase() === row[3].trim().toLowerCase());
        const errors: Record<string, string> = row[3].trim() && !area ? {areaId: 'Choose an area from this project.'} : {};
        return {...draft, areaId: area?.id ?? (row[3].trim() ? '' : draft.areaId), errors, values: {
          equipmentCode: row[1], tagNumber: row[2], description: row[4], manufacturer: row[5], type, model: model.join(' / '),
          ...Object.fromEntries(TECHNICAL.slice(1).map(([key], index) => [key, row[index + 7]])),
        }};
      });
      setDrafts(previous => [...previous, ...imported]);
      setPaste('');
    } catch (error) {setPasteError(error instanceof Error ? error.message : 'Could not read the pasted rows.');}
  }
  async function save() {
    if (saving || !projectId || !drafts.length) return;
    setSaving(true);
    setMessage('');
    const results = new Map<string, {error?: string; fields?: Record<string, string>}>();
    const groups = new Map<string, Draft[]>();
    const payload = (row: Draft) => ({
      tagNumber: row.values.tagNumber, equipmentCode: row.values.equipmentCode, equipmentName: row.equipmentName,
      description: row.values.description, type: row.values.type,
      haerFields: Object.fromEntries(['model', ...TECHNICAL.map(([key]) => key)]
        .filter(key => !row.existing || row.values[key] !== (row.existing[key as keyof HaerRegisterRow] ?? ''))
        .map(key => [key, row.values[key]])),
    });
    try {
      for (const row of drafts) {
        const fields: Record<string, string> = {};
        if (!row.values.tagNumber.trim()) fields.tagNumber = 'Enter an equipment tag.';
        if (!row.values.type.trim()) fields.type = 'Enter an equipment type.';
        if (!row.existing && !areas.some(area => area.id === row.areaId)) fields.areaId = 'Choose an area in this project.';
        for (const [key, limit] of Object.entries(LIMITS)) {
          if (row.values[key]?.trim().length > limit) fields[key] = `Use at most ${limit} characters.`;
        }
        if (Object.keys(fields).length) {results.set(row.id, {error:'Correct the highlighted fields.', fields}); continue;}
        if (row.existing) {
          try {await editEquipmentIdentification(row.id, payload(row)); results.set(row.id, {});}
          catch (error) {
            const server = (error as {response?: {data?: {errors?: Record<string, string | string[]>}}})?.response?.data?.errors;
            results.set(row.id, {error: getApiErrorMessage(error, 'Could not save this equipment record.'),
              fields: server && Object.fromEntries(Object.entries(server).map(([key, value]) => [key, Array.isArray(value) ? value.join(' ') : value]))});
          }
        } else groups.set(row.areaId, [...(groups.get(row.areaId) ?? []), row]);
      }
      for (const [areaId, items] of groups) {
        try {
          const {data} = await bulkRegisterEquipment({projectId, areaId, requireRfid:false, rows:items.map(row => ({
            clientId: row.id, ...payload(row), rfidUid:'', technology:'HF_RFID',
          }))});
          for (const result of data.results) results.set(result.clientId, {
            error: result.error || (result.equipmentId ? undefined : 'Save result was unavailable. Retry this row.'), fields: result.fieldErrors,
          });
          for (const row of items) if (!results.has(row.id)) results.set(row.id, {error:'Save result was unavailable. Retry this row.'});
        } catch (error) {
          for (const row of items) results.set(row.id, {error:getApiErrorMessage(error, 'Could not save this equipment record.')});
        }
      }
      const succeeded = [...results.values()].filter(result => !result.error).length;
      setDrafts(previous => previous.flatMap(row => {
        const result = results.get(row.id);
        if (!result) return [row];
        return result.error ? [{...row, error:result.error, errors:result.fields ?? {}}] : [];
      }));
      setMessage(`${succeeded} saved · ${drafts.length - succeeded} failed`);
      if (succeeded) setRefresh(value => value + 1);
    } finally {setSaving(false);}
  }

  function field(draft: Draft, key: string, label: string) {
    const availability = draft.existing?.metadataAvailability?.[key];
    if (availability === 'NotApplicable') return text('Not Applicable');
    const error = draft.errors[key];
    const type = key === 'type';
    const zone = key === 'hazardousAreaZone';
    const value = draft.values[key] ?? '';
    const fieldLabel = `${label} for ${draft.values.tagNumber || 'new equipment'}`;
    return <View style={styles.field}>
      {type || zone ? <SearchableOptionPicker label={fieldLabel} placeholder={label} value={value}
        options={[
          ...(zone ? [{label: 'Clear zone', value: ''}] : []),
          ...equipmentOptions(type ? equipmentTypes : zoneOptions,
            rows.map(row => type ? row.equipmentType : row.hazardousAreaZone), value),
        ]}
        customLabel={type ? 'Add Custom Type' : 'Add Custom Zone'} disabled={saving} dark={mode === 'dark'}
        onChange={next => patch(draft.id, key, next)} /> :
      <TextInput accessibilityLabel={fieldLabel} placeholder={label}
        placeholderTextColor={c.muted} value={value} editable={!saving}
        onChangeText={value => patch(draft.id, key, value)}
        style={[styles.input, {backgroundColor:c.card, color:c.text, borderColor:error ? c.critical : c.border}]} />}
      {!!error && <Text accessibilityRole="alert" style={{color:c.critical, fontSize:11}}>{error}</Text>}
    </View>;
  }

  function gridRow(row?: RegisterRow, draft?: Draft) {
    const technical = (key: typeof TECHNICAL[number][0], label: string) =>
      draft ? field(draft, key, label) : text(row?.metadataAvailability?.[key] === 'NotApplicable' ? 'Not Applicable' : row?.[key] || '—');
    const area = draft && !row ? <View style={styles.field}>
      {choice(draft.id, 'Select area', draft.areaId, areas, id => setDrafts(previous => previous.map(item =>
        item.id === draft.id ? {...item, areaId:id, errors:{...item.errors, areaId:''}} : item)), saving)}
      {!!draft.errors.areaId && <Text style={{color:c.critical, fontSize:11}}>{draft.errors.areaId}</Text>}
    </View> : text(projectId === ALL_PROJECTS && row ? [projectDisplay(row.area), projectDisplay(row.projectName)].filter(Boolean).join(" · ") : projectDisplay(row?.area));
    const actions = draft ? <View style={styles.field}>
      {!!draft.error && <Text accessibilityRole="alert" style={{color:c.critical, fontSize:11}}>{draft.error}</Text>}
      {button('Cancel', () => setDrafts(previous => previous.filter(item => item.id !== draft.id)), saving)}
    </View> : row && <View style={styles.rowActions}>
      {!creationOnly && rowAction('Edit', () => edit(row), saving || drafts.length >= 100)}
      {rowAction('Project', () => onEquipmentPress(row.projectId))}
      {onDocumentsPress && rowAction('Documents', () => onDocumentsPress({
        id:row.equipmentRecordId, projectId:row.projectId, areaId:row.areaId, projectName:row.projectName,
        areaName:row.area, sequenceNo:row.sequenceNo, tagNumber:row.tagNumber, type:row.equipmentType, inspectionStatus:row.inspectionStatus,
      }))}
    </View>;
    const grade = row?.lastInspectionGrade;
    const gradeLabel = grade === 'Visual' ? 'V' : grade === 'Close' ? 'C' : grade === 'Detailed' ? 'D' : grade;
    return {id: draft?.id ?? row!.equipmentRecordId, cells: [
      text(row?.sequenceNo), text(projectDisplay(row?.projectName ?? currentProject?.projectName)),
      draft ? field(draft, 'equipmentCode', 'Item number') : text(row?.itemNumber),
      draft ? field(draft, 'tagNumber', 'Ex-Tag *') : text(row?.tagNumber), area,
      draft ? field(draft, 'description', 'Description') : text(row?.metadataAvailability?.description === 'NotApplicable' ? 'Not Applicable' : row?.description),
      technical('manufacturer', 'Manufacturer'),
      draft ? <View style={styles.field}>{field(draft, 'type', 'Type *')}{field(draft, 'model', 'Model')}</View> : text([row?.equipmentType, row?.model].filter(Boolean).join(' / ') || '—'),
      ...TECHNICAL.slice(1).map(([key, label]) => technical(key, label)),
      text(gradeLabel), text(row?.lastInspectionAt ? new Date(row.lastInspectionAt).toLocaleDateString() : undefined),
      text(row?.comments),
      <View style={styles.field}>{text(row ? inspectionLabel(row.inspectionStatus) : 'New record')}{actions}</View>,
    ]};
  }

  const draftsById = new Map(drafts.map(draft => [draft.id, draft]));
  const gridRows = [
    ...drafts.filter(draft => !draft.existing || !displayed.some(row => row.equipmentRecordId === draft.id))
      .map(draft => gridRow(draft.existing, draft)),
    ...displayed.map(row => gridRow(row, draftsById.get(row.equipmentRecordId))),
  ];
  const canAdd = !loading && !loadError && !!areas.length && !saving && drafts.length < 100;
  return <ScrollView nativeID="ex-haer" style={{flex:1, backgroundColor:c.bg}}
    contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View nativeID="ex-haer-hero" style={styles.hero}>
      <Image accessible={false} source={OFFSHORE_ART} resizeMode="cover" style={styles.heroImage} />
      <View nativeID="ex-haer-hero-overlay" pointerEvents="none"
        style={[StyleSheet.absoluteFill, Platform.OS !== 'web' && styles.nativeOverlay]} />
      <View style={styles.heroCopy}>
        <Text style={styles.eyebrow}>ASSET REGISTER  /  HAER</Text>
        <Text accessibilityRole="header" style={styles.title}>HAER</Text>
        <Text style={styles.heroDescription}>Manage hazardous-area equipment by project, area and tag.</Text>
      </View>
    </View>
    <View nativeID="ex-haer-panel" style={[styles.panel, {backgroundColor:c.card, borderColor:c.border}]}>
    <Text accessibilityRole="header" style={[styles.panelTitle, {color:c.text}]}>
      <Text style={{color:c.cyan}}>▱  </Text>Hazardous Area Equipment Register
    </Text>
    <View style={styles.toolbar}>
      <View style={styles.projectField}>
        <Text style={{color: c.secondary, fontSize: 11}}>Select Project</Text>
        {button(`${projectDisplay(currentProject?.projectName) || 'All Projects'} ▾`, () => {
          setProjectQuery(''); setProjectPicker(true);
        }, loadingProjects || saving || drafts.length > 0, false, true)}
      </View>
      <View style={styles.projectField}>
        <Text style={{color:c.secondary,fontSize:11}}>Client Company Name</Text>
        <View style={[styles.button,{alignSelf:'stretch',backgroundColor:c.card,borderColor:c.border}]}>
          <Text accessibilityLiveRegion="polite" style={{color:c.text}}>
            {projectId === ALL_PROJECTS ? 'All Client Companies' : currentProject?.clientName?.trim() || 'Client company not specified'}
          </Text>
        </View>
      </View>
    </View>
    <View style={[styles.searchRow, {backgroundColor:c.elevated, borderColor:c.border}]}>
      <Text accessible={false} style={{color:c.cyan, fontSize:20}}>⌕</Text>
      <TextInput accessibilityLabel="Search HAER" placeholder="Search project, item, Ex-Tag, description, manufacturer, serial or area…"
        placeholderTextColor={c.muted} value={query} onChangeText={value => {setQuery(value); setPage(1);}}
        style={[styles.search, {color:c.text}]} />
    </View>
    <View style={styles.toolbar}>
      {button('+ Add HAER Record', add, !canAdd, true)}
      {button('+ Bulk Add', () => setBulk(!bulk), !canAdd && !bulk)}
      {button(saving ? 'Saving…' : 'Save Changes', () => void save(), saving || !drafts.length)}
      {button('Cancel All', () => {setDrafts([]); setMessage('');}, saving || !drafts.length)}
      {text(`${filtered.length} of ${rows.length} equipment records${drafts.length ? ` · ${drafts.length} unsaved` : ''}`)}
      <View style={styles.secondaryActions}>
        {button('↻ Refresh', () => setRefresh(value => value + 1), saving || loading)}
        {button('+ Create / Manage Areas', () => setManageAreas(true), !currentProject || loadingProjects || saving)}
      </View>
    </View>
    {bulk && <View style={styles.field}>
      <Text style={{color:c.secondary}}>Paste Excel rows in the displayed 22-column order, or the original 21-column order without Project Name. Project Name is assigned from the selected project. Use “Type / Model” to split that cell. Inspection and status columns are supplied by inspection records.</Text>
      <TextInput accessibilityLabel="Paste HAER rows from Excel" multiline value={paste} editable={!saving} onChangeText={setPaste}
        placeholder="Paste tab-separated rows" placeholderTextColor={c.muted}
        style={[styles.input, {minHeight:70, backgroundColor:c.card, color:c.text, borderColor:c.border}]} />
      <View style={styles.toolbar}>{button('Add Row', add, !canAdd)}{button('Add pasted rows', pasteRows, !canAdd || !paste.trim())}</View>
      {!!pasteError && <Text accessibilityRole="alert" style={{color:c.critical}}>{pasteError}</Text>}
    </View>}
    {!!message && <Text accessibilityLiveRegion="polite" style={{color:c.text, fontWeight:'700'}}>{message}</Text>}
    {loadingProjects || loading ? text('Loading HAER…') : null}
    {!!(projectError || loadError) && <Text accessibilityRole="alert" style={{color:c.critical}}>{projectError || loadError}</Text>}
    {projectId === ALL_PROJECTS && text('Select a project to add HAER records.')}
    {!!currentProject && !areas.length && text('Add an area to the selected project before creating records.')}
    {!loading && !loadError && !rows.length && !drafts.length && text(projectId ? 'No equipment in this project.' : 'Select a project to view its register.')}
    {(!loadError || drafts.length > 0) && <HaerGrid columns={COLUMNS} rows={gridRows} colors={c} />}
    <View style={styles.toolbar}>
      {button('Previous', () => setPage(visiblePage - 1), visiblePage <= 1)}
      {text(`Page ${visiblePage} of ${pageCount}`)}
      {button('Next', () => setPage(visiblePage + 1), visiblePage >= pageCount)}
    </View>
    </View>
    <Modal visible={projectPicker} transparent onRequestClose={() => setProjectPicker(false)}>
      <View style={styles.overlay}><View style={[styles.dialog, {backgroundColor: c.card}]}>
        <Text accessibilityRole="header" style={{color: c.text, fontWeight: '800'}}>Select Project</Text>
        <TextInput autoFocus accessibilityLabel="Search projects" placeholder="Search projects" placeholderTextColor={c.muted}
          value={projectQuery} onChangeText={setProjectQuery} style={[styles.input, {color: c.text, borderColor: c.border}]}/>
        <ScrollView keyboardShouldPersistTaps="handled" style={{maxHeight: 300}} contentContainerStyle={styles.field}>
          {projectChoices.filter(option => option.label.toLowerCase().includes(projectQuery.trim().toLowerCase())).map(option =>
            <View key={option.id}>{button(option.label, () => {
              if (option.id !== projectId) {
                setProjectId(option.id); setPage(1); setRows([]); setLoading(true); setMessage(''); setPicker('');
              }
              setProjectPicker(false);
            }, false, option.id === projectId)}</View>)}
        </ScrollView>
        {button('Close', () => setProjectPicker(false))}
      </View></View>
    </Modal>
    {manageAreas && currentProject && <HaerAreaManager key={currentProject.id} project={currentProject} canEdit={!creationOnly}
      colors={c} onClose={() => setManageAreas(false)} onAreaSaved={area => {
        setProjects(previous => previous.map(project => project.id !== currentProject.id ? project : {
          ...project, areas: [...project.areas.filter(item => item.id !== area.id), {id: area.id, areaName: area.areaName}]
            .sort((a, b) => a.areaName.localeCompare(b.areaName)),
        }));
        setRows(previous => previous.map(row => row.projectId === currentProject.id && row.areaId === area.id
          ? {...row, area: area.areaName} : row));
      }}/>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  content:{padding:16, gap:16, paddingBottom:32},
  hero:{minHeight:144, justifyContent:'center', padding:22, borderWidth:1, borderColor:'#126078',
    borderRadius:18, overflow:'hidden', backgroundColor:'#03192C'},
  heroImage:{position:'absolute', right:0, width:'63%', height:'100%'},
  nativeOverlay:{backgroundColor:'#03192C99'},
  heroCopy:{borderLeftWidth:3, borderLeftColor:'#00D9EE', paddingLeft:16, gap:4},
  eyebrow:{fontFamily:visual.mono, color:'#00D9EE', fontWeight:'800', fontSize:11, letterSpacing:1.7},
  title:{fontFamily:visual.display, color:'#F5FAFF', fontSize:38,fontWeight:'900'},
  heroDescription:{color:'#F5FAFF', fontSize:14},
  panel:{padding:14, gap:12, borderWidth:1, borderRadius:18, minWidth:0},
  panelTitle:{fontSize:20, fontWeight:'900'},
  projectField:{gap:5,flexBasis:220,flexGrow:1,minWidth:0},
  toolbar:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8},
  secondaryActions:{flexDirection:'row',flexWrap:'wrap',gap:8,marginLeft:'auto'},
  button:{minHeight:38,borderWidth:1,borderRadius:9,paddingVertical:7,paddingHorizontal:11,justifyContent:'center',alignSelf:'flex-start'},
  stretchedButton:{alignSelf:'stretch'},
  input:{borderWidth:1,borderRadius:5,paddingHorizontal:7,paddingVertical:5,minHeight:34,fontSize:12},
  searchRow:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,minHeight:42,borderWidth:1,borderRadius:10},
  search:{flex:1,minWidth:0,minHeight:40,fontSize:13},
  field:{gap:4},
  rowActions:{flexDirection:'row', flexWrap:'wrap', gap:7},
  choice:{gap:3},
  overlay:{flex:1, padding:16, alignItems:'center', justifyContent:'center', backgroundColor:'#0008'},
  dialog:{width:'100%', maxWidth:420, padding:16, borderRadius:9, gap:8},
});
