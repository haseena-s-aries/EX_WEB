import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {
  bulkRegisterEquipment, BulkEquipmentRow, editEquipmentIdentification, EquipmentIdentificationFields,
  getIdentifiedEquipment, getEquipmentRegistrationProjects, IdentifiedEquipment, RadioTechnology,
} from '../api/equipmentIdentification';
import {getApiErrorMessage} from '../api/errors';
import {getProjects, ProjectSummary} from '../api/projects';

const FIELDS = [
  ['tagNumber', 'Equipment tag *'], ['equipmentCode', 'Item number'], ['equipmentName', 'Equipment name'],
  ['description', 'Description'], ['type', 'Equipment type *'],
] as const;
const newRow = (): BulkEquipmentRow => ({
  clientId: globalThis.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const value = Math.floor(Math.random() * 16);
    return (char === 'x' ? value : (value & 3) | 8).toString(16);
  }),
  tagNumber: '', equipmentCode: '', equipmentName: '', description: '', type: '', rfidUid: '', technology: 'HF_RFID',
});

type Choice = {id: string; label: string};
function Picker({label, value, choices, onChange, disabled}: {
  label: string; value: string; choices: Choice[]; onChange: (id: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return <View style={styles.picker}>
    <Button label={choices.find(x => x.id === value)?.label ?? label} onPress={() => setOpen(!open)} disabled={disabled} secondary />
    {open && !disabled && <ScrollView nestedScrollEnabled style={styles.options}>
      {choices.map(choice => <Button key={choice.id} label={choice.label} secondary onPress={() => {onChange(choice.id); setOpen(false);}} />)}
    </ScrollView>}
  </View>;
}

function Button({label, onPress, disabled, secondary}: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean;
}) {
  return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}>
    <Text style={[styles.buttonLabel, secondary && styles.secondaryLabel]}>{label}</Text>
  </TouchableOpacity>;
}

export default function EquipmentIdentificationWorkspace({children, online, canManage, scanNfc, onOpenInspection}: {
  children: React.ReactNode;
  online: boolean;
  canManage: boolean;
  scanNfc?: () => Promise<string>;
  onOpenInspection: (id: string) => void;
}) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectError, setProjectError] = useState('');
  const [mode, setMode] = useState<'rfid' | 'manual' | null>(null);
  const [projectId, setProjectId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [registrationProjects, setRegistrationProjects] = useState<Awaited<ReturnType<typeof getEquipmentRegistrationProjects>>['data']>([]);
  const [registrationError, setRegistrationError] = useState('');
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [rows, setRows] = useState<BulkEquipmentRow[]>([]);
  const [uidInput, setUidInput] = useState('');
  const [scanType, setScanType] = useState<RadioTechnology>('HF_RFID');
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [batchMessage, setBatchMessage] = useState('');
  const [batchError, setBatchError] = useState('');
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [list, setList] = useState<{items: IdentifiedEquipment[]; total: number; page: number; pageSize: number}>();
  const [listError, setListError] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [selected, setSelected] = useState<IdentifiedEquipment>();
  const [edit, setEdit] = useState<EquipmentIdentificationFields>();
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (!online) return;
    let current = true;
    getProjects().then(response => {if (current) {setProjects(response.data); setProjectError('');}})
      .catch(error => {if (current) setProjectError(getApiErrorMessage(error, 'Could not load projects.'));});
    return () => {current = false;};
  }, [online, refresh]);

  useEffect(() => {
    if (!online || !canManage) return;
    let current = true;
    setRegistrationLoading(true);
    getEquipmentRegistrationProjects().then(({data}) => {
      if (current) {setRegistrationProjects(data); setRegistrationError('');}
    }).catch(error => {
      if (current) setRegistrationError(getApiErrorMessage(error, 'Could not load projects for registration.'));
    }).finally(() => {if (current) setRegistrationLoading(false);});
    return () => {current = false;};
  }, [online, canManage, refresh]);

  useEffect(() => {
    if (!online) return;
    let current = true;
    setListLoading(true);
    setListError('');
    getIdentifiedEquipment(filter, query, page).then(({data}) => {if (current) setList(data);})
      .catch(error => {if (current) setListError(getApiErrorMessage(error, 'Could not load identified equipment.'));})
      .finally(() => {if (current) setListLoading(false);});
    return () => {current = false;};
  }, [online, filter, query, page, refresh]);

  const projectChoices = projects.map(project => ({id: project.id, label: project.projectName}));
  const registrationChoices = registrationProjects.map(project => ({id: project.id, label: project.projectName}));
  const areas = registrationProjects.find(project => project.id === projectId)?.areas.map(area => ({id: area.id, label: area.areaName})) ?? [];
  const locked = busy || scanning;
  const addRow = () => setRows(current => current.length < 100 ? [...current, newRow()] : current);
  const patchRow = (id: string, patch: Partial<BulkEquipmentRow>) => {
    setRows(current => current.map(row => row.clientId === id ? {...row, ...patch} : row));
    setRowErrors(current => ({...current, [id]: ''}));
  };
  function addUids(input: string, technology: RadioTechnology) {
    const values = input.split(/[\r\n,;]+/).map(uid => uid.trim()).filter(Boolean);
    const limit = 100 - rows.length;
    if (!values.length) return;
    setRows(current => [...current, ...values.slice(0, limit).map(rfidUid => ({...newRow(), rfidUid, technology}))]);
    setUidInput(values.slice(limit).join('\n'));
    setBatchError(values.length > limit ? 'This batch can hold 100 rows. Remaining UIDs are still in the input.' : '');
  }
  async function scan() {
    if (!scanNfc) return;
    setScanning(true);
    setBatchError('');
    try {addUids(await scanNfc(), 'NFC');}
    catch (error) {setBatchError(getApiErrorMessage(error, 'NFC scan failed.'));}
    finally {setScanning(false);}
  }
  async function save() {
    if (locked || !projectId || !areaId || !rows.length) return;
    setBusy(true);
    setBatchError('');
    setBatchMessage('');
    try {
      const {data} = await bulkRegisterEquipment({projectId, areaId, requireRfid: mode === 'rfid', rows});
      const succeeded = new Set(data.results.filter(result => result.equipmentId && !result.error).map(result => result.clientId));
      setRows(current => current.filter(row => !succeeded.has(row.clientId)));
      setRowErrors(Object.fromEntries(data.results.filter(result => result.error).map(result => [result.clientId, result.error!])));
      setBatchMessage(`${data.registered} registered · ${data.failed} failed`);
      if (data.registered) setRefresh(value => value + 1);
    } catch (error) {setBatchError(getApiErrorMessage(error, 'Save failed. Your rows are available to retry.'));}
    finally {setBusy(false);}
  }
  function show(item: IdentifiedEquipment, editing: boolean) {
    setSelected(item);
    setEditError('');
    setEdit(editing ? {tagNumber: item.tagNumber, equipmentCode: item.equipmentCode ?? '', equipmentName: item.equipmentName ?? '',
      description: item.description ?? '', type: item.type} : undefined);
  }
  async function saveEdit() {
    if (!selected || !edit || editBusy) return;
    setEditBusy(true);
    setEditError('');
    try {
      await editEquipmentIdentification(selected.equipmentId, edit);
      setSelected(undefined);
      setEdit(undefined);
      setRefresh(value => value + 1);
    } catch (error) {setEditError(getApiErrorMessage(error, 'Could not save equipment details.'));}
    finally {setEditBusy(false);}
  }

  return <>
    {online && canManage && <>
      <View style={styles.actions}>
        <Button label="+ Bulk Add Equipment by RFID" disabled={locked} onPress={() => setMode('rfid')} />
        <Button label="+ Bulk Add Equipment Manually" disabled={locked} onPress={() => {setMode('manual'); if (!rows.length) addRow();}} />
      </View>
      {mode && <View style={styles.panel}>
        <Text accessibilityRole="header" style={styles.title}>{mode === 'rfid' ? 'Bulk add by RFID' : 'Manual bulk equipment addition'}</Text>
        <View style={styles.actions}>
          <Picker label="Select project" value={projectId} choices={registrationChoices} disabled={locked || registrationLoading} onChange={id => {
            if (projectId === id) return;
            const selectedAreas = registrationProjects.find(project => project.id === id)?.areas ?? [];
            setProjectId(id);
            setAreaId(selectedAreas.length === 1 ? selectedAreas[0].id : '');
          }} />
          <Picker label="Select area" value={areaId} choices={areas} disabled={locked || !areas.length} onChange={setAreaId} />
        </View>
        {registrationLoading && <Text>Loading projects…</Text>}
        {!!registrationError && <Text style={styles.error}>{registrationError}</Text>}
        {!registrationLoading && !registrationError && !registrationChoices.length && <Text>No projects are available for registration.</Text>}
        {!!projectId && !areas.length && <Text>Add an area to this project before registering equipment.</Text>}
        {mode === 'rfid' && <>
          <Text>Type or paste UIDs separated by commas or new lines. For a keyboard RFID reader, focus the UID field and scan each tag.</Text>
          <View style={styles.actions}>
            <Picker label="RFID type" value={scanType} choices={[{id:'HF_RFID',label:'HF_RFID'},{id:'NFC',label:'NFC'}]} disabled={locked}
              onChange={id => setScanType(id as RadioTechnology)} />
            <TextInput accessibilityLabel="RFID UIDs to add" placeholder="RFID UIDs" value={uidInput} onChangeText={setUidInput}
              editable={!locked} onSubmitEditing={() => addUids(uidInput, scanType)} style={[styles.input, styles.search]} />
            <Button label="Add UIDs" onPress={() => addUids(uidInput, scanType)} disabled={locked || !uidInput.trim()} />
            {scanNfc && <Button label={scanning ? 'Scanning…' : 'Scan NFC tag'} onPress={() => void scan()} disabled={locked || rows.length >= 100} secondary />}
          </View>
        </>}
        <ScrollView horizontal>
          <View>
            <View style={styles.tableRow}>
              {FIELDS.map(([key, label]) => <Text key={key} style={styles.column}>{label}</Text>)}
              <Text style={styles.column}>{mode === 'rfid' ? 'RFID UID *' : 'RFID UID (optional)'}</Text>
              <Text style={styles.column}>RFID type</Text><Text style={styles.column}>Row result</Text>
            </View>
            {rows.map((row, index) => <View style={styles.tableRow} key={row.clientId}>
              {FIELDS.map(([key, label]) => <TextInput key={key} accessibilityLabel={`Row ${index + 1} ${label}`} placeholder={label}
                value={row[key]} editable={!locked} onChangeText={value => patchRow(row.clientId, {[key]: value})} style={[styles.input, styles.column]} />)}
              <TextInput accessibilityLabel={`Row ${index + 1} RFID UID`} placeholder="RFID UID" value={row.rfidUid}
                editable={!locked} onChangeText={value => patchRow(row.clientId, {rfidUid: value})} style={[styles.input, styles.column]} />
              <View style={styles.column}><Button label={row.technology} disabled={locked} secondary
                onPress={() => patchRow(row.clientId, {technology: row.technology === 'HF_RFID' ? 'NFC' : 'HF_RFID'})} /></View>
              <View style={styles.column}>
                {!!rowErrors[row.clientId] && <Text accessibilityRole="alert" style={styles.error}>{rowErrors[row.clientId]}</Text>}
                <Button label="Remove" secondary disabled={locked} onPress={() => setRows(current => current.filter(item => item.clientId !== row.clientId))} />
              </View>
            </View>)}
          </View>
        </ScrollView>
        {!!batchMessage && <Text accessibilityLiveRegion="polite" style={styles.title}>{batchMessage}</Text>}
        {!!batchError && <Text accessibilityRole="alert" style={styles.error}>{batchError}</Text>}
        <View style={styles.actions}>
          <Button label="Add Row" onPress={addRow} disabled={locked || rows.length >= 100} secondary />
          <Button label={busy ? 'Saving…' : 'Save All Equipment'} onPress={() => void save()} disabled={locked || !projectId || !areaId || !rows.length || (mode === 'rfid' && !!uidInput.trim())} />
          <Button label="Close bulk form" onPress={() => setMode(null)} disabled={locked} secondary />
        </View>
      </View>}
    </>}
    {children}
    {online && <View style={styles.panel}>
      <Text accessibilityRole="header" style={styles.title}>Identified Equipment</Text>
      <View style={styles.actions}>
        <Picker label="All projects" value={filter} choices={[{id:'',label:'All projects'}, ...projectChoices]} onChange={id => {setFilter(id); setPage(1);}} />
        <TextInput accessibilityLabel="Search identified equipment" placeholder="Search tag, name or UID" value={search}
          onChangeText={setSearch} onSubmitEditing={() => {setQuery(search.trim()); setPage(1);}} style={[styles.input, styles.search]} />
        <Button label="Search identified equipment" onPress={() => {setQuery(search.trim()); setPage(1);}} />
        <Button label="Refresh" secondary onPress={() => setRefresh(value => value + 1)} />
      </View>
      {!!projectError && <Text accessibilityRole="alert" style={styles.error}>{projectError}</Text>}
      {!!listError && <Text accessibilityRole="alert" style={styles.error}>{listError}</Text>}
      {listLoading ? <Text>Loading identified equipment…</Text> : list && !listError && <>
        <ScrollView horizontal>
          <View>
            <View style={styles.tableRow}>
              {['Equipment tag / Item number','Equipment name / Description','RFID UID','RFID type','Project name','Identification date','Status','Actions'].map(label =>
                <Text key={label} style={[styles.column, styles.columnHeading]}>{label}</Text>)}
            </View>
            {list.items.map(item => <View key={item.equipmentId} style={styles.tableRow}>
              <Text style={styles.column}>{[item.tagNumber, item.equipmentCode].filter(Boolean).join(' / ')}</Text>
              <Text style={styles.column}>{[item.equipmentName, item.description].filter(Boolean).join(' · ') || '—'}</Text>
              <Text style={styles.column}>{item.tags.map(tag => tag.uid).join('\n')}</Text>
              <Text style={styles.column}>{item.tags.map(tag => tag.technology).join('\n')}</Text>
              <Text style={styles.column}>{item.projectName}</Text>
              <Text style={styles.column}>{item.tags.map(tag => new Date(tag.identifiedAt).toLocaleDateString()).join('\n')}</Text>
              <Text style={styles.column}>{item.status.replace(/([a-z])([A-Z])/g, '$1 $2')}</Text>
              <View style={styles.column}><View style={styles.actions}>
                <Button label="View" onPress={() => show(item, false)} disabled={editBusy} secondary />
                {canManage && <Button label="Edit" onPress={() => show(item, true)} disabled={editBusy} secondary />}
              </View></View>
            </View>)}
          </View>
        </ScrollView>
        {!list.total && <Text>No identified equipment matches these filters.</Text>}
        <View style={styles.actions}>
          <Button label="Previous" onPress={() => setPage(list.page - 1)} disabled={list.page <= 1} secondary />
          <Text>Page {list.page} of {Math.max(1, Math.ceil(list.total / list.pageSize))} · {list.total} items</Text>
          <Button label="Next" onPress={() => setPage(list.page + 1)} disabled={list.page * list.pageSize >= list.total} secondary />
        </View>
      </>}
      {selected && <View style={styles.panel}>
        <Text style={styles.title}>{edit ? 'Edit equipment' : 'Equipment details'} · {selected.tagNumber}</Text>
        <Text>{selected.projectName} · {selected.status}</Text>
        {selected.tags.map(tag => <Text key={tag.uid}>{tag.technology} · {tag.uid} · {new Date(tag.identifiedAt).toLocaleDateString()}</Text>)}
        {FIELDS.map(([key, label]) => edit
          ? <TextInput key={key} accessibilityLabel={label} placeholder={label} value={edit[key]} editable={!editBusy}
              onChangeText={value => setEdit(current => current ? {...current, [key]: value} : undefined)} style={styles.input} />
          : <Text key={key}>{label.replace(' *', '')} · {selected[key] || '—'}</Text>)}
        {!!editError && <Text accessibilityRole="alert" style={styles.error}>{editError}</Text>}
        <View style={styles.actions}>
          {edit ? <Button label="Save equipment details" disabled={editBusy} onPress={() => void saveEdit()} />
            : <Button label="Open inspection history" onPress={() => onOpenInspection(selected.equipmentId)} />}
          <Button label="Close details" disabled={editBusy} secondary onPress={() => {setSelected(undefined); setEdit(undefined);}} />
        </View>
      </View>}
    </View>}
  </>;
}

const styles = StyleSheet.create({
  actions: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8},
  button: {minHeight: 42, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, borderRadius: 7, backgroundColor: '#173454'},
  buttonLabel: {color: '#fff', fontWeight: '700'},
  secondary: {backgroundColor: '#eaf0f7'},
  secondaryLabel: {color: '#173454'},
  disabled: {opacity: .5},
  panel: {padding: 14, borderWidth: 1, borderColor: '#dbe2eb', borderRadius: 9, backgroundColor: '#fff', gap: 10},
  title: {fontSize: 17, fontWeight: '800', color: '#173454'},
  input: {padding: 9, minHeight: 42, borderWidth: 1, borderColor: '#c5d1df', borderRadius: 6, backgroundColor: '#fff', color: '#14263b'},
  search: {flexGrow: 1, minWidth: 165},
  picker: {gap: 4},
  options: {maxHeight: 180},
  tableRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderBottomWidth: 1, borderColor: '#dbe2eb', paddingVertical: 8},
  column: {width: 136, color: '#14263b'},
  columnHeading: {fontWeight: '700'},
  error: {color: '#a32929'},
});
