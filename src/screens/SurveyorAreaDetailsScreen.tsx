import ZoomableImageViewer from '../components/ZoomableImageViewer';
import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {getApiErrorMessage} from '../api/errors';
import {
  AreaEquipment,
  createSurveyorEquipment,
  deleteSurveyorEquipment,
  getProjectAreaPhotos,
  getSurveyorArea,
  getSurveyorEquipment,
  SaveAreaEquipmentRequest,
  SurveyorAreaDetails,
  updateSurveyorEquipment,
} from '../api/projects';
import AuthenticatedImage from '../components/AuthenticatedImage';

type Props = {
  projectId: string;
  areaId: string;
  onBack: () => void;
  onEquipmentPress: (equipmentId: string) => void;
  onEquipmentAdded?: () => void;
};
type PinPosition = {xPercent: number; yPercent: number};
type EquipmentForm = {
  tagNumber: string;
  equipmentId: string;
  rfidTagUid: string;
  type: string;
  otherType: string;
  circuitId: string;
  location: string;
  manufacturer: string;
  protectionDetails: string;
  certificateNumber: string;
};

const emptyForm = (): EquipmentForm => ({
  tagNumber: '',
  equipmentId: '',
  rfidTagUid: '',
  type: '',
  otherType: '',
  circuitId: '',
  location: '',
  manufacturer: '',
  protectionDetails: '',
  certificateNumber: '',
});

const equipmentTypes = ['Transformer', 'Switchgear', 'Circuit Breaker', 'Motor', 'Generator', 'Panel', 'Cable', 'Lighting', 'Outlet', 'Other'];

export default function SurveyorAreaDetailsScreen({
  projectId,
  areaId,
  onBack,
  onEquipmentPress,
  onEquipmentAdded,
}: Props) {
  const {width} = useWindowDimensions();
  const isPhone = width < 700;
  const [area, setArea] = useState<SurveyorAreaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [placementMode, setPlacementMode] = useState(false);
  const [viewingLayout, setViewingLayout] = useState(false);
  const [layoutSize, setLayoutSize] = useState({width: 0, height: 0});
  const [imageAspectRatio, setImageAspectRatio] = useState(16 / 9);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<AreaEquipment | null>(null);
  const [pendingPosition, setPendingPosition] = useState<PinPosition | null>(null);
  const [form, setForm] = useState<EquipmentForm>(emptyForm);
  const [formVisible, setFormVisible] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refreshEquipment = useCallback(async () => {
    const response = await getSurveyorEquipment(projectId, areaId);
    setArea(current => (current ? {...current, equipment: response.data} : current));
    return response.data;
  }, [areaId, projectId]);

  const loadArea = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [areaResponse, equipmentResponse, photosResponse] = await Promise.all([
        getSurveyorArea(projectId, areaId),
        getSurveyorEquipment(projectId, areaId),
        getProjectAreaPhotos(projectId, areaId).catch(() => null),
      ]);
      const firstPhoto = photosResponse?.data?.[0];
      setArea({
        ...areaResponse.data,
        equipment: equipmentResponse.data,
        layoutImagePath:
          areaResponse.data.layoutImagePath || firstPhoto?.downloadUrl || firstPhoto?.filePath,
      });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not load this area.'));
    } finally {
      setLoading(false);
    }
  }, [areaId, projectId]);

  useEffect(() => {
    loadArea();
  }, [loadArea]);

  const handleLayoutPress = (event: any) => {
    if (!placementMode || !layoutSize.width || !layoutSize.height) {
      return;
    }

    const nativeEvent = event.nativeEvent || {};
    const locationX = Number(nativeEvent.locationX ?? nativeEvent.offsetX);
    const locationY = Number(nativeEvent.locationY ?? nativeEvent.offsetY);
    if (!Number.isFinite(locationX) || !Number.isFinite(locationY)) {
      setPlacementMode(false);
      setNotice('Could not read that image position. Select Add Equipment and try again.');
      return;
    }

    const xPercent = Math.max(0, Math.min(100, locationX / layoutSize.width * 100));
    const yPercent = Math.max(0, Math.min(100, locationY / layoutSize.height * 100));
    setPendingPosition({
      xPercent: Number(xPercent.toFixed(2)),
      yPercent: Number(yPercent.toFixed(2)),
    });
    setEditingEquipment(null);
    setForm(emptyForm());
    setFormError('');
    setPlacementMode(false);
    setFormVisible(true);
  };

  const openEditForm = (equipment: AreaEquipment) => {
    setSelectedEquipmentId(equipment.id);
    setEditingEquipment(equipment);
    setPendingPosition({xPercent: equipment.xPercent, yPercent: equipment.yPercent});
    setForm({
      tagNumber: equipment.tagNumber,
      equipmentId: equipment.equipmentId || '',
      rfidTagUid: equipment.rfidTagUid || '',
      type: equipmentTypes.includes(equipment.type) ? equipment.type : equipment.type ? 'Other' : '',
      otherType: equipment.type === 'Other' || !equipmentTypes.includes(equipment.type) ? equipment.type || '' : '',
      circuitId: equipment.circuitId || '',
      location: equipment.location || '',
      manufacturer: equipment.manufacturer || '',
      protectionDetails: equipment.protectionDetails || '',
      certificateNumber: equipment.certificateNumber || '',
    });
    setFormError('');
    setFormVisible(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormVisible(false);
    setEditingEquipment(null);
    setPendingPosition(null);
    setFormError('');
  };

  const saveEquipment = async () => {
    if (!pendingPosition) {
      setFormError('Select a position on the area image first.');
      return;
    }
    if (!form.tagNumber.trim() || !form.type.trim()) {
      setFormError('Tag Number and Type are required.');
      return;
    }
    if (form.type === 'Other' && !form.otherType.trim()) {
      setFormError('Other Equipment Type is required.');
      return;
    }
    if (
      !Number.isFinite(pendingPosition.xPercent) ||
      !Number.isFinite(pendingPosition.yPercent) ||
      pendingPosition.xPercent < 0 ||
      pendingPosition.xPercent > 100 ||
      pendingPosition.yPercent < 0 ||
      pendingPosition.yPercent > 100
    ) {
      setFormError('The selected image position is invalid. Cancel and select the position again.');
      return;
    }
    const payload: SaveAreaEquipmentRequest = {
      ...pendingPosition,
      tagNumber: form.tagNumber.trim(),
      equipmentId: form.equipmentId.trim() || null,
      rfidTagUid: form.rfidTagUid.trim() || null,
      type: form.type === 'Other' ? form.otherType.trim() : form.type,
      circuitId: form.circuitId.trim() || null,
      location: form.location.trim() || null,
      manufacturer: form.manufacturer.trim() || null,
      protectionDetails: form.protectionDetails.trim() || null,
      certificateNumber: form.certificateNumber.trim() || null,
    };
    setSaving(true);
    setFormError('');
    try {
      const response = editingEquipment
        ? await updateSurveyorEquipment(projectId, areaId, editingEquipment.id, payload)
        : await createSurveyorEquipment(projectId, areaId, payload);
      await refreshEquipment();
      if (!editingEquipment) {
        onEquipmentAdded?.();
      }
      setSelectedEquipmentId(response.data.id);
      setNotice(
        editingEquipment
          ? `Equipment ${response.data.sequenceNo} updated.`
          : `Equipment ${response.data.sequenceNo} added.`,
      );
      setFormVisible(false);
      setEditingEquipment(null);
      setPendingPosition(null);
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError, 'Could not save equipment.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteEquipment = (equipment: AreaEquipment) => {
    const performDelete = async () => {
      setDeletingId(equipment.id);
      setNotice('');
      try {
        await deleteSurveyorEquipment(projectId, areaId, equipment.id);
        await refreshEquipment();
        setSelectedEquipmentId(current => current === equipment.id ? null : current);
        setNotice(`Equipment ${equipment.sequenceNo} deleted.`);
      } catch (requestError) {
        Alert.alert('Delete failed', getApiErrorMessage(requestError, 'Could not delete equipment.'));
      } finally {
        setDeletingId(null);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = (globalThis as any).confirm(
        `Delete equipment ${equipment.sequenceNo} (${equipment.tagNumber})?`,
      );
      if (confirmed) {
        performDelete();
      }
      return;
    }

    Alert.alert(
      'Delete equipment',
      `Delete equipment ${equipment.sequenceNo} (${equipment.tagNumber})?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDelete(),
        },
      ],
    );
  };

  if (loading) {
    return <PageState loading message="Loading area layout..." />;
  }
  if (error || !area) {
    return (
      <View style={styles.fullState}>
        <Text style={styles.stateTitle}>Area unavailable</Text>
        <Text style={styles.stateMessage}>{error}</Text>
        <View style={styles.stateActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={loadArea}>
            <Text style={styles.primaryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>&lt; Back to project</Text>
        </TouchableOpacity>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>AREA DETAILS</Text>
          <Text style={styles.title}>{area.areaName}</Text>
          <Text style={styles.subtitle}>{area.equipment.length} equipment items</Text>
        </View>

        <View style={styles.layoutCard}>
          <View style={[styles.cardHeader, isPhone && styles.cardHeaderPhone]}>
            <View style={styles.cardHeaderCopy}>
              <Text style={styles.cardTitle}>Area Layout</Text>
              {!!area.layoutImagePath && <TouchableOpacity onPress={() => setViewingLayout(true)}><Text style={styles.backText}>View Layout</Text></TouchableOpacity>}
              {viewingLayout && area.layoutImagePath && <ZoomableImageViewer visible title="Area Layout" images={[area.layoutImagePath]} pins={area.equipment.map(item => ({id: item.id, label: String(item.sequenceNo), xPercent: Number(item.xPercent) || 0, yPercent: Number(item.yPercent) || 0, title: item.tagNumber, lines: [item.type]}))} onClose={() => setViewingLayout(false)} />}
            </View>
            <TouchableOpacity
              disabled={!area.layoutImagePath}
              onPress={() => {
                setNotice('');
                setSelectedEquipmentId(null);
                setPlacementMode(current => !current);
              }}
              style={[
                styles.addButton,
                placementMode && styles.cancelPlacementButton,
                !area.layoutImagePath && styles.buttonDisabled,
              ]}>
              <Text style={[styles.addButtonText, placementMode && styles.cancelPlacementText]}>
                {placementMode ? 'Cancel Placement' : '+ Add Equipment'}
              </Text>
            </TouchableOpacity>
          </View>

          {placementMode && (
            <View style={styles.placementMessage}>
              <Text style={styles.placementMessageText}>
                Click on the image where you want to place the equipment.
              </Text>
            </View>
          )}
          {!!notice && <View style={styles.notice}><Text style={styles.noticeText}>{notice}</Text></View>}

          <Pressable
            onLayout={event => setLayoutSize(event.nativeEvent.layout)}
            onPress={placementMode ? handleLayoutPress : undefined}
            style={[
              styles.layoutCanvas,
              {aspectRatio: imageAspectRatio},
              placementMode && styles.layoutCanvasPlacement,
            ]}>
            <AuthenticatedImage
              path={area.layoutImagePath}
              resizeMode="contain"
              onLoad={event => {
                const source = event?.nativeEvent?.source;
                if (source?.width > 0 && source?.height > 0) {
                  setImageAspectRatio(source.width / source.height);
                }
              }}
              style={styles.layoutImage}
            />
            {area.equipment.map(equipment => (
              <Pressable
                key={equipment.id}
                accessibilityLabel={`Equipment ${equipment.sequenceNo}: ${equipment.tagNumber}`}
                disabled={placementMode}
                onPress={() => setSelectedEquipmentId(equipment.id)}
                style={[
                  styles.pin,
                  selectedEquipmentId === equipment.id && styles.pinSelected,
                  {
                    left: `${Math.max(0, Math.min(100, equipment.xPercent))}%` as any,
                    top: `${Math.max(0, Math.min(100, equipment.yPercent))}%` as any,
                  },
                ]}>
                <Text style={styles.pinText}>{equipment.sequenceNo}</Text>
              </Pressable>
            ))}
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Equipment</Text>
          <Text style={styles.sectionCount}>{area.equipment.length} total</Text>
        </View>
        {area.equipment.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.stateTitle}>No equipment added</Text>
            <Text style={styles.stateMessage}>Select Add Equipment, then choose a position on the layout.</Text>
          </View>
        ) : (
          <EquipmentTable
            equipment={area.equipment}
            selectedId={selectedEquipmentId}
            deletingId={deletingId}
            onSelect={setSelectedEquipmentId}
            onView={onEquipmentPress}
            onEdit={openEditForm}
            onDelete={deleteEquipment}
          />
        )}
      </ScrollView>

      <EquipmentModal
        visible={formVisible}
        editing={!!editingEquipment}
        form={form}
        error={formError}
        saving={saving}
        isPhone={isPhone}
        onChange={(key, value) => setForm(current => ({...current, [key]: value}))}
        onCancel={closeForm}
        onSave={saveEquipment}
      />
    </>
  );
}

function EquipmentTable({equipment, selectedId, deletingId, onSelect, onView, onEdit, onDelete}: {
  equipment: AreaEquipment[];
  selectedId: string | null;
  deletingId: string | null;
  onSelect: (id: string) => void;
  onView: (id: string) => void;
  onEdit: (equipment: AreaEquipment) => void;
  onDelete: (equipment: AreaEquipment) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <ScrollView
      contentContainerStyle={styles.tableScrollContent}
      horizontal
      showsHorizontalScrollIndicator>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <TableCell text="SEQ" width={55} header />
          <TableCell text="TAG NUMBER" width={125} header />
          <TableCell text="EQUIPMENT ID" width={130} header />
          <TableCell text="RFID TAG UID" width={150} header />
          <TableCell text="TYPE" width={110} header />
          <TableCell text="LOCATION" width={170} header />
          <TableCell text="MANUFACTURER" width={135} header />
          <TableCell text="STATUS" width={135} header />
          <TableCell text="ACTIONS" width={225} header />
        </View>
        {equipment.map((item, index) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onHoverIn={() => setHoveredId(item.id)}
            onHoverOut={() => setHoveredId(current => current === item.id ? null : current)}
            onPress={() => onSelect(item.id)}
            style={[
              styles.tableRow,
              index % 2 === 1 && styles.tableRowAlternate,
              hoveredId === item.id && styles.tableRowHovered,
              selectedId === item.id && styles.tableRowSelected,
            ]}>
            <TableCell text={String(item.sequenceNo)} width={55} strong />
            <TableCell text={item.tagNumber} width={125} strong />
            <TableCell text={item.equipmentId || '--'} width={130} />
            <TableCell text={item.rfidTagUid || '--'} width={150} />
            <TableCell text={item.type} width={110} />
            <TableCell text={item.location || '--'} width={170} />
            <TableCell text={item.manufacturer || '--'} width={135} />
            <View style={[styles.tableCell, styles.statusCell]}>
              <StatusBadge status={item.status} />
            </View>
            <View style={[styles.tableCell, styles.actionsCell]}>
              <TouchableOpacity
                onPress={event => {
                  event.stopPropagation?.();
                  onView(item.id);
                }}
                style={styles.viewButton}>
                <Text style={styles.viewButtonText}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={event => {
                  event.stopPropagation?.();
                  onEdit(item);
                }}
                style={styles.editButton}>
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={deletingId === item.id}
                onPress={event => {
                  event.stopPropagation?.();
                  onDelete(item);
                }}
                style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>{deletingId === item.id ? '...' : 'Delete'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const statusLabel = (status: string) => status
  .replace('Qc', 'QC ')
  .replace(/([a-z])([A-Z])/g, '$1 $2');

function StatusBadge({status}: {status: string}) {
  const normalizedStatus = status.replace(/\s+/g, '').toLowerCase();
  const badgeStyle = normalizedStatus === 'inprogress'
    ? styles.statusInProgress
    : normalizedStatus === 'completed'
      ? styles.statusCompleted
      : normalizedStatus === 'changesrequested'
        ? styles.statusChangesRequested
        : normalizedStatus === 'qcapproved'
          ? styles.statusQcApproved
          : styles.statusNotStarted;
  const textStyle = normalizedStatus === 'inprogress'
    ? styles.statusInProgressText
    : normalizedStatus === 'completed'
      ? styles.statusCompletedText
      : normalizedStatus === 'changesrequested'
        ? styles.statusChangesRequestedText
        : normalizedStatus === 'qcapproved'
          ? styles.statusQcApprovedText
          : styles.statusNotStartedText;

  return (
    <View style={[styles.statusBadge, badgeStyle]}>
      <Text numberOfLines={1} style={[styles.statusBadgeText, textStyle]}>
        {statusLabel(status)}
      </Text>
    </View>
  );
}

function TableCell({text, width, header = false, strong = false}: {
  text: string; width: number; header?: boolean; strong?: boolean;
}) {
  return (
    <View style={[styles.tableCell, {width}]}>
      <Text numberOfLines={2} style={[styles.tableText, header && styles.tableHeaderText, strong && styles.tableStrongText]}>
        {text}
      </Text>
    </View>
  );
}

function EquipmentModal({visible, editing, form, error, saving, isPhone, onChange, onCancel, onSave}: {
  visible: boolean;
  editing: boolean;
  form: EquipmentForm;
  error: string;
  saving: boolean;
  isPhone: boolean;
  onChange: (key: keyof EquipmentForm, value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <View style={[styles.modalCard, isPhone && styles.modalCardPhone]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>AREA EQUIPMENT</Text>
              <Text style={styles.modalTitle}>{editing ? 'Edit Equipment' : 'Add Equipment'}</Text>
            </View>
            <TouchableOpacity accessibilityLabel="Close equipment form" onPress={onCancel} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>x</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.formContent}>
            <View style={styles.formGrid}>
              <FormField label="Tag Number *" value={form.tagNumber} onChangeText={value => onChange('tagNumber', value)} />
              <FormField label="Equipment ID" value={form.equipmentId} onChangeText={value => onChange('equipmentId', value)} />
              <FormField label="RFID Tag UID" value={form.rfidTagUid} onChangeText={value => onChange('rfidTagUid', value)} placeholder="Scan or enter tag UID" />
              <EquipmentTypeSelect value={form.type} onChange={value => onChange('type', value)} disabled={saving} visible={visible} />
              {form.type === 'Other' && <FormField label="Other Equipment Type *" value={form.otherType} onChangeText={value => onChange('otherType', value)} placeholder="Enter equipment type" />}
              <FormField label="Circuit ID" value={form.circuitId} onChangeText={value => onChange('circuitId', value)} />
              <FormField label="Location" value={form.location} onChangeText={value => onChange('location', value)} />
              <FormField label="Manufacturer" value={form.manufacturer} onChangeText={value => onChange('manufacturer', value)} />
              <FormField label="Protection Details" value={form.protectionDetails} onChangeText={value => onChange('protectionDetails', value)} multiline />
              <FormField label="Certificate Number" value={form.certificateNumber} onChangeText={value => onChange('certificateNumber', value)} />
            </View>
            {!!error && <Text style={styles.formError}>{error}</Text>}
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity disabled={saving} onPress={onCancel} style={styles.modalCancelButton}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={saving} onPress={onSave} style={[styles.modalSaveButton, saving && styles.buttonDisabled]}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveText}>{editing ? 'Save Changes' : 'Add Equipment'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function EquipmentTypeSelect({value, onChange, disabled, visible}: {
  value: string; onChange: (value: string) => void; disabled: boolean; visible: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {setExpanded(false);}, [visible]);
  return <View style={styles.formField}>
    <Text style={styles.formLabel}>Type *</Text>
    {Platform.OS === 'web' ? (
      // @ts-ignore Web uses the existing native HTML select pattern.
      <select aria-label="Type" required disabled={disabled} value={value} onChange={(event: any) => onChange(event.target.value)} style={{width: '100%', minHeight: 43, border: '1px solid #d8dbe5', borderRadius: 6, backgroundColor: '#fff', padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', color: value ? '#272b49' : '#a0a4b3'}}>
        {/* @ts-ignore Web option */}
        <option value="" disabled>Select equipment type</option>
        {equipmentTypes.map(type => (
          // @ts-ignore Web option
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
    ) : <>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Select equipment type" accessibilityState={{expanded, disabled}} disabled={disabled} onPress={() => setExpanded(current => !current)} style={[styles.formInput, {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}]}>
        <Text style={{fontSize: 13, color: value ? '#272b49' : '#a0a4b3'}}>{value || 'Select equipment type'}</Text><Text style={{color: '#727688'}}>▾</Text>
      </TouchableOpacity>
      {expanded && <ScrollView nestedScrollEnabled style={{maxHeight: 220, borderWidth: 1, borderColor: '#d8dbe5', borderRadius: 6}} keyboardShouldPersistTaps="handled">
        {equipmentTypes.map(type => <TouchableOpacity key={type} accessibilityRole="button" accessibilityLabel={type} accessibilityState={{selected: type === value}} onPress={() => {onChange(type); setExpanded(false);}} style={{paddingHorizontal: 12, paddingVertical: 12, backgroundColor: type === value ? '#eef0ff' : '#fff'}}><Text style={{fontSize: 13, color: '#272b49'}}>{type}</Text></TouchableOpacity>)}
      </ScrollView>}
    </>}
  </View>;
}

function FormField({label, value, onChangeText, multiline = false, placeholder = 'Enter value'}: {
  label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean; placeholder?: string;
}) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor="#a0a4b3"
        style={[styles.formInput, multiline && styles.formInputMultiline]}
      />
    </View>
  );
}

function PageState({loading, message}: {loading?: boolean; message: string}) {
  return (
    <View style={styles.fullState}>
      {loading && <ActivityIndicator color="#3f47d6" size="large" />}
      <Text style={styles.stateMessage}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#f7f9ff'},
  content: {padding: 24, paddingBottom: 48, maxWidth: 1180, width: '100%', alignSelf: 'center'},
  backButton: {alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 8},
  backText: {fontSize: 13, color: '#8fa7f8', fontWeight: '800'},
  header: {minHeight: 125, backgroundColor: '#242d52', borderRadius: 16, padding: 23, justifyContent: 'center'},
  eyebrow: {fontSize: 10, color: '#b8a5f8', fontWeight: '800', letterSpacing: 1.1},
  title: {fontSize: 24, color: '#fff', fontWeight: '800', marginTop: 7},
  subtitle: {fontSize: 12, color: '#d0d4e9', marginTop: 7},
  layoutCard: {marginTop: 16, padding: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e3e6ee', borderRadius: 8},
  cardHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14},
  cardHeaderPhone: {alignItems: 'stretch', flexDirection: 'column'},
  cardHeaderCopy: {flex: 1},
  cardTitle: {fontSize: 16, fontWeight: '800', color: '#25294f'},
  cardHint: {fontSize: 11, color: '#898d9e', marginTop: 4},
  addButton: {minHeight: 40, borderRadius: 7, backgroundColor: '#3f47d6', paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center'},
  addButtonText: {color: '#fff', fontSize: 12, fontWeight: '800'},
  cancelPlacementButton: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#d6d9e5'},
  cancelPlacementText: {color: '#3f435c'},
  buttonDisabled: {opacity: 0.55},
  placementMessage: {borderWidth: 1, borderColor: '#b8bdf5', borderRadius: 6, backgroundColor: '#eef0ff', paddingHorizontal: 13, paddingVertical: 10, marginBottom: 12},
  placementMessageText: {fontSize: 12, color: '#3038a8', fontWeight: '700'},
  notice: {borderWidth: 1, borderColor: '#b9dfc8', borderRadius: 6, backgroundColor: '#edf8f1', paddingHorizontal: 13, paddingVertical: 9, marginBottom: 12},
  noticeText: {fontSize: 12, color: '#237248', fontWeight: '700'},
  layoutCanvas: {position: 'relative', width: '100%', overflow: 'hidden', borderRadius: 6, backgroundColor: '#eef0f6'},
  layoutCanvasPlacement: {borderWidth: 2, borderColor: '#5961e2'},
  layoutImage: {width: '100%', height: '100%'},
  pin: {position: 'absolute', width: 30, height: 30, marginLeft: -15, marginTop: -15, borderRadius: 15, backgroundColor: '#e63f4f', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center'},
  pinSelected: {backgroundColor: '#3038bd', borderWidth: 3, width: 36, height: 36, marginLeft: -18, marginTop: -18, borderRadius: 18},
  pinText: {fontSize: 11, color: '#fff', fontWeight: '800'},
  sectionHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 27, marginBottom: 12},
  sectionTitle: {fontSize: 18, color: '#242d52', fontWeight: '800'},
  sectionCount: {fontSize: 12, color: '#73788c', fontWeight: '700'},
  tableScrollContent: {minWidth: '100%', paddingBottom: 4},
  table: {minWidth: 1085, flexGrow: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dfe3ee', borderRadius: 8, overflow: 'hidden'},
  tableHeader: {flexDirection: 'row', minHeight: 46, backgroundColor: '#eef1f8'},
  tableRow: {flexDirection: 'row', minHeight: 64, borderTopWidth: 1, borderTopColor: '#e9ecf3'},
  tableRowAlternate: {backgroundColor: '#fafbfe'},
  tableRowHovered: {backgroundColor: '#f1f3ff'},
  tableRowSelected: {backgroundColor: '#e8ecff', borderLeftWidth: 3, borderLeftColor: '#5961e2'},
  tableCell: {paddingHorizontal: 12, justifyContent: 'center'},
  tableText: {fontSize: 12, lineHeight: 17, color: '#55596e'},
  tableHeaderText: {fontSize: 9, color: '#666d84', fontWeight: '900'},
  tableStrongText: {color: '#292d4e', fontWeight: '800'},
  actionsCell: {width: 225, flexDirection: 'row', alignItems: 'center', gap: 7},
  statusCell: {width: 135},
  statusBadge: {alignSelf: 'flex-start', maxWidth: 125, borderRadius: 5, paddingHorizontal: 9, paddingVertical: 6},
  statusBadgeText: {fontSize: 9, fontWeight: '900'},
  statusNotStarted: {backgroundColor: '#edf0f5'},
  statusNotStartedText: {color: '#5e6677'},
  statusInProgress: {backgroundColor: '#fff1cf'},
  statusInProgressText: {color: '#8a6413'},
  statusCompleted: {backgroundColor: '#e4f6eb'},
  statusCompletedText: {color: '#237348'},
  statusChangesRequested: {backgroundColor: '#fde8eb'},
  statusChangesRequestedText: {color: '#b43242'},
  statusQcApproved: {backgroundColor: '#ece9ff'},
  statusQcApprovedText: {color: '#5345b8'},
  viewButton: {paddingHorizontal: 12, paddingVertical: 8, borderRadius: 5, backgroundColor: '#4c54d9'},
  viewButtonText: {fontSize: 10, color: '#fff', fontWeight: '900'},
  editButton: {paddingHorizontal: 11, paddingVertical: 8, borderRadius: 5, backgroundColor: '#e9ebff'},
  editButtonText: {fontSize: 10, color: '#3f47d6', fontWeight: '800'},
  deleteButton: {paddingHorizontal: 11, paddingVertical: 8, borderRadius: 5, backgroundColor: '#fdebed'},
  deleteButtonText: {fontSize: 10, color: '#bf3441', fontWeight: '800'},
  emptyState: {minHeight: 160, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e3e6ee', borderRadius: 8, alignItems: 'center', justifyContent: 'center', padding: 24},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(20, 23, 46, 0.54)', alignItems: 'center', justifyContent: 'center', padding: 18},
  modalCard: {width: '100%', maxWidth: 720, maxHeight: '92%', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden'},
  modalCardPhone: {maxHeight: '96%'},
  modalHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#e8eaf1'},
  modalEyebrow: {fontSize: 9, color: '#777de0', fontWeight: '800'},
  modalTitle: {fontSize: 19, color: '#24284e', fontWeight: '800', marginTop: 4},
  closeButton: {width: 34, height: 34, alignItems: 'center', justifyContent: 'center'},
  closeButtonText: {fontSize: 20, color: '#727688', fontWeight: '700'},
  formContent: {padding: 22},
  formGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 14},
  formField: {flexGrow: 1, flexBasis: 280},
  formLabel: {fontSize: 11, color: '#555a70', fontWeight: '800', marginBottom: 6},
  formInput: {minHeight: 43, borderWidth: 1, borderColor: '#d8dbe5', borderRadius: 6, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#272b49'},
  formInputMultiline: {minHeight: 82, textAlignVertical: 'top'},
  formError: {fontSize: 12, color: '#bd3340', fontWeight: '700', marginTop: 16},
  modalActions: {flexDirection: 'row', justifyContent: 'flex-end', gap: 9, paddingHorizontal: 22, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#e8eaf1'},
  modalCancelButton: {minHeight: 41, minWidth: 90, borderWidth: 1, borderColor: '#d6d9e4', borderRadius: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14},
  modalCancelText: {fontSize: 12, color: '#4d5268', fontWeight: '800'},
  modalSaveButton: {minHeight: 41, minWidth: 130, borderRadius: 6, backgroundColor: '#3f47d6', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16},
  modalSaveText: {fontSize: 12, color: '#fff', fontWeight: '800'},
  fullState: {flex: 1, minHeight: 400, backgroundColor: '#f4f6fb', alignItems: 'center', justifyContent: 'center', padding: 28},
  stateTitle: {fontSize: 17, color: '#292d50', fontWeight: '800'},
  stateMessage: {fontSize: 13, color: '#7d8192', lineHeight: 19, textAlign: 'center', marginTop: 10},
  stateActions: {flexDirection: 'row', gap: 10, marginTop: 18},
  primaryButton: {backgroundColor: '#b8a5f8', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10},
  primaryButtonText: {fontSize: 12, color: '#242d52', fontWeight: '800'},
  secondaryButton: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#d9dce8', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 7},
  secondaryButtonText: {fontSize: 12, color: '#424760', fontWeight: '800'},
});
