import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {getManagerQcRecords, ManagerQcProject, ManagerQcRecord} from '../api/managerQc';
import {getApiErrorMessage} from '../api/errors';
import SearchableOptionPicker from './SearchableOptionPicker';
import {OPERATIONS_DARK as c} from '../theme/operationsPalette';
import {projectDisplay} from '../utils/projectDisplay';

const statusLabel = (s?: string | null) => s === 'PendingReview' ? 'Awaiting Review' : s?.replace(/([a-z])([A-Z])/g, '$1 $2') || '—';
const stamp = (s?: string | null) => s ? new Date(s).toLocaleString() : '—';
const tone = (s?: string | null) => s === 'Approved' ? c.success : s === 'ChangesRequested' ? c.critical : s === 'InReview' ? c.cyan : c.amber;
type Props = {projects: ManagerQcProject[]; version: number; onProject: (id: string) => void;
  onSelection: (project: ManagerQcProject | undefined) => void; onInspection: (record: ManagerQcRecord) => void};

export default function QcReviewRecords({projects, version, onProject, onInspection, onSelection}: Props) {
  const [projectId, setProjectId] = useState('');
  const [records, setRecords] = useState<ManagerQcRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({scope: 'reviewed'});
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState('date-desc');
  const [view, setView] = useState('table');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setRecords([]);
    const selected = projectId ? projects.filter(p => p.projectId === projectId) : projects;
    Promise.all(selected.map(p => getManagerQcRecords(p.projectId))).then(results => {
      if (active) setRecords([...new Map(results.flatMap(r => r.data).map(r => [r.equipment.inspectionId, r])).values()]);
    }).catch(err => {if (active) setError(getApiErrorMessage(err, 'Could not load inspection review records.'));})
      .finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, [projects, projectId, version, retry]);
  const selected = projects.find(p => p.projectId === projectId);
  const change = (key: string, value: string) => {setFilters(f => ({...f, [key]: value})); setPage(0);};
  const filtered = useMemo(() => records.filter(r => {
    const e = r.equipment;
    return (filters.scope !== 'reviewed' || r.hasReview) &&
      (!filters.area || r.areaId === filters.area) && (!filters.equipment || e.equipmentId === filters.equipment) &&
      (!filters.surveyor || r.inspectorName === filters.surveyor) && (!filters.reviewer || e.reviewedBy === filters.reviewer) &&
      (!filters.status || e.qcReviewStatus === filters.status) &&
      (!filters.from || !!r.inspectionDate && r.inspectionDate.slice(0, 10) >= filters.from) &&
      (!filters.to || !!r.inspectionDate && r.inspectionDate.slice(0, 10) <= filters.to) &&
      [r.itemNumber, e.tagNumber, r.equipmentName, r.description].join(' ').toLowerCase().includes(query.trim().toLowerCase());
  }).sort((a, b) => sort === 'item' ? (a.itemNumber || '').localeCompare(b.itemNumber || '', undefined, {numeric: true}) :
    (new Date(b.inspectionDate || 0).getTime() - new Date(a.inspectionDate || 0).getTime()) * (sort === 'date-asc' ? -1 : 1)), [records, filters, query, sort]);
  const picker = (label: string, key: string, options: {label: string; value: string}[]) => <View style={s.filter}>
    <Text style={s.label}>{label}</Text><SearchableOptionPicker dark label={label} placeholder={`All ${label.toLowerCase()}`}
      value={filters[key] || ''} options={[{label: `All ${label.toLowerCase()}`, value: ''}, ...options]} onChange={v => change(key, v)} />
  </View>;
  const unique = (items: {label: string; value: string}[]) => [...new Map(items.filter(o => o.value).map(o => [o.value, o])).values()];
  const action = (text: string, fn: () => void, disabled = false) => <TouchableOpacity key={text} accessibilityRole="button" disabled={disabled}
    accessibilityState={{disabled}} onPress={fn} style={[s.button, disabled && {opacity: 0.4}]}><Text style={s.buttonText}>{text}</Text></TouchableOpacity>;
  const row = (r: ManagerQcRecord) => <View key={r.equipment.inspectionId} style={s.row}>
    {[r.itemNumber, r.equipmentName || r.description || r.equipment.type, r.equipment.tagNumber, r.areaName,
      stamp(r.inspectionDate), r.inspectionType, r.inspectorName, r.equipment.reviewedBy || projects.find(p => p.projectId === r.projectId)?.assignedQc,
      stamp(r.equipment.reviewedAt), statusLabel(r.equipment.qcReviewStatus), r.equipment.qcComments].map((v, i) =>
      <Text selectable key={i} style={[s.cell, i === 9 && {color: tone(r.equipment.qcReviewStatus), fontWeight: '800'}]}>{v || '—'}</Text>)}
    <View style={s.cell}>{action('View Review Details', () => onInspection(r))}</View>
  </View>;
  const table = (items: ManagerQcRecord[]) => <ScrollView horizontal><View>
    <View style={[s.row, s.tableHead]}>{['Item Number', 'Equipment / Description', 'Ex-Tag', 'Area', 'Inspection Date', 'Inspection Type',
      'Surveyor', 'Assigned QC / Reviewed By', 'QC Review Date', 'QC Status', 'QC Remarks / Feedback', 'Actions'].map(h => <Text key={h} style={[s.cell, s.label]}>{h}</Text>)}</View>
    {items.map(row)}
  </View></ScrollView>;
  return <View style={{gap: 14}}>
    <View style={s.panel}><Text style={s.heading}>Project</Text>
      <SearchableOptionPicker dark label="Project" placeholder="All authorized projects" value={projectId}
        options={[{label: 'All authorized projects', value: ''}, ...projects.map(p => ({label: `${projectDisplay(p.projectName)} · ${projectDisplay(p.jobNo)}`, value: p.projectId}))]}
        onChange={v => {onSelection(projects.find(p => p.projectId === v)); setProjectId(v); setFilters({scope: 'reviewed'}); setPage(0);}} />
      {selected ? <><Text style={s.heading}>{projectDisplay(selected.projectName)}</Text><View style={s.filters}>
        {[['Job Number', selected.jobNo], ['Location', selected.location], ['Primary Surveyor', selected.surveyorName],
          ['Assigned QC', selected.assignedQc], ['QC Manager', selected.managerName], ['Project Status', selected.projectStatus],
          ['QC Status', statusLabel(selected.qcReviewStatus)], ['Last QC Activity', stamp(selected.lastQcActivity)]].map(([k, v]) =>
          <View key={k} style={s.filter}><Text style={s.label}>{k}</Text><Text style={s.text}>{v || '—'}</Text></View>)}
      </View>{action('View Project', () => onProject(selected.projectId))}</> : <View style={s.filters}>{projects.map(p => action(`View Project · ${projectDisplay(p.projectName)}`, () => onProject(p.projectId)))}</View>}
    </View>
    <View style={s.panel}><Text style={s.heading}>Inspection Review Records</Text>
      <Text style={s.label}>Reviewed records are shown first. Submitted work awaiting its first review remains available in QC Pending.</Text>
      <TextInput accessibilityLabel="Search review records" placeholder="Search item number, Ex-Tag or description" placeholderTextColor={c.muted}
        value={query} onChangeText={v => {setQuery(v); setPage(0);}} style={s.input} />
      <View style={s.filters}>
        {picker('Workflow records', 'scope', [{label: 'Reviewed records', value: 'reviewed'}])}
        {picker('Area', 'area', unique(records.map(r => ({label: r.areaName, value: r.areaId}))))}
        {picker('Equipment', 'equipment', unique(records.map(r => ({label: `${r.itemNumber || r.equipment.tagNumber} · ${r.equipment.type}`, value: r.equipment.equipmentId}))))}
        {picker('Surveyor', 'surveyor', unique(records.map(r => ({label: r.inspectorName || '', value: r.inspectorName || ''}))))}
        {picker('QC Reviewer', 'reviewer', unique(records.map(r => ({label: r.equipment.reviewedBy || '', value: r.equipment.reviewedBy || ''}))))}
        {picker('QC Status', 'status', ['PendingReview', 'InReview', 'ChangesRequested', 'Approved'].map(v => ({label: statusLabel(v), value: v})))}
        {['from', 'to'].map(key => <View key={key} style={s.filter}><Text style={s.label}>{key === 'from' ? 'From date' : 'To date'} (YYYY-MM-DD)</Text>
          <TextInput accessibilityLabel={`${key} inspection date`} value={filters[key] || ''} placeholder="YYYY-MM-DD" placeholderTextColor={c.muted}
            onChangeText={v => change(key, v)} style={s.input} /></View>)}
      </View>
      <View style={s.filters}>{action('Table View', () => setView('table'))}{action('Area View', () => setView('area'))}
        {action('Reset filters', () => {setFilters({scope: 'reviewed'}); setQuery(''); setPage(0);})}
        <View style={s.filter}><SearchableOptionPicker dark label="Sort records" value={sort} placeholder="Sort records" onChange={v => {setSort(v); setPage(0);}}
          options={[{label: 'Newest inspection first', value: 'date-desc'}, {label: 'Oldest inspection first', value: 'date-asc'}, {label: 'Item number', value: 'item'}]} /></View>
      </View>
      {loading ? <ActivityIndicator accessibilityLabel="Loading review records" color={c.cyan} /> : error ? <><Text accessibilityRole="alert" style={{color: c.critical}}>{error}</Text>{action('Retry records', () => setRetry(v => v + 1))}</> : <>
        <Text style={s.text}>{filtered.length} inspection records</Text>
        {!filtered.length ? <Text style={s.label}>No inspection reviews match these filters.</Text> : view === 'table' ? <>
          {table(filtered.slice(page * 10, page * 10 + 10))}<View style={s.filters}>
            {action('Previous', () => setPage(v => v - 1), page === 0)}<Text style={s.text}>Page {page + 1} of {Math.max(1, Math.ceil(filtered.length / 10))}</Text>
            {action('Next', () => setPage(v => v + 1), (page + 1) * 10 >= filtered.length)}</View>
        </> : unique(filtered.map(r => ({label: r.areaName, value: `${r.projectId}/${r.areaId}`}))).map(a => {
          const all = records.filter(r => `${r.projectId}/${r.areaId}` === a.value);
          const items = filtered.filter(r => `${r.projectId}/${r.areaId}` === a.value);
          return <View key={a.value} style={s.panel}>{action(`${collapsed[a.value] ? '▸' : '▾'} ${a.label}`, () => setCollapsed(v => ({...v, [a.value]: !v[a.value]})))}
            <Text style={s.label}>{all[0]?.areaTotalEquipment ?? new Set(all.map(r => r.equipment.equipmentId)).size} total equipment · {all.filter(r => r.submittedAt).length} submitted · {all.filter(r => r.hasReview).length} reviewed · {all.filter(r => r.equipment.qcReviewStatus === 'Approved').length} approved · {all.filter(r => r.equipment.qcReviewStatus === 'ChangesRequested').length} changes requested</Text>
            {!collapsed[a.value] && table(items)}</View>;
        })}
      </>}
    </View>
  </View>;
}

const s = StyleSheet.create({
  panel: {padding: 14, borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.card, gap: 12},
  heading: {color: c.text, fontSize: 19, fontWeight: '800'}, text: {color: c.text, fontSize: 14}, label: {color: c.secondary, fontSize: 13, lineHeight: 20},
  filters: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center'}, filter: {flexGrow: 1, flexBasis: 210, gap: 6},
  input: {color: c.text, backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, padding: 12, borderRadius: 8, minHeight: 44},
  button: {padding: 12, minHeight: 44, borderWidth: 1, borderColor: c.border, borderRadius: 8, backgroundColor: c.elevated},
  buttonText: {color: c.cyan, fontWeight: '700', fontSize: 14}, row: {flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.border},
  cell: {width: 160, padding: 12, color: c.text, fontSize: 14, lineHeight: 21}, tableHead: {backgroundColor: c.bg},
});
