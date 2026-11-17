import ClientAssignmentPicker from './ClientAssignmentPicker';
import {chooseAreaAttachment} from './chooseAreaAttachment';
import {visual} from '../theme/visual';
import ProjectDateField from './ProjectDateField';
import CreateProjectVisualStyles from './CreateProjectVisualStyles';
import ProjectFormBannerArt from './ProjectFormBannerArt';
import OurCompanySection from './OurCompanySection';
import ProjectMetadataFields, {ProjectMetadata, emptyProjectMetadata} from './ProjectMetadataFields';
import ClientDetailsSection from './ClientDetailsSection';
import {ClientLogoFile} from './clientLogo';
import {qcAssignmentLabel} from './projectAssignmentLabels';
import HazardousAreaPlanUpload from './HazardousAreaPlanUpload';
import {HazardousAreaPlanFile} from './hazardousAreaPlan';
import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';

type UserOption = {id: string; displayName: string; email?: string; managerId?: string | null; managerName?: string | null};

type AreaInput = {
  name: string;
  file: any;
  fileName: string;
};

type ProjectFormData = Pick<ProjectMetadata, "description" | "clientName"> & {
  ourCompanyId?: string | null;
  clientLogo?: ClientLogoFile | null;
  hazardousAreaPlan?: HazardousAreaPlanFile | null;
  projectName: string;
  jobNumber: string;
  targetDate: string;
  location: string;
  vesselName: string;
  surveyorId: string;
  qcId: string;
  clientId: string;
  clientIds: string[];
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
  const {width} = useWindowDimensions();
  const compact = width < 700;
  const [ourCompanyId, setOurCompanyId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ProjectMetadata>(emptyProjectMetadata);
  const [clientLogo, setClientLogo] = useState<ClientLogoFile | null>(null);
  const [projectName, setProjectName] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [jobNumber, setJobNumber] = useState('');
  const [location, setLocation] = useState('');
  const [vesselName, setVesselName] = useState('');
  const [surveyorId, setSurveyorId] = useState('');
  const [qcId, setQcId] = useState('');
  const [clientIds, setClientIds] = useState<string[]>([]);
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
    setOurCompanyId(null);
    setMetadata(emptyProjectMetadata()); setClientLogo(null);
    setProjectName('');
    setJobNumber('');
    setTargetDate('');
    setLocation('');
    setVesselName('');
    setSurveyorId('');
    setQcId('');
    setClientIds([]);
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
    if (!jobNumber.trim()) {
      setError('Job Number is required.');
      return;
    }
    if (!targetDate) {
      setError('Target Date is required.');
      return;
    }
    if (!metadata.clientName.trim()) {setError('Client Company Name is required.'); return;}
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
      description: metadata.description, clientName: metadata.clientName, ourCompanyId, clientLogo,
      projectName,
      jobNumber: jobNumber.trim(),
      targetDate,
      location,
      vesselName,
      surveyorId,
      qcId,
      clientId: clientIds[0] || '', clientIds,
      areas: filledAreas,
      hazardousAreaPlan,
    });
  };

  const requiredFilled = [projectName, location, vesselName, surveyorId, qcId, metadata.clientName.trim()].filter(
    Boolean,
  ).length;
  const hasArea = areas.some(a => a.name.trim()) ? 1 : 0;
  const filledCount = requiredFilled + hasArea;
  const totalRequired = 7;
  const progressPct = Math.round((filledCount / totalRequired) * 100);

  if (!visible) return null;

  return (
    <View style={{flex:1,width:'100%',backgroundColor:'#f5f7fb'}}>
        <Animated.View nativeID="create-project-form" style={[styles.page, {opacity, transform:[{scale}]}]}>
          <CreateProjectVisualStyles />
          <View nativeID="ex-project-form-banner" style={[styles.headerBand, compact && styles.compactPadding]}>
            <ProjectFormBannerArt />
            <View style={styles.headerIconWrap}>
              <Text style={styles.headerIcon}>📋</Text>
            </View>
            <View style={{flex: 1, zIndex: 1}}>
              <Text accessibilityRole="header" style={styles.title}>Create New Project</Text>
              <Text style={styles.subtitle}>Set up a new survey project and assign your team</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close project form" disabled={loading} onPress={onClose} style={styles.closeBtn}>
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

          <ScrollView nativeID="ex-project-form-scroll" keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.body, compact && styles.compactBody]} style={{flex:1}}>
            <View nativeID="ex-project-information" style={styles.sectionCard}>
            <StepHeader index={1} color="#2563eb" icon="📁" title="PROJECT INFORMATION" />

            <Field label="Project Name" required>
              <TextInput
                style={[styles.input, {textTransform: 'uppercase'}]}
                placeholder="e.g. MV Resolute Annual Inspection"
                placeholderTextColor="#9aa0b4"
                value={projectName}
                onChangeText={setProjectName}
                nativeID="project-name-field"
                autoCapitalize="none"
              />
            </Field>

            <View style={[styles.row, compact && styles.stackedRow]}>
              <View style={styles.half}>
                <ProjectDateField label="Target Date" value={targetDate} onChange={setTargetDate} disabled={loading} required />
              </View>
              <View style={styles.half}>
                <Field label="Job Number" required>
                  <TextInput
                    style={[styles.input, {textTransform: 'uppercase'}]}
                    accessibilityLabel="Job Number (required)"
                    placeholder="JOB-2026-0453"
                    placeholderTextColor="#9aa0b4"
                value={jobNumber}
                    onChangeText={setJobNumber}
                    nativeID="project-job-number-field"
                autoCapitalize="none"
                  />
                </Field>
              </View>
            </View>

            <View style={[styles.row, compact && styles.stackedRow]}>
              <View style={styles.half}>
                <Field label="Location" required>
                  <TextInput
                    style={[styles.input, {textTransform: 'uppercase'}]}
                    placeholder="e.g. Rotterdam, Netherlands"
                    placeholderTextColor="#9aa0b4"
                    value={location}
                    onChangeText={setLocation}
                    nativeID="project-location-field"
                autoCapitalize="none"
                  />
                </Field>
              </View>
              <View style={styles.half}>
                <Field label="Vessel / Site Name" required>
                  <TextInput
                    style={[styles.input, {textTransform: 'uppercase'}]}
                    placeholder="e.g. MV Resolute"
                    placeholderTextColor="#9aa0b4"
                    value={vesselName}
                    onChangeText={setVesselName}
                    nativeID="project-vessel-field"
                autoCapitalize="none"
                  />
                </Field>
              </View>
            </View>

            <ProjectMetadataFields preserveCase descriptionOnly columns={!compact} value={metadata} onChange={setMetadata} inputStyle={styles.input} />
            </View>
            <View style={styles.sectionCard}>
            <StepHeader index={2} color="#2563eb" icon="📁" title="OUR COMPANY DETAILS" />
            <OurCompanySection value={ourCompanyId} onChange={setOurCompanyId} inputStyle={styles.input} />
            </View>
            <View style={styles.sectionCard}>
            <StepHeader index={3} color="#2563eb" icon="📁" title="CLIENT COMPANY DETAILS" />
            <ClientDetailsSection preserveCase required name={metadata.clientName} onNameChange={clientName => setMetadata({...metadata, clientName})} logo={clientLogo} onLogoChange={setClientLogo} inputStyle={styles.input} disabled={loading} />
            </View>
            <View style={styles.sectionCard}>
            <StepHeader index={4} color="#2563eb" icon="👥" title="TEAM ASSIGNMENT" />

            <View style={[styles.row, compact && styles.stackedRow]}>
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
                <Field label="Assign Client ID">
                  <ClientAssignmentPicker value={clientIds} options={clients} onChange={setClientIds} disabled={loading} />
                </Field>
              </View>
            </View>

            </View>
            <View style={styles.sectionCard}>
            <StepHeader index={5} color="#2563eb" icon="📄" title="HAZARDOUS AREA PLAN" />
            <HazardousAreaPlanUpload value={hazardousAreaPlan} onChange={setHazardousAreaPlan} disabled={loading} />
            </View>
            <View style={styles.sectionCard}>
            <StepHeader index={6} color="#2563eb" icon="🗺️" title="Area Details" />

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

            </View>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠ {error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View nativeID="ex-project-form-footer" style={[styles.footer, compact && styles.compactPadding]}>
            <Text style={styles.progressLabel}>
              {filledCount}/{totalRequired} required fields
            </Text>
            <View style={styles.footerBtns}>
              <TouchableOpacity
                nativeID="create-project-cancel"
                accessibilityRole="button"
                disabled={loading}
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
  );
}

function StepHeader({index, color, icon, title}: {index: number; color: string; icon: string; title: string}) {
  return (
    <View style={styles.stepHeader}>
      <View testID="project-form-step-badge" style={[styles.stepBadge, {backgroundColor: color}]}>
        <Text style={styles.stepBadgeText}>{index}</Text>
      </View>
      <Text style={styles.stepIcon}>{icon}</Text>
      <Text accessibilityRole="header" style={styles.stepTitle}>{title}</Text>
      <View style={styles.stepLine} />
    </View>
  );
}

function Field({label, required, children}: {label: string; required?: boolean; children: React.ReactNode}) {
  return (
    <View style={{marginBottom: 16}}>
      <Text testID="project-form-label" style={[styles.label, {textTransform: 'uppercase'}]}>
        {label} {required ? <Text style={styles.required}>*</Text> : !label.includes("Optional") ? <Text style={styles.optional}> · Optional</Text> : null}
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
        <Text accessibilityRole="header" style={styles.areaCardTitle}>Area {index + 1}</Text>
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
          accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
          style={{display: 'none'}}
          onChange={(e: any) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
          }}
        />
        {/* @ts-ignore */}
        <label htmlFor={inputId} style={uploadLabelStyleWeb}>
          {fileName ? '✓ Layout selected' : '📤  Choose layout image or PDF'}
        </label>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.uploadBoxNative}
      onPress={() => void chooseAreaAttachment(onPick)}>
      <Text style={styles.uploadBoxNativeText}>{fileName ? '✓ Layout selected' : 'Choose layout image or PDF'}</Text>
    </TouchableOpacity>
  );
}

function CreateButton({loading, onPress}: {loading?: boolean; onPress: () => void}) {
  const scale = useRef(new Animated.Value(1)).current;
  const animateTo = (v: number) =>
    Animated.spring(scale, {toValue: v, useNativeDriver: Platform.OS !== 'web', speed: 30, bounciness: 6}).start();
  return (
    <TouchableOpacity nativeID="create-project-submit" accessibilityRole="button" accessibilityState={{disabled: !!loading, busy: !!loading}} onPressIn={() => animateTo(0.96)} onPressOut={() => animateTo(1)} onPress={onPress} disabled={loading}>
      <Animated.View style={[styles.createBtn, loading && styles.createBtnDisabled, {transform: [{scale}]}]}>
        {loading && <ActivityIndicator size="small" color="#fff" />}
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
  padding: '12px 34px 12px 12px',
  minHeight: 46,
  boxSizing: 'border-box',
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
  border: '1px dashed #93b8ed',
  borderRadius: 10,
  padding: '14px 12px',
  fontSize: 13,
  color: '#5b6178',
  backgroundColor: '#f9fbfe',
  textAlign: 'center',
  cursor: 'pointer',
};

const styles = StyleSheet.create({
  page: {flex:1, width:'100%', backgroundColor:'#fff'},
  headerBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 24,
    paddingHorizontal: 28,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: visual.ink,
    ...Platform.select({
      web: {backgroundImage: 'linear-gradient(105deg, #092331 0%, #0b3041 64%, #126077 100%)'},
    }),
  },
  headerGlow: {position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -30},
  headerIconWrap: {width: 46, height: 46, borderRadius: 13, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', zIndex: 1},
  headerIcon: {fontSize: 20},
  title: {fontFamily: visual.display, fontSize: 26, fontWeight: '800', color: '#f3fbfd'},
  subtitle: {fontSize: 13, color: '#b9d2dc', marginTop: 3},
  closeBtn: {width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', zIndex: 1},
  closeBtnText: {color: '#41658e', fontSize: 14, fontWeight: '700'},
  progressTrack: {height: 3, backgroundColor: '#eceef4'},
  progressFill: {height: 3, backgroundColor: '#2563eb'},
  bodyScroll: {maxHeight: 500},
  body: {padding: 24, paddingBottom: 8, backgroundColor: '#f5f8fc'},
  compactPadding: {paddingHorizontal: 16},
  compactBody: {padding: 12},
  sectionCard: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce6f2', borderTopWidth: 3, borderTopColor: '#50a5ae', borderRadius: visual.radius.panel, padding: 18, marginBottom: 16, ...Platform.select({web: {boxShadow: '0 2px 8px rgba(24,42,70,.04)'}, default: {elevation: 1}})},
  stepHeader: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 0, marginBottom: 20},
  stepBadge: {width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center'},
  stepBadgeText: {color: '#fff', fontSize: 11.5, fontWeight: '800'},
  stepIcon: {fontSize: 14},
  stepTitle: {fontSize: 15, fontWeight: '800', color: '#172b4d', flexShrink: 1},
  stepLine: {flex: 1, height: 1, backgroundColor: '#eceef4', marginLeft: 6},
  label: {fontSize: 12.5, fontWeight: '700', color: '#5b6178', marginBottom: 7, letterSpacing: 0.2},
  required: {color: '#d64545'},
  optional: {fontSize: 11, fontWeight: '400', color: '#7b8aa0'},
  input: {
    borderWidth: 1,
    borderColor: '#ccd9e8',
    borderRadius: 10,
    minHeight: 46,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#f9fbfe',
    color: '#252f50',
  },
  selectWrap: {borderWidth: 1, borderColor: '#ccd9e8', borderRadius: 10, backgroundColor: '#f9fbfe', position: 'relative', justifyContent: 'center'},
  selectArrow: {position: 'absolute', right: 12, fontSize: 12, color: '#8a8fa3', pointerEvents: 'none' as any},
  row: {flexDirection: 'row', gap: 14},
  stackedRow: {flexDirection: 'column', gap: 0},
  half: {flex: 1, minWidth: 0},
  third: {flex: 1, minWidth: 0},
  areaCard: {
    borderWidth: 1,
    borderColor: '#eceef4',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    backgroundColor: '#fbfbfd',
  },
  areaCardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  areaCardTitle: {fontSize: 13.5, fontWeight: '800', color: '#2563eb'},
  areaRemoveText: {fontSize: 12, fontWeight: '700', color: '#d64545'},
  uploadBoxNative: {
    borderWidth: 1,
    borderColor: '#c9cce0',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#f9fbfe',
  },
  uploadBoxNativeText: {fontSize: 12.5, color: '#5b6178'},
  addAreaBtn: {
    borderWidth: 1,
    borderColor: '#93b8ed',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  addAreaBtnText: {fontSize: 13, fontWeight: '700', color: '#2563eb'},
  errorBox: {backgroundColor: '#fdeceb', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginTop: 12},
  errorText: {color: '#ba4e3c', fontSize: 12.5, fontWeight: '600'},
  footer: {paddingHorizontal: 28, paddingVertical: 18, borderTopWidth: 1, borderTopColor: '#eceef4'},
  progressLabel: {fontSize: 11.5, color: '#9aa0b4', fontWeight: '600', marginBottom: 10},
  footerBtns: {flexDirection: 'row', justifyContent: 'flex-end', gap: 12},
  cancelBtn: {borderWidth: 1, borderColor: '#ccd9e8', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, justifyContent: 'center'},
  cancelBtnText: {fontSize: 14, fontWeight: '700', color: '#5b6178'},
  createBtn: {backgroundColor: '#2563eb', borderRadius: 9, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 24},
  createBtnDisabled: {backgroundColor: '#86a9ee', opacity: 0.8},
  createBtnText: {fontSize: 14, fontWeight: '800', color: '#fff'},
});

