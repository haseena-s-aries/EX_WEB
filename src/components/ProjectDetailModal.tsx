import React, {useEffect, useRef, useState} from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  getProject,
  addProjectArea,
  updateProjectArea,
  deleteProjectArea,
} from '../api/projects';
import {getApiErrorMessage} from '../api/errors';
import AuthenticatedImage from './AuthenticatedImage';

type UserOption = {id: string; displayName: string};

type Props = {
  visible: boolean;
  project: any | null;
  onClose: () => void;
  onSave: (data: {
    projectName: string;
    sector: string;
    jobNo: string;
    location: string;
    vesselOrSiteName: string;
    assignedSurveyorId: string;
    assignedQcId: string;
    assignedClientId: string;
    status: string;
  }) => void;
  onAreasChanged?: () => void;
  surveyors: UserOption[];
  qcUsers: UserOption[];
  clients: UserOption[];
  loading?: boolean;
};

type AreaRow = {
  id: string;
  name: string;
  savedName?: string;
  file: any;
  fileName: string;
  layoutImagePath?: string | null;
  photoCount?: number;
  isNew: boolean;
  saving?: boolean;
  deleting?: boolean;
};

const SECTOR_OPTIONS = [
  'Oil & Gas',
  'Shipping',
  'Offshore Wind',
  'Naval',
  'Port & Terminal',
  'Fisheries',
];

const STATUS_OPTIONS = [
  {label: 'Pending', icon: '⏳', color: '#a75a0b', bg: '#fff0d7'},
  {label: 'Active', icon: '🟢', color: '#718be8', bg: '#f0eeff'},
  {label: 'In Progress', icon: '⚙️', color: '#8053a6', bg: '#f1eaf3'},
  {label: 'Completed', icon: '✅', color: '#3b68aa', bg: '#e5eef7'},
  {label: 'On Hold', icon: '⛔', color: '#ba4e3c', bg: '#fde8e2'},
];

// TODO: confirm exact field names the backend uses once these responses are
// checked directly in Swagger — falls back across a few likely names so the
// modal still works whichever shape comes back.
const pick = (obj: any, ...keys: string[]) => {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null && obj?.[k] !== '') return obj[k];
  }
  return '';
};

const emptyAreaRow = (): AreaRow => ({
  id: '',
  name: '',
  file: null,
  fileName: '',
  layoutImagePath: null,
  photoCount: 0,
  isNew: true,
});

function confirmAction(message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert('Are you sure?', message, [
    {text: 'Cancel', style: 'cancel'},
    {text: confirmLabel, style: 'destructive', onPress: onConfirm},
  ]);
}

export default function ProjectDetailModal({
  visible,
  project,
  onClose,
  onSave,
  onAreasChanged,
  surveyors,
  qcUsers,
  clients,
  loading,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [projectName, setProjectName] = useState('');
  const [sector, setSector] = useState(SECTOR_OPTIONS[0]);
  const [jobNo, setJobNo] = useState('');
  const [location, setLocation] = useState('');
  const [vesselOrSiteName, setVesselOrSiteName] = useState('');
  const [surveyorId, setSurveyorId] = useState('');
  const [qcId, setQcId] = useState('');
  const [clientId, setClientId] = useState('');
  const [status, setStatus] = useState('Pending');
  const [areas, setAreas] = useState<AreaRow[]>([]);

  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const applyDetail = (detail: any) => {
    setProjectName(pick(detail, 'projectName'));
    setSector(pick(detail, 'sector') || SECTOR_OPTIONS[0]);
    setJobNo(pick(detail, 'jobNo', 'jobNumber'));
    setLocation(pick(detail, 'location'));
    setVesselOrSiteName(pick(detail, 'vesselOrSiteName', 'vesselName'));
    setSurveyorId(pick(detail, 'assignedSurveyorId', 'surveyorId'));
    setQcId(pick(detail, 'assignedQcId', 'qcId'));
    setClientId(pick(detail, 'assignedClientId', 'clientId'));
    setStatus(pick(detail, 'status', 'projectStatus') || 'Pending');

    const rawAreas: any[] = detail.areas || [];
    setAreas(
      rawAreas.map(a => ({
        id: String(pick(a, 'id', 'areaId')),
        name: pick(a, 'name', 'areaName'),
        savedName: pick(a, 'name', 'areaName'),
        file: null,
        fileName: '',
        layoutImagePath:
          pick(a, 'layoutImagePath', 'drawingPath', 'filePath') ||
          pick(a.photos?.[0], 'downloadUrl', 'filePath') ||
          null,
        photoCount:
          a.photoCount ?? a.photosCount ?? (Array.isArray(a.photos) ? a.photos.length : 0),
        isNew: false,
      })),
    );
  };

  const projectId = project?.id || project?.projectId;

  useEffect(() => {
    if (visible && project) {
      setEditing(false);
      // Show what we already have immediately, then refresh with the full
      // record (this also gives us the areas list, which the dashboard's
      // project list doesn't include).
      applyDetail(project);
      setLoadingDetail(true);
      getProject(projectId)
        .then(res => applyDetail(res.data))
        .catch(err => {
          console.error(err?.response?.data || err.message);
          // Not fatal — we already applied what the list gave us above.
        })
        .finally(() => setLoadingDetail(false));

      scale.setValue(0.94);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, {toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 16, bounciness: 7}),
        Animated.timing(opacity, {toValue: 1, duration: 220, useNativeDriver: Platform.OS !== 'web'}),
      ]).start();
    }
  }, [visible, project]);

  if (!project) return null;

  const handleSave = async () => {
    // Anyone can type into a new area card and then reach straight for the
    // main "Save Changes" button instead of that card's own "Add Area"
    // button — save any such pending areas first so nothing gets lost.
    const pendingAreaIdxs = areas
      .map((a, i) =>
        a.isNew || (a.name.trim() && (a.file || a.name !== a.savedName)) ? i : -1,
      )
      .filter(i => i !== -1);
    for (const idx of pendingAreaIdxs) {
      const saved = await handleSaveArea(idx);
      if (!saved) return;
    }

    onSave({
      projectName,
      sector,
      jobNo,
      location,
      vesselOrSiteName,
      assignedSurveyorId: surveyorId,
      assignedQcId: qcId,
      assignedClientId: clientId,
      status,
    });
  };

  const patchArea = (idx: number, patch: Partial<AreaRow>) =>
    setAreas(prev => prev.map((a, i) => (i === idx ? {...a, ...patch} : a)));

  const handleAddAreaRow = () => setAreas(prev => [...prev, emptyAreaRow()]);

  const handleSaveArea = async (idx: number): Promise<boolean> => {
    const area = areas[idx];
    if (!area.name.trim()) {
      Alert.alert('Error', 'Area name is required');
      return false;
    }
    patchArea(idx, {saving: true});
    try {
      if (area.isNew) {
        const res = await addProjectArea(projectId, area.name, area.file);
        const newId = String(pick(res.data, 'id', 'areaId'));
        patchArea(idx, {
          id: newId,
          isNew: false,
          saving: false,
          savedName: area.name,
          file: null,
          fileName: '',
          layoutImagePath: res.data?.layoutImagePath || null,
        });
      } else {
        const res = await updateProjectArea(projectId, area.id, area.name, area.file);
        patchArea(idx, {
          saving: false,
          savedName: area.name,
          file: null,
          fileName: '',
          layoutImagePath: res.data?.layoutImagePath || area.layoutImagePath,
        });
      }
      onAreasChanged?.();
      return true;
    } catch (err: any) {
      console.error(err?.response?.data || err.message);
      if (area.isNew && err?.createdArea?.id) {
        patchArea(idx, {
          id: String(err.createdArea.id),
          isNew: false,
          savedName: area.name,
          saving: false,
        });
      } else {
        patchArea(idx, {saving: false});
      }
      Alert.alert(
        err?.createdArea ? 'Area created; image upload failed' : 'Area save/upload failed',
        getApiErrorMessage(err, 'Could not save the area or upload its image.'),
      );
      return false;
    }
  };

  const handleRemoveArea = (idx: number) => {
    const area = areas[idx];
    if (area.isNew) {
      setAreas(prev => prev.filter((_, i) => i !== idx));
      return;
    }
    confirmAction(`Remove area "${area.name}"? This cannot be undone.`, 'Remove', async () => {
      patchArea(idx, {deleting: true});
      try {
        await deleteProjectArea(projectId, area.id);
        setAreas(prev => prev.filter((_, i) => i !== idx));
        onAreasChanged?.();
      } catch (err: any) {
        console.error(err?.response?.data || err.message);
        patchArea(idx, {deleting: false});
        Alert.alert('Error', 'Could not remove this area');
      }
    });
  };

  const surveyorName =
    surveyors.find(s => s.id === surveyorId)?.displayName || (surveyorId ? surveyorId : '—');
  const qcName = qcUsers.find(u => u.id === qcId)?.displayName || (qcId ? qcId : '—');
  const clientName = clients.find(c => c.id === clientId)?.displayName || (clientId ? clientId : '—');
  const statusMeta = STATUS_OPTIONS.find(s => s.label === status) ?? STATUS_OPTIONS[0];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.modal, {opacity, transform: [{scale}]}]}>
          <View style={styles.headerBand}>
            <View style={styles.headerGlow} />
            <View style={styles.headerIconWrap}>
              <Text style={styles.headerIcon}>📁</Text>
            </View>
            <View style={{flex: 1, zIndex: 1}}>
              <Text style={styles.title}>{projectName || project.projectName}</Text>
              <Text style={styles.subtitle}>
                {editing ? 'Editing project details' : 'Project details'}
                {loadingDetail ? ' · refreshing…' : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} style={styles.bodyScroll}>
            <SectionHeader color="#8fa7f8" icon="📁" title="Project Information" />

            {editing ? (
              <>
                <Field label="Project Name">
                  <TextInput style={styles.input} value={projectName} onChangeText={setProjectName} />
                </Field>
                <View style={styles.row}>
                  <View style={styles.half}>
                    <Field label="Sector">
                      <SimpleSelect value={sector} options={SECTOR_OPTIONS} onChange={setSector} />
                    </Field>
                  </View>
                  <View style={styles.half}>
                    <Field label="Job Number">
                      <TextInput style={styles.input} value={jobNo} onChangeText={setJobNo} />
                    </Field>
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.half}>
                    <Field label="Location">
                      <TextInput style={styles.input} value={location} onChangeText={setLocation} />
                    </Field>
                  </View>
                  <View style={styles.half}>
                    <Field label="Vessel / Site Name">
                      <TextInput
                        style={styles.input}
                        value={vesselOrSiteName}
                        onChangeText={setVesselOrSiteName}
                      />
                    </Field>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.row}>
                  <ReadField label="Sector" value={sector} half />
                  <ReadField label="Job Number" value={jobNo || '—'} half />
                </View>
                <View style={styles.row}>
                  <ReadField label="Location" value={location || '—'} half />
                  <ReadField label="Vessel / Site Name" value={vesselOrSiteName || '—'} half />
                </View>
              </>
            )}

            <SectionHeader color="#a75a0b" icon="📌" title="Status" />
            {editing ? (
              <View style={styles.statusRow}>
                {STATUS_OPTIONS.map(opt => {
                  const active = status === opt.label;
                  return (
                    <TouchableOpacity
                      key={opt.label}
                      onPress={() => setStatus(opt.label)}
                      style={[
                        styles.statusChip,
                        {borderColor: active ? opt.color : '#e5e9f6'},
                        active && {backgroundColor: opt.bg},
                      ]}>
                      <Text style={styles.statusChipIcon}>{opt.icon}</Text>
                      <Text style={[styles.statusChipText, active && {color: opt.color, fontWeight: '700'}]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={[styles.readStatusChip, {backgroundColor: statusMeta.bg}]}>
                <Text style={styles.statusChipIcon}>{statusMeta.icon}</Text>
                <Text style={[styles.statusChipText, {color: statusMeta.color, fontWeight: '700'}]}>
                  {statusMeta.label}
                </Text>
              </View>
            )}

            <SectionHeader color="#8053a6" icon="👥" title="Team Assignment" />

            {editing ? (
              <View style={styles.row}>
                <View style={styles.third}>
                  <Field label="Surveyor">
                    <SimpleSelect
                      value={surveyorId}
                      placeholder="Select surveyor"
                      options={surveyors.map(s => ({label: s.displayName, value: s.id}))}
                      onChange={setSurveyorId}
                    />
                  </Field>
                </View>
                <View style={styles.third}>
                  <Field label="QC">
                    <SimpleSelect
                      value={qcId}
                      placeholder="Select QC"
                      options={qcUsers.map(u => ({label: u.displayName, value: u.id}))}
                      onChange={setQcId}
                    />
                  </Field>
                </View>
                <View style={styles.third}>
                  <Field label="Client">
                    <SimpleSelect
                      value={clientId}
                      placeholder="Select client"
                      options={clients.map(c => ({label: c.displayName, value: c.id}))}
                      onChange={setClientId}
                    />
                  </Field>
                </View>
              </View>
            ) : (
              <View style={styles.row}>
                <ReadField label="Surveyor" value={surveyorName} third />
                <ReadField label="QC" value={qcName} third />
                <ReadField label="Client" value={clientName} third />
              </View>
            )}

            <SectionHeader color="#8fa7f8" icon="🗺️" title={`Areas ${areas.length ? `(${areas.length})` : ''}`} />

            {loadingDetail && areas.length === 0 ? (
              <ActivityIndicator color="#8fa7f8" style={{marginVertical: 10}} />
            ) : areas.length === 0 && !editing ? (
              <Text style={styles.noAreasText}>No areas added yet.</Text>
            ) : (
              areas.map((area, idx) => (
                <AreaCard
                  key={area.id || `new-${idx}`}
                  area={area}
                  editing={editing}
                  onChangeName={name => patchArea(idx, {name})}
                  onPickFile={file => patchArea(idx, {file, fileName: file?.name || ''})}
                  onRemove={() => handleRemoveArea(idx)}
                />
              ))
            )}

            {editing && (
              <TouchableOpacity style={styles.addAreaBtn} onPress={handleAddAreaRow}>
                <Text style={styles.addAreaBtnText}>＋  Add Another Area</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {editing ? (
              <View style={styles.footerBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <SaveButton
                  loading={loading || areas.some(area => area.saving)}
                  onPress={handleSave}
                />
              </View>
            ) : (
              <View style={styles.footerBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                  <Text style={styles.editBtnText}>✎  Edit Project</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function SectionHeader({color, icon, title}: {color: string; icon: string; title: string}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionDot, {backgroundColor: color}]} />
      <Text style={styles.sectionIcon}>{icon}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <View style={{marginBottom: 16}}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function ReadField({
  label,
  value,
  half,
  third,
}: {
  label: string;
  value: string;
  half?: boolean;
  third?: boolean;
}) {
  return (
    <View style={[half && styles.half, third && styles.third, {marginBottom: 16}]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.readValue}>{value}</Text>
    </View>
  );
}

function AreaCard({
  area,
  editing,
  onChangeName,
  onPickFile,
  onRemove,
}: {
  area: AreaRow;
  editing: boolean;
  onChangeName: (name: string) => void;
  onPickFile: (file: any) => void;
  onRemove: () => void;
}) {
  if (!editing) {
    return (
      <View style={styles.areaReadRow}>
        <View style={styles.areaReadIconWrap}>
          <Text style={styles.areaReadIcon}>🗺️</Text>
        </View>
        <View style={{flex: 1}}>
          <Text style={styles.areaReadName}>{area.name}</Text>
          <Text style={styles.areaReadMeta}>
            {area.layoutImagePath ? 'Drawing uploaded' : 'No drawing uploaded'}
            {typeof area.photoCount === 'number' ? ` · ${area.photoCount} photo${area.photoCount === 1 ? '' : 's'}` : ''}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.areaCard}>
      <View style={styles.areaCardHeader}>
        <Text style={styles.areaCardTitle}>{area.isNew ? 'New Area' : area.name || 'Area'}</Text>
        <TouchableOpacity onPress={onRemove} disabled={area.deleting}>
          {area.deleting ? (
            <ActivityIndicator color="#d64545" size="small" />
          ) : (
            <Text style={styles.areaRemoveText}>Remove</Text>
          )}
        </TouchableOpacity>
      </View>
      <Field label="Area Name">
        <TextInput
          style={styles.input}
          placeholder="e.g. Pipe Rack Deck"
          placeholderTextColor="#9aa0b4"
          value={area.name}
          onChangeText={onChangeName}
        />
      </Field>
      <Field label="Area Image (JPG, PNG, WebP; max 10 MB)">
        {area.layoutImagePath ? (
          <AuthenticatedImage path={area.layoutImagePath} style={styles.areaPreview} />
        ) : null}
        <FileUploadButton
          fileName={area.fileName || (area.layoutImagePath ? 'Replace existing drawing' : '')}
          onPick={onPickFile}
        />
      </Field>
    </View>
  );
}

function FileUploadButton({fileName, onPick}: {fileName: string; onPick: (file: any) => void}) {
  const inputId = useRef(`file-input-${Math.random().toString(36).slice(2)}`).current;

  if (Platform.OS === 'web') {
    return (
      <View>
        {/* @ts-ignore */}
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          style={{display: 'none'}}
          onChange={(e: any) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
          }}
        />
        {/* @ts-ignore */}
        <label htmlFor={inputId} style={uploadLabelStyleWeb}>
          {fileName ? `📎  ${fileName}` : '📤  Click to upload drawing (image or PDF)'}
        </label>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.uploadBoxNative}
      onPress={() => Alert.alert('Not supported', 'File upload is only available on web for now.')}>
      <Text style={styles.uploadBoxNativeText}>{fileName || 'Tap to upload (web only)'}</Text>
    </TouchableOpacity>
  );
}

function SaveButton({loading, onPress}: {loading?: boolean; onPress: () => void}) {
  const scale = useRef(new Animated.Value(1)).current;
  const animateTo = (v: number) =>
    Animated.spring(scale, {toValue: v, useNativeDriver: Platform.OS !== 'web', speed: 30, bounciness: 6}).start();
  return (
    <TouchableOpacity onPressIn={() => animateTo(0.96)} onPressOut={() => animateTo(1)} onPress={onPress} disabled={loading}>
      <Animated.View style={[styles.saveBtn, {transform: [{scale}]}]}>
        <Text style={styles.saveBtnText}>{loading ? 'Saving…' : '✓  Save Changes'}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

function SimpleSelect({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: string[] | {label: string; value: string}[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const normalized = options.map(o => (typeof o === 'string' ? {label: o, value: o} : o));

  if (Platform.OS === 'web') {
    return (
      <View style={styles.selectWrap}>
        {/* @ts-ignore */}
        <select value={value} onChange={(e: any) => onChange(e.target.value)} style={selectStyleWeb}>
          {placeholder && <option value="">{placeholder}</option>}
          {normalized.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Text style={styles.selectArrow}>▾</Text>
      </View>
    );
  }

  const currentLabel = normalized.find(o => o.value === value)?.label || placeholder || 'Select';
  return (
    <TouchableOpacity
      style={styles.input}
      onPress={() => {
        const idx = normalized.findIndex(o => o.value === value);
        const next = normalized[(idx + 1) % normalized.length];
        if (next) onChange(next.value);
      }}>
      <Text style={{color: value ? '#252f50' : '#9aa0b4'}}>{currentLabel} ▾</Text>
    </TouchableOpacity>
  );
}

const selectStyleWeb: any = {
  width: '100%',
  padding: '11px 34px 11px 12px',
  borderRadius: 10,
  border: '1.5px solid transparent',
  fontSize: 14,
  backgroundColor: 'transparent',
  color: '#252f50',
  appearance: 'none',
  WebkitAppearance: 'none',
  outline: 'none',
  cursor: 'pointer',
};

const uploadLabelStyleWeb: any = {
  display: 'block',
  border: '1.5px dashed #c9cce0',
  borderRadius: 10,
  padding: '14px 12px',
  fontSize: 13,
  color: '#5b6178',
  backgroundColor: '#f8f9fc',
  textAlign: 'center',
  cursor: 'pointer',
};

const styles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(12, 14, 34, 0.6)', alignItems: 'center', justifyContent: 'center', padding: 20},
  modal: {
    width: '100%',
    maxWidth: 780,
    maxHeight: '92%' as any,
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      web: {boxShadow: '0px 30px 70px rgba(8, 10, 35, 0.4)'},
      default: {shadowColor: '#000', shadowOffset: {width: 0, height: 14}, shadowOpacity: 0.32, shadowRadius: 34, elevation: 14},
    }),
  },
  headerBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 24,
    paddingHorizontal: 28,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#242d52',
    ...Platform.select({
      web: {backgroundImage: 'linear-gradient(120deg, #242d52 0%, #718be8 60%, #8fa7f8 130%)'},
    }),
  },
  headerGlow: {position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -30},
  headerIconWrap: {width: 46, height: 46, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', zIndex: 1},
  headerIcon: {fontSize: 20},
  title: {fontSize: 19, fontWeight: '800', color: '#fff'},
  subtitle: {fontSize: 12.5, color: '#a9acd6', marginTop: 3},
  closeBtn: {width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', zIndex: 1},
  closeBtnText: {color: '#c7caf0', fontSize: 14, fontWeight: '700'},
  bodyScroll: {maxHeight: 520},
  body: {padding: 28, paddingBottom: 10},
  sectionHeader: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22, marginBottom: 16},
  sectionDot: {width: 8, height: 8, borderRadius: 4},
  sectionIcon: {fontSize: 14},
  sectionTitle: {fontSize: 14.5, fontWeight: '800', color: '#252f50'},
  sectionLine: {flex: 1, height: 1, backgroundColor: '#eceef4', marginLeft: 4},
  label: {fontSize: 12.5, fontWeight: '700', color: '#5b6178', marginBottom: 7, letterSpacing: 0.2},
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e9f6',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#f8f9fc',
    color: '#252f50',
  },
  readValue: {fontSize: 14, fontWeight: '600', color: '#252f50'},
  selectWrap: {borderWidth: 1.5, borderColor: '#e5e9f6', borderRadius: 10, backgroundColor: '#f8f9fc', position: 'relative', justifyContent: 'center'},
  selectArrow: {position: 'absolute', right: 12, fontSize: 12, color: '#8a8fa3', pointerEvents: 'none' as any},
  row: {flexDirection: 'row', gap: 14},
  half: {flex: 1},
  third: {flex: 1},
  statusRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6},
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#e5e9f6',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
  },
  readStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  statusChipIcon: {fontSize: 13},
  statusChipText: {fontSize: 12.5, fontWeight: '600', color: '#5b6178'},
  noAreasText: {fontSize: 13, color: '#9aa0b4', marginBottom: 10},
  areaReadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f1f6',
  },
  areaReadIconWrap: {width: 34, height: 34, borderRadius: 9, backgroundColor: '#eafafa', alignItems: 'center', justifyContent: 'center'},
  areaReadIcon: {fontSize: 15},
  areaReadName: {fontSize: 13.5, fontWeight: '700', color: '#252f50'},
  areaReadMeta: {fontSize: 12, color: '#8a8fa3', marginTop: 2},
  areaCard: {
    borderWidth: 1.5,
    borderColor: '#eceef4',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    backgroundColor: '#fbfbfd',
  },
  areaPreview: {width: '100%', height: 150, borderRadius: 8, marginBottom: 10},
  areaCardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  areaCardTitle: {fontSize: 13.5, fontWeight: '800', color: '#8fa7f8'},
  areaRemoveText: {fontSize: 12, fontWeight: '700', color: '#d64545'},
  uploadBoxNative: {
    borderWidth: 1.5,
    borderColor: '#c9cce0',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#f8f9fc',
  },
  uploadBoxNativeText: {fontSize: 12.5, color: '#5b6178'},
  addAreaBtn: {
    borderWidth: 1.5,
    borderColor: '#8fa7f8',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  addAreaBtnText: {fontSize: 13, fontWeight: '700', color: '#8fa7f8'},
  footer: {paddingHorizontal: 28, paddingVertical: 18, borderTopWidth: 1, borderTopColor: '#eceef4'},
  footerBtns: {flexDirection: 'row', justifyContent: 'flex-end', gap: 12},
  cancelBtn: {borderWidth: 1.5, borderColor: '#e5e9f6', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, justifyContent: 'center'},
  cancelBtnText: {fontSize: 14, fontWeight: '700', color: '#5b6178'},
  editBtn: {backgroundColor: '#718be8', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 22, justifyContent: 'center'},
  editBtnText: {fontSize: 14, fontWeight: '700', color: '#fff'},
  saveBtn: {backgroundColor: '#718be8', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24},
  saveBtnText: {fontSize: 14, fontWeight: '700', color: '#fff'},
});
