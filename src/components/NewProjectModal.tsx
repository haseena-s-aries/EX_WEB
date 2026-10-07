import {qcAssignmentLabel} from './projectAssignmentLabels';
import HazardousAreaPlanUpload from './HazardousAreaPlanUpload';
import {HazardousAreaPlanFile} from './hazardousAreaPlan';
import React, {useState, useRef, useEffect} from 'react';
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
  Alert,
} from 'react-native';

type UserOption = {id: string; displayName: string; managerId?: string | null; managerName?: string | null};

type AreaInput = {
  name: string;
  file: any;
  fileName: string;
};

type ProjectFormData = {
  hazardousAreaPlan?: HazardousAreaPlanFile | null;
  projectName: string;
  sector: string;
  jobNumber: string;
  location: string;
  vesselName: string;
  surveyorId: string;
  qcId: string;
  clientId: string;
  areas: AreaInput[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: ProjectFormData) => void;
  surveyors: UserOption[];
  qcUsers: UserOption[];
  clients: UserOption[];
  loading?: boolean;
};

const SECTOR_OPTIONS = [
  'Oil & Gas',
  'Shipping',
  'Offshore Wind',
  'Naval',
  'Port & Terminal',
  'Fisheries',
];

const emptyArea = (): AreaInput => ({name: '', file: null, fileName: ''});

export default function NewProjectModal({
  visible,
  onClose,
  onCreate,
  surveyors,
  qcUsers,
  clients,
  loading,
}: Props) {
  const [projectName, setProjectName] = useState('');
  const [sector, setSector] = useState(SECTOR_OPTIONS[0]);
  const [jobNumber, setJobNumber] = useState('');
  const [location, setLocation] = useState('');
  const [vesselName, setVesselName] = useState('');
  const [surveyorId, setSurveyorId] = useState('');
  const [qcId, setQcId] = useState('');
  const [clientId, setClientId] = useState('');
  const [areas, setAreas] = useState<AreaInput[]>([emptyArea()]);
  const [error, setError] = useState('');
  const [hazardousAreaPlan, setHazardousAreaPlan] = useState<HazardousAreaPlanFile | null>(null);

  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setHazardousAreaPlan(null);
      scale.setValue(0.9);
      opacity.setValue(0);
      progress.setValue(0);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: Platform.OS !== 'web',
          speed: 16,
          bounciness: 7,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 240,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(progress, {
          toValue: 1,
          duration: 700,
          delay: 150,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [visible, scale, opacity, progress]);

  const reset = () => {
    setHazardousAreaPlan(null);
    setProjectName('');
    setJobNumber('');
    setLocation('');
    setVesselName('');
    setSurveyorId('');
    setQcId('');
    setClientId('');
    setAreas([emptyArea()]);
    setError('');
  };

  const handleAddArea = () => setAreas(prev => [...prev, emptyArea()]);

  const handleRemoveArea = (idx: number) =>
    setAreas(prev => prev.filter((_, i) => i !== idx));

  const handleAreaNameChange = (idx: number, name: string) =>
    setAreas(prev => prev.map((a, i) => (i === idx ? {...a, name} : a)));

  const handleAreaFileChange = (idx: number, file: any) =>
    setAreas(prev =>
      prev.map((a, i) => (i === idx ? {...a, file, fileName: file?.name || ''} : a)),
    );

  const handleCreate = () => {
    if (!projectName || !location || !vesselName) {
      setError('Please fill all required fields (marked *)');
      return;
    }
    if (!surveyorId || !qcId) {
      setError('Please assign a Surveyor and QC');
      return;
    }
    const filledAreas = areas.filter(a => a.name.trim());
    if (filledAreas.length === 0) {
      setError('Please add at least one area with a name');
      return;
    }
    setError('');
    onCreate({
      projectName,
      sector,
      jobNumber,
      location,
      vesselName,
      surveyorId,
      qcId,
      clientId,
      areas: filledAreas,
      hazardousAreaPlan,
    });
  };

  const requiredFilled = [projectName, location, vesselName, surveyorId, qcId].filter(
    Boolean,
  ).length;
  const hasArea = areas.some(a => a.name.trim()) ? 1 : 0;
  const filledCount = requiredFilled + hasArea;
  const totalRequired = 6;
  const progressPct = Math.round((filledCount / totalRequired) * 100);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.modal, {opacity, transform: [{scale}]}]}>
          <View style={styles.headerBand}>
            <View style={styles.headerGlow} />
            <View style={styles.headerIconWrap}>
              <Text style={styles.headerIcon}>📋</Text>
            </View>
            <View style={{flex: 1, zIndex: 1}}>
              <Text style={styles.title}>Create New Project</Text>
              <Text style={styles.subtitle}>Set up a new survey project and assign your team</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', `${Math.max(progressPct, 4)}%`],
                  }),
                },
              ]}
            />
          </View>

          <ScrollView contentContainerStyle={styles.body} style={styles.bodyScroll}>
            <StepHeader index={1} color="#8fa7f8" icon="📁" title="Project Information" />

            <Field label="Project Name" required>
              <TextInput
                style={styles.input}
                placeholder="e.g. MV Resolute Annual Inspection"
                placeholderTextColor="#9aa0b4"
                value={projectName}
                onChangeText={value => setProjectName(value.toUpperCase())}
                autoCapitalize="characters"
              />
            </Field>

            <View style={styles.row}>
              <View style={styles.half}>
                <Field label="Sector">
                  <SimpleSelect value={sector} options={SECTOR_OPTIONS} onChange={setSector} />
                </Field>
              </View>
              <View style={styles.half}>
                <Field label="Job Number">
                  <TextInput
                    style={styles.input}
                    placeholder="JOB-2026-0453"
                    placeholderTextColor="#9aa0b4"
                    value={jobNumber}
                    onChangeText={value => setJobNumber(value.toUpperCase())}
                autoCapitalize="characters"
                  />
                </Field>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.half}>
                <Field label="Location" required>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Rotterdam, Netherlands"
                    placeholderTextColor="#9aa0b4"
                    value={location}
                    onChangeText={value => setLocation(value.toUpperCase())}
                autoCapitalize="characters"
                  />
                </Field>
              </View>
              <View style={styles.half}>
                <Field label="Vessel / Site Name" required>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. MV Resolute"
                    placeholderTextColor="#9aa0b4"
                    value={vesselName}
                    onChangeText={value => setVesselName(value.toUpperCase())}
                autoCapitalize="characters"
                  />
                </Field>
              </View>
            </View>

            <StepHeader index={2} color="#8053a6" icon="👥" title="Team Assignment" />

            <View style={styles.row}>
              <View style={styles.third}>
                <Field label="Assign Surveyor" required>
                  <SimpleSelect
                    value={surveyorId}
                    placeholder="Select surveyor"
                    options={surveyors.map(s => ({label: s.displayName, value: s.id}))}
                    onChange={setSurveyorId}
                  />
                </Field>
              </View>
              <View style={styles.third}>
                <Field label="Assign QC" required>
                  <SimpleSelect
                    value={qcId}
                    placeholder="Select QC"
                    options={qcUsers.map(u => ({label: qcAssignmentLabel(u), value: u.id}))}
                    onChange={setQcId}
                  />
                </Field>
              </View>
              <View style={styles.third}>
                <Field label="Assign Client (Optional)">
                  <SimpleSelect
                    value={clientId}
                    placeholder="Select client"
                    options={clients.map(c => ({label: c.displayName, value: c.id}))}
                    onChange={setClientId}
                  />
                </Field>
              </View>
            </View>

            <StepHeader index={3} color="#8fa7f8" icon="📄" title="HAZARDOUS AREA PLAN" />
            <HazardousAreaPlanUpload value={hazardousAreaPlan} onChange={setHazardousAreaPlan} disabled={loading} />
            <StepHeader index={4} color="#8fa7f8" icon="🗺️" title="Area Details" />

            {areas.map((area, idx) => (
              <AreaRow
                key={idx}
                index={idx}
                area={area}
                canRemove={areas.length > 1}
                onChangeName={name => handleAreaNameChange(idx, name)}
                onPickFile={file => handleAreaFileChange(idx, file)}
                onRemove={() => handleRemoveArea(idx)}
              />
            ))}

            <TouchableOpacity style={styles.addAreaBtn} onPress={handleAddArea}>
              <Text style={styles.addAreaBtnText}>＋  Add Another Area</Text>
            </TouchableOpacity>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠ {error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.progressLabel}>
              {filledCount}/{totalRequired} required fields
            </Text>
            <View style={styles.footerBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  reset();
                  onClose();
                }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <CreateButton loading={loading} onPress={handleCreate} />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function StepHeader({index, color, icon, title}: {index: number; color: string; icon: string; title: string}) {
  return (
    <View style={styles.stepHeader}>
      <View style={[styles.stepBadge, {backgroundColor: color}]}>
        <Text style={styles.stepBadgeText}>{index}</Text>
      </View>
      <Text style={styles.stepIcon}>{icon}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
      <View style={styles.stepLine} />
    </View>
  );
}

function Field({label, required, children}: {label: string; required?: boolean; children: React.ReactNode}) {
  return (
    <View style={{marginBottom: 16}}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      {children}
    </View>
  );
}

function AreaRow({
  index,
  area,
  canRemove,
  onChangeName,
  onPickFile,
  onRemove,
}: {
  index: number;
  area: AreaInput;
  canRemove: boolean;
  onChangeName: (name: string) => void;
  onPickFile: (file: any) => void;
  onRemove: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web'}),
      Animated.timing(translateY, {toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web'}),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View style={[styles.areaCard, {opacity, transform: [{translateY}]}]}>
      <View style={styles.areaCardHeader}>
        <Text style={styles.areaCardTitle}>Area {index + 1}</Text>
        {canRemove && (
          <TouchableOpacity onPress={onRemove}>
            <Text style={styles.areaRemoveText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
      <Field label="Area Name" required>
        <TextInput
          style={styles.input}
          placeholder="e.g. Pipe Rack Deck"
          placeholderTextColor="#9aa0b4"
          value={area.name}
          onChangeText={onChangeName}
        />
      </Field>
      <Field label="Area Layout">
        <FileUploadButton fileName={area.fileName} onPick={onPickFile} />
      </Field>
    </Animated.View>
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
          {fileName ? '✓ Layout selected' : '📤  Choose layout image'}
        </label>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.uploadBoxNative}
      onPress={() => Alert.alert('Not supported', 'File upload is only available on web for now.')}>
      <Text style={styles.uploadBoxNativeText}>{fileName ? '✓ Layout selected' : 'Tap to upload (web only)'}</Text>
    </TouchableOpacity>
  );
}

function CreateButton({loading, onPress}: {loading?: boolean; onPress: () => void}) {
  const scale = useRef(new Animated.Value(1)).current;
  const animateTo = (v: number) =>
    Animated.spring(scale, {toValue: v, useNativeDriver: Platform.OS !== 'web', speed: 30, bounciness: 6}).start();
  return (
    <TouchableOpacity onPressIn={() => animateTo(0.96)} onPressOut={() => animateTo(1)} onPress={onPress} disabled={loading}>
      <Animated.View style={[styles.createBtn, {transform: [{scale}]}]}>
        <Text style={styles.createBtnText}>{loading ? 'Creating…' : '✓  Create Project'}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

function SimpleSelect({value, options, onChange, placeholder}: {value: string; options: string[] | {label: string; value: string}[]; onChange: (v: string) => void; placeholder?: string}) {
  const normalized = options.map(o => (typeof o === 'string' ? {label: o, value: o} : o));
  if (Platform.OS !== 'web' && placeholder === 'Select client') normalized.unshift({label: placeholder, value: ''});

  if (Platform.OS === 'web') {
    return (
      <View style={styles.selectWrap}>
        {/* @ts-ignore */}
        <select value={value} onChange={(e: any) => onChange(e.target.value)} style={selectStyleWeb}>
          {placeholder && <option value="">{placeholder}</option>}
          {normalized.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
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
  title: {fontSize: 20, fontWeight: '800', color: '#fff'},
  subtitle: {fontSize: 12.5, color: '#a9acd6', marginTop: 3},
  closeBtn: {width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', zIndex: 1},
  closeBtnText: {color: '#c7caf0', fontSize: 14, fontWeight: '700'},
  progressTrack: {height: 3, backgroundColor: '#eceef4'},
  progressFill: {height: 3, backgroundColor: '#8fa7f8'},
  bodyScroll: {maxHeight: 500},
  body: {padding: 28, paddingBottom: 10},
  stepHeader: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, marginBottom: 18},
  stepBadge: {width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center'},
  stepBadgeText: {color: '#fff', fontSize: 11.5, fontWeight: '800'},
  stepIcon: {fontSize: 14},
  stepTitle: {fontSize: 15.5, fontWeight: '800', color: '#252f50'},
  stepLine: {flex: 1, height: 1, backgroundColor: '#eceef4', marginLeft: 6},
  label: {fontSize: 12.5, fontWeight: '700', color: '#5b6178', marginBottom: 7, letterSpacing: 0.2},
  required: {color: '#d64545'},
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
  selectWrap: {borderWidth: 1.5, borderColor: '#e5e9f6', borderRadius: 10, backgroundColor: '#f8f9fc', position: 'relative', justifyContent: 'center'},
  selectArrow: {position: 'absolute', right: 12, fontSize: 12, color: '#8a8fa3', pointerEvents: 'none' as any},
  row: {flexDirection: 'row', gap: 14},
  half: {flex: 1},
  third: {flex: 1},
  areaCard: {
    borderWidth: 1.5,
    borderColor: '#eceef4',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    backgroundColor: '#fbfbfd',
  },
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
  errorBox: {backgroundColor: '#fdeceb', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginTop: 12},
  errorText: {color: '#ba4e3c', fontSize: 12.5, fontWeight: '600'},
  footer: {paddingHorizontal: 28, paddingVertical: 18, borderTopWidth: 1, borderTopColor: '#eceef4'},
  progressLabel: {fontSize: 11.5, color: '#9aa0b4', fontWeight: '600', marginBottom: 10},
  footerBtns: {flexDirection: 'row', justifyContent: 'flex-end', gap: 12},
  cancelBtn: {borderWidth: 1.5, borderColor: '#e5e9f6', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, justifyContent: 'center'},
  cancelBtnText: {fontSize: 14, fontWeight: '700', color: '#5b6178'},
  createBtn: {backgroundColor: '#b8a5f8', borderRadius: 11, paddingVertical: 13, paddingHorizontal: 24},
  createBtnText: {fontSize: 14, fontWeight: '800', color: '#242d52'},
});
