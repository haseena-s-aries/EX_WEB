import {deleteEquipmentEvidencePhoto} from '../api/projects';
import {isPdfFile} from '../utils/isPdfFile';
import ProjectImageGallery from '../components/ProjectImageGallery';
import ZoomableImageViewer from '../components/ZoomableImageViewer';
import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  BackHandler,
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
  getSurveyorEquipmentPhotos,
  deleteSurveyorEquipment,
  getProjectAreaPhotos,
  getCommonLayouts,
  getSurveyorArea,
  getSurveyorEquipment,
  SaveAreaEquipmentRequest,
  SurveyorAreaDetails,
  resolveSurveyorAreaEquipment,
  recordSurveyorEquipmentScanEvent,
  InspectionPhotoFile,
  uploadSurveyorEquipmentPhotos,
  updateSurveyorEquipment,
} from '../api/projects';
import AuthenticatedImage from '../components/AuthenticatedImage';
import {equipmentOptionKey, equipmentOptions, equipmentTypes, zoneOptions} from '../equipment/equipmentOptions';
import SearchableOptionPicker from '../components/SearchableOptionPicker';
import InspectionPhotoPicker from '../components/InspectionPhotoPicker';
import {useThemeMode} from '../theme/useThemeMode';
import {LIGHT} from '../theme/palette';
import {OPERATIONS_DARK} from '../theme/operationsPalette';

type Props = {
  projectId: string;
  areaId: string;
  onBack: () => void;
  onEquipmentPress: (equipmentId: string) => void;
  onStartInspection?: (equipmentId: string) => void;
  onEquipmentAdded?: () => void;
  onScanNfc?: () => Promise<{identifier: string}>;
  onScanQr?: () => Promise<{identifier: string}>;
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
  description: string;
  model: string;
  serialNumber: string;
  exProtectionType: string;
  gasGroup: string;
  temperatureClass: string;
  hazardousAreaZone: string;
  ambientTemperatureRange: string;
  ipRating: string;
  notifiedBody: string;
  specialConditionsOfUse: string;
  rfidIdentificationMethod: string;
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
  description: '', model: '', serialNumber: '', exProtectionType: '', gasGroup: '',
  temperatureClass: '', hazardousAreaZone: '', ambientTemperatureRange: '', ipRating: '',
  notifiedBody: '', specialConditionsOfUse: '', rfidIdentificationMethod: 'HF_RFID',
});


export default function SurveyorAreaDetailsScreen({
  projectId,
  areaId,
  onBack,
  onEquipmentPress,
  onStartInspection,
  onEquipmentAdded,
  onScanNfc,
  onScanQr,
}: Props) {
  const {width} = useWindowDimensions();
  const isPhone = width < 700;
  const dark = useThemeMode() === 'dark';
  const panelTheme = dark && {backgroundColor: OPERATIONS_DARK.card, borderColor: OPERATIONS_DARK.border};
  const headingTheme = dark && {color: OPERATIONS_DARK.text};
  const [area, setArea] = useState<SurveyorAreaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [placementMode, setPlacementMode] = useState(false);
  const [viewingLayout, setViewingLayout] = useState(false);
  const [viewingImageKey, setViewingImageKey] = useState<string | null>(null);
  const [markingImages, setMarkingImages] = useState<Array<{key:string;path:string;name:string;kind:'GA Layout'|'Machinery Layout'|'Area Image';uploadedAt?:string}>>([]);
  const [selectedLayoutImageKey, setSelectedLayoutImageKey] = useState<string | null>(null);
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
  const [identifier, setIdentifier] = useState('');
  const [identifierTechnology, setIdentifierTechnology] = useState<'HF_RFID' | 'NFC' | 'QR' | 'MANUAL'>('HF_RFID');
  const [identifying, setIdentifying] = useState(false);
  const [identification, setIdentification] = useState<any>(null);
  const [photosLoading,setPhotosLoading]=useState(false);
  const [photosError,setPhotosError]=useState('');
  const [equipmentPhotos, setEquipmentPhotos] = useState<any[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<InspectionPhotoFile[]>([]);
  const [photoRole, setPhotoRole] = useState<'Overview' | 'Nameplate' | 'ExMarking' | 'Installation' | 'Additional'>('Overview');
  const selectedMarkingImage = markingImages.find(image => image.key === selectedLayoutImageKey);
  const viewingMarkingImage = markingImages.find(image => image.key === viewingImageKey) || selectedMarkingImage;
  const defaultLayoutImageKey = markingImages.find(image => image.path === area?.layoutImagePath)?.key || `legacy:${areaId}`;
  const pinsForImage = (imageKey:string|null) => (area?.equipment || []).filter(equipment => equipment.isPlacedOnLayout !== false &&
    imageKey !== null && (equipment.layoutImageKey || defaultLayoutImageKey) === imageKey);
  const pinsForSelectedImage = pinsForImage(selectedLayoutImageKey);

  const refreshEquipment = useCallback(async () => {
    const response = await getSurveyorEquipment(projectId, areaId);
    setArea(current => (current ? {...current, equipment: response.data} : current));
    return response.data;
  }, [areaId, projectId]);

  const loadArea = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [areaResponse, equipmentResponse, photosResponse, commonResponse] = await Promise.all([
        getSurveyorArea(projectId, areaId),
        getSurveyorEquipment(projectId, areaId),
        getProjectAreaPhotos(projectId, areaId).catch(() => null),
        getCommonLayouts(projectId).catch(() => null),
      ]);
      const areaPhotos = (photosResponse?.data || []).filter(photo => !isPdfFile(photo.fileName));
      const commonLayouts = (commonResponse?.data || []).filter(photo => !isPdfFile(photo.fileName));
      const images = [
        ...commonLayouts.map(photo => ({key:`common:${photo.id}`,path:photo.downloadUrl || photo.filePath || '',name:photo.fileName || 'GA layout',kind:'GA Layout' as const,uploadedAt:photo.uploadedAt})),
        ...areaPhotos.map(photo => ({key:`area:${photo.id}`,path:photo.downloadUrl || photo.filePath || '',name:photo.fileName || 'Area image',kind:/machinery|machine|equipment/i.test(photo.fileName || '')?'Machinery Layout' as const:'Area Image' as const,uploadedAt:photo.uploadedAt})),
      ].filter(image => !!image.path);
      const currentLayoutFilePath = areaResponse.data.layoutImagePath;
      const currentPhoto = areaPhotos.find(photo => photo.filePath === currentLayoutFilePath || photo.downloadUrl === currentLayoutFilePath);
      const currentLayoutPath = currentPhoto?.downloadUrl || currentPhoto?.filePath || currentLayoutFilePath || areaPhotos[areaPhotos.length - 1]?.downloadUrl || areaPhotos[areaPhotos.length - 1]?.filePath;
      if (currentLayoutPath && !images.some(image => image.path === currentLayoutPath))
        images.push({key:`legacy:${areaId}`,path:currentLayoutPath,name:'Current area layout',kind:'Area Image',uploadedAt:undefined});
      setMarkingImages(images);
      setSelectedLayoutImageKey(current => current && images.some(image => image.key === current) ? current : images.length === 1 ? images[0].key : null);
      setArea({
        ...areaResponse.data,
        equipment: equipmentResponse.data,
        layoutImagePath: currentLayoutPath,
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

  useEffect(() => {
    if (!selectedEquipmentId) { setEquipmentPhotos([]); return; }
    let active = true;setPhotosLoading(true);setPhotosError('');
    getSurveyorEquipmentPhotos(projectId, areaId, selectedEquipmentId)
      .then(response => {if (active) setEquipmentPhotos(response.data || []);})
      .catch(() => {if (active) {setEquipmentPhotos([]);setPhotosError('Could not load saved photographs. Close and reopen the equipment form to retry.');}}).finally(()=>{if(active)setPhotosLoading(false);});
    return () => {active = false;};
  }, [areaId, projectId, selectedEquipmentId, formVisible]);

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
    setPendingPhotos([]); setPhotoRole('Overview');
    setPlacementMode(false);
    setFormVisible(true);
  };

  const openEditForm = (equipment: AreaEquipment) => {
    setSelectedEquipmentId(equipment.id);
    setSelectedLayoutImageKey(equipment.layoutImageKey || defaultLayoutImageKey);
    setEditingEquipment(equipment);
    setPendingPosition(equipment.isPlacedOnLayout === false ? null : {xPercent: equipment.xPercent, yPercent: equipment.yPercent});
    setForm({
      tagNumber: equipment.tagNumber,
      equipmentId: equipment.equipmentId || '',
      rfidTagUid: equipment.rfidTagUid || '',
      type: equipment.type || '',
      otherType: equipment.type === 'Other' ? equipment.type : '',
      circuitId: equipment.circuitId || '',
      location: equipment.location || '',
      manufacturer: equipment.manufacturer || '',
      protectionDetails: equipment.protectionDetails || '',
      certificateNumber: equipment.certificateNumber || '',
      description: equipment.description || '', model: equipment.model || '', serialNumber: equipment.serialNumber || '',
      exProtectionType: equipment.exProtectionType || '', gasGroup: equipment.gasGroup || '',
      temperatureClass: equipment.temperatureClass || '', hazardousAreaZone: equipment.hazardousAreaZone || '',
      ambientTemperatureRange: equipment.ambientTemperatureRange || '', ipRating: equipment.ipRating || '',
      notifiedBody: equipment.notifiedBody || '', specialConditionsOfUse: equipment.specialConditionsOfUse || '',
      rfidIdentificationMethod: equipment.rfidIdentificationMethod || 'HF_RFID',
    });
    setFormError(''); setPendingPhotos([]); setPhotoRole('Overview');
    setFormVisible(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormVisible(false);
    setEditingEquipment(null);
    setPendingPosition(null);
    setFormError('');
  };

  const saveEquipment = async (startInspection = false) => {
    if (!form.tagNumber.trim() || !form.type.trim()) {
      setFormError('Item Tag and Type are required.');
      return;
    }
    if (form.type === 'Other' && !form.otherType.trim()) {
      setFormError('Other Equipment Type is required.');
      return;
    }
    if (
      (pendingPosition && (!Number.isFinite(pendingPosition.xPercent) ||
      !Number.isFinite(pendingPosition.yPercent) ||
      pendingPosition.xPercent < 0 ||
      pendingPosition.xPercent > 100 ||
      pendingPosition.yPercent < 0 ||
      pendingPosition.yPercent > 100))
    ) {
      setFormError('The selected image position is invalid. Cancel and select the position again.');
      return;
    }
    const enteredType = form.type === 'Other' ? form.otherType.trim() : form.type;
    const type = enteredType === editingEquipment?.type ? enteredType :
      equipmentOptions(equipmentTypes, area?.equipment.map(item => item.type) ?? [], '')
        .find(option => equipmentOptionKey(option.value) === equipmentOptionKey(enteredType))?.value ??
        enteredType.trim().replace(/\s+/g, ' ');
    const payload: SaveAreaEquipmentRequest = {
      xPercent: pendingPosition?.xPercent ?? editingEquipment?.xPercent ?? 0,
      yPercent: pendingPosition?.yPercent ?? editingEquipment?.yPercent ?? 0,
      isPlacedOnLayout: !!pendingPosition,
      layoutImageKey: pendingPosition ? (selectedLayoutImageKey || editingEquipment?.layoutImageKey || null) : editingEquipment?.layoutImageKey || null,
      tagNumber: form.tagNumber.trim(),
      equipmentId: form.equipmentId.trim() || null,
      rfidTagUid: form.rfidTagUid.trim() || null,
      type,
      circuitId: form.circuitId.trim() || null,
      location: form.location.trim() || null,
      manufacturer: form.manufacturer.trim() || null,
      protectionDetails: form.protectionDetails.trim() || null,
      certificateNumber: form.certificateNumber.trim() || null,
      description: form.description.trim() || null,
      model: form.model.trim() || null,
      serialNumber: form.serialNumber.trim() || null,
      exProtectionType: form.exProtectionType.trim() || null,
      gasGroup: form.gasGroup.trim() || null,
      temperatureClass: form.temperatureClass.trim() || null,
      hazardousAreaZone: form.hazardousAreaZone.trim() || null,
      ambientTemperatureRange: form.ambientTemperatureRange.trim() || null,
      ipRating: form.ipRating.trim() || null,
      notifiedBody: form.notifiedBody.trim() || null,
      specialConditionsOfUse: form.specialConditionsOfUse.trim() || null,
      rfidIdentificationMethod: form.rfidTagUid.trim() ? (form.rfidIdentificationMethod.trim() || 'HF_RFID') : null,
    };
    setSaving(true);
    setFormError('');
    try {
      const response = editingEquipment
        ? await updateSurveyorEquipment(projectId, areaId, editingEquipment.id, payload)
        : await createSurveyorEquipment(projectId, areaId, payload);
      if (pendingPhotos.length) {
        try {
          await uploadSurveyorEquipmentPhotos(projectId, areaId, response.data.id, pendingPhotos, photoRole);
          setPendingPhotos([]);
        } catch (photoError) {
          setEditingEquipment(response.data);
          setSelectedEquipmentId(response.data.id);
          setFormError(`Equipment was saved, but its photographs were not uploaded. Retry the upload: ${getApiErrorMessage(photoError, 'upload failed')}`);
          await refreshEquipment();
          return;
        }
      }
      await refreshEquipment();
      if (!editingEquipment) {
        onEquipmentAdded?.();
      }
      setSelectedEquipmentId(response.data.id);
      setNotice(
        editingEquipment
          ? `Equipment marking ${response.data.markingNo ?? response.data.sequenceNo} updated.`
          : `Equipment marking ${response.data.markingNo ?? response.data.sequenceNo} added.`,
      );
      setFormVisible(false);
      setEditingEquipment(null);
      setPendingPosition(null);
      if (!editingEquipment && startInspection) onStartInspection?.(response.data.id);
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError, 'Could not save equipment.'));
    } finally {
      setSaving(false);
    }
  };

  const identifyInArea = async (value = identifier, technology = identifierTechnology) => {
    if (!value.trim()) { setIdentification({state: 'invalid', message: 'Scan or enter an equipment identifier.'}); return; }
    setIdentifying(true); setIdentification(null);
    try {
      const response = await resolveSurveyorAreaEquipment(projectId, areaId, value.trim(), technology);
      setIdentification(response.data);
      try { await recordSurveyorEquipmentScanEvent(projectId, areaId, {clientEventId: newClientEventId(), identifier: value.trim(), technology, matchResult: response.data?.state || 'unknown', equipmentId: response.data?.equipment?.id || null, scannedAt: new Date().toISOString()}); }
      catch { setIdentification({...response.data, message: `${response.data?.message || 'Lookup complete.'} Scan event could not be synchronized; retry the lookup while connected.`}); }
    } catch (requestError: any) {
      const data = requestError?.response?.data;
      setIdentification({state: data?.state || 'error', message: data?.message || data?.error || getApiErrorMessage(requestError, 'Could not look up this identifier.')});
      if (requestError?.response?.status === 404 || requestError?.response?.status === 409) {
        try { await recordSurveyorEquipmentScanEvent(projectId, areaId, {clientEventId: newClientEventId(), identifier: value.trim(), technology, matchResult: data?.state === 'duplicate' ? 'duplicate' : 'unknown', scannedAt: new Date().toISOString()}); }
        catch { setIdentification((current: any) => ({...current, message: `${current?.message || 'Lookup complete.'} Scan event could not be synchronized; retry the lookup while connected.`})); }
      }
    } finally { setIdentifying(false); }
  };

  const scanNfcInArea = async () => {
    try {
      if (!onScanNfc) throw new Error('NFC scan is not available on this device. Enter the UID or use a connected reader.');
      const result = await onScanNfc();
      setIdentifier(result.identifier); setIdentifierTechnology('NFC');
      await identifyInArea(result.identifier, 'NFC');
    } catch (scanError: any) { setIdentification({state: 'error', message: scanError?.message || 'NFC scanning is not available on this device.'}); }
  };

  const scanQrInArea = async () => {
    try {
      if (!onScanQr) throw new Error('QR camera scanning is not available on this device. Use the QR option and enter the encoded identifier.');
      const result = await onScanQr();
      setIdentifier(result.identifier); setIdentifierTechnology('QR');
      await identifyInArea(result.identifier, 'QR');
    } catch (scanError: any) { setIdentification({state: 'error', message: scanError?.message || 'QR scanning failed.'}); }
  };

  const openRegistrationFromUnknown = () => {
    setEditingEquipment(null); setPendingPosition(null); setForm(emptyForm());
    if (identifierTechnology === 'HF_RFID' || identifierTechnology === 'NFC')
      setForm(current => ({...current, rfidTagUid: identifier.trim(), rfidIdentificationMethod: identifierTechnology}));
    setFormError(''); setFormVisible(true);
  };

  const deleteEquipment = (equipment: AreaEquipment) => {
    const performDelete = async () => {
      setDeletingId(equipment.id);
      setNotice('');
      try {
        await deleteSurveyorEquipment(projectId, areaId, equipment.id);
        await refreshEquipment();
        setSelectedEquipmentId(current => current === equipment.id ? null : current);
        setNotice(`Equipment marking ${equipment.markingNo ?? equipment.sequenceNo} deleted.`);
      } catch (requestError) {
        Alert.alert('Delete failed', getApiErrorMessage(requestError, 'Could not delete equipment.'));
      } finally {
        setDeletingId(null);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = (globalThis as any).confirm(
        `Delete equipment marking ${equipment.markingNo ?? equipment.sequenceNo} (${equipment.tagNumber})?`,
      );
      if (confirmed) {
        performDelete();
      }
      return;
    }

    Alert.alert(
      'Delete equipment',
      `Delete equipment marking ${equipment.markingNo ?? equipment.sequenceNo} (${equipment.tagNumber})?`,
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
          <TouchableOpacity style={styles.primaryButton} onPress={()=>void loadArea()}>
            <Text style={styles.primaryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (formVisible) return (
    <EquipmentFormPage
      areaName={area.areaName}
      dark={dark}
      editing={!!editingEquipment}
      form={form}
      error={formError}
      saving={saving}
      equipment={area.equipment}
      onChange={(key, value) => setForm(current => ({...current, [key]: value}))}
      photoRole={photoRole}
      onRemoveSaved={async photo=>{if(!editingEquipment)return;setSaving(true);setFormError('');try{await deleteEquipmentEvidencePhoto(projectId,areaId,editingEquipment.id,photo.id);setEquipmentPhotos(current=>current.filter(p=>p.id!==photo.id));}catch(e){setFormError(getApiErrorMessage(e,'Could not remove photograph.'));}finally{setSaving(false);}}}
      onReplaceSaved={async(photo,files)=>{if(!editingEquipment||!files.length)return;setSaving(true);setFormError('');try{await uploadSurveyorEquipmentPhotos(projectId,areaId,editingEquipment.id,files,photo.equipmentPhotoRole||'Additional');await deleteEquipmentEvidencePhoto(projectId,areaId,editingEquipment.id,photo.id);const result=await getSurveyorEquipmentPhotos(projectId,areaId,editingEquipment.id);setEquipmentPhotos(result.data);}catch(e){setFormError(getApiErrorMessage(e,'Could not replace photograph. Existing evidence is retained if uploading fails.'));}finally{setSaving(false);}}}
      photosLoading={photosLoading} photosError={photosError}
      savedPhotos={equipmentPhotos}
      sequenceLabel={editingEquipment ? String(editingEquipment.markingNo ?? editingEquipment.sequenceNo) : "Assigned automatically when saved (per area)"}
      onRemovePending={index=>setPendingPhotos(current=>current.filter((_,i)=>i!==index))}
      pendingPhotos={pendingPhotos}
      onPhotoRoleChange={setPhotoRole}
      onPhotosSelected={files => setPendingPhotos(current => [...current, ...files])}
      onCancel={closeForm}
      onSave={saveEquipment}
      onSaveAndStart={() => saveEquipment(true)}
      canStartInspection={!editingEquipment && !!onStartInspection}
    />
  );

  return (
    <>
      <ScrollView nativeID="ex-surveyor-area" style={[styles.screen, dark && {backgroundColor: OPERATIONS_DARK.bg}]} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>&lt; Back to project</Text>
        </TouchableOpacity>
        <View nativeID="ex-surveyor-area-hero" style={styles.header}>
          <Image source={require('../assets/landing/industry-3.jpg')} resizeMode="cover" style={styles.heroPhoto} accessible={false} />
          <View nativeID="ex-operations-hero-overlay" pointerEvents="none" style={StyleSheet.absoluteFill} />
          <Text style={styles.eyebrow}>AREA DETAILS</Text>
          <Text accessibilityRole="header" style={styles.title}>{area.areaName}</Text>
          <Text style={styles.subtitle}>{area.equipment.length} equipment items</Text>
        </View>

        <ProjectImageGallery key={`${projectId}/${areaId}`} projectId={projectId} areaId={areaId} editable splitUpload onChanged={()=>void loadArea(true)}/>
        <View nativeID="ex-area-common-layouts"><ProjectImageGallery key={projectId} projectId={projectId}/></View>
        <View nativeID="ex-surveyor-area-lookup" style={[styles.identifyCard, panelTheme]}>
          <Text accessibilityRole="header" style={[styles.cardTitle, headingTheme]}>Scan / identify equipment in this job</Text>
          <Text style={[styles.cardHint, dark && {color: OPERATIONS_DARK.secondary}]}>A scan only searches this assigned job area. Unknown tags are never registered until you choose Register.</Text>
          <View style={styles.identifyMethods}>
            {(['HF_RFID', 'NFC', 'QR', 'MANUAL'] as const).map(method => <TouchableOpacity key={method} accessibilityRole="button" accessibilityState={{selected: identifierTechnology === method}} onPress={() => setIdentifierTechnology(method)} style={[styles.methodButton, identifierTechnology === method && styles.methodButtonActive, dark && {backgroundColor: identifierTechnology === method ? '#52eaf7' : '#12394b'}]}><Text style={[styles.methodText, identifierTechnology === method && styles.methodTextActive, dark && {color: identifierTechnology === method ? '#04202c' : '#c0e1ee'}]}>{method === 'MANUAL' ? 'Manual' : method}</Text></TouchableOpacity>)}
            {Platform.OS !== 'web' && !!onScanNfc && <TouchableOpacity onPress={scanNfcInArea} disabled={identifying} style={styles.scanButton}><Text style={styles.scanButtonText}>Scan NFC</Text></TouchableOpacity>}
            {Platform.OS === 'android' && !!onScanQr && <TouchableOpacity onPress={scanQrInArea} disabled={identifying} style={styles.scanButton}><Text style={styles.scanButtonText}>Scan QR</Text></TouchableOpacity>}
          </View>
          <TextInput accessibilityLabel={identifierTechnology === 'MANUAL' ? 'Equipment tag or ID' : 'Scan or enter identifier'} value={identifier} onChangeText={setIdentifier} onSubmitEditing={() => void identifyInArea()} placeholder={identifierTechnology === 'MANUAL' ? 'Equipment tag or ID' : 'Scan or enter identifier'} placeholderTextColor={dark ? OPERATIONS_DARK.secondary : undefined} autoCapitalize="characters" style={[styles.identifyInput, dark && {color: OPERATIONS_DARK.text, borderColor: OPERATIONS_DARK.border, backgroundColor: '#082a3a'}]} />
          <TouchableOpacity testID="area-lookup-button" accessibilityRole="button" disabled={identifying} onPress={() => void identifyInArea()} style={styles.lookupButton}><Text style={styles.lookupButtonText}>{identifying ? 'Looking up…' : 'Look up in this job'}</Text></TouchableOpacity>
          {!!identification && <View style={[styles.identifyResult, identification.state === 'matched' ? styles.identifyMatched : identification.state === 'unknown' ? styles.identifyUnknown : styles.identifyWarning]}>
            <Text style={styles.identifyResultTitle}>{identification.state === 'matched' ? `Matched: ${identification.equipment?.tagNumber}` : identification.state === 'unknown' ? 'No match in this job area' : identification.state === 'duplicate' ? 'Multiple matches found' : 'Lookup result'}</Text>
            <Text style={styles.cardHint}>{identification.message || [identification.equipment?.type, identification.equipment?.manufacturer, identification.equipment?.model].filter(Boolean).join(' · ')}</Text>
            {identification.state === 'matched' && <TouchableOpacity onPress={() => onEquipmentPress(identification.equipment.id)} style={styles.lookupButton}><Text style={styles.lookupButtonText}>Open equipment and history</Text></TouchableOpacity>}
            {identification.state === 'unknown' && <TouchableOpacity onPress={openRegistrationFromUnknown} style={styles.lookupButton}><Text style={styles.lookupButtonText}>Register as new equipment</Text></TouchableOpacity>}
          </View>}
        </View>

        <View nativeID="ex-surveyor-area-layout" style={[styles.layoutCard, panelTheme]}>
          <View style={[styles.cardHeader, isPhone && styles.cardHeaderPhone]}>
            <View style={styles.cardHeaderCopy}>
              <Text accessibilityRole="header" style={[styles.cardTitle, headingTheme]}>Select Image for Marking</Text>
              <Text style={{color:dark?OPERATIONS_DARK.secondary:'#607080',fontSize:12,fontWeight:'800'}}>SELECT AREA</Text>
              <Text style={{color:dark?OPERATIONS_DARK.text:'#162b43',fontWeight:'700'}}>{area.areaName}</Text>
              {!!selectedMarkingImage && <TouchableOpacity onPress={() => {setViewingImageKey(selectedMarkingImage.key);setViewingLayout(true);}}><Text style={styles.backText}>View Layout</Text></TouchableOpacity>}
              {viewingLayout && viewingMarkingImage && <ZoomableImageViewer visible title={viewingMarkingImage.name} images={[viewingMarkingImage.path]} pins={pinsForImage(viewingMarkingImage.key).map(item => ({id: item.id, label: String(item.markingNo ?? item.sequenceNo), xPercent: Number(item.xPercent) || 0, yPercent: Number(item.yPercent) || 0, title: item.tagNumber, lines: [item.type]}))} onClose={() => {setViewingLayout(false);setViewingImageKey(null);}} />}
            </View>
            <TouchableOpacity
              testID="area-placement-button"
              accessibilityRole="button"
              disabled={!selectedMarkingImage}
              onPress={() => {
                setNotice('');
                setSelectedEquipmentId(null);
                setPlacementMode(current => !current);
              }}
              style={[
                styles.addButton,
                placementMode && styles.cancelPlacementButton,
                !selectedMarkingImage && styles.buttonDisabled,
              ]}>
              <Text style={[styles.addButtonText, placementMode && styles.cancelPlacementText]}>
                {placementMode ? 'Cancel Placement' : '+ Add Equipment'}
              </Text>
            </TouchableOpacity>
          </View>

          {(['GA Layout','Machinery Layout','Area Image'] as const).map(group => {
            const groupImages = markingImages.filter(image => image.kind === group);
            if (!groupImages.length) return null;
            return <View key={group} style={{gap:8}}>
              <Text style={[styles.cardTitle, headingTheme]}>{group}</Text>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>
                {groupImages.map(image => <View key={image.key} style={{width:isPhone?'47%':190,padding:8,gap:6,borderWidth:1,borderColor:selectedLayoutImageKey===image.key?'#16b8d4':(dark?OPERATIONS_DARK.border:'#dbe2ea'),borderRadius:10,backgroundColor:dark?OPERATIONS_DARK.elevated:'#f7f9fb'}}>
                  <AuthenticatedImage path={image.path} resizeMode="contain" style={{width:'100%',height:isPhone?100:116,backgroundColor:dark?OPERATIONS_DARK.card:'#eef2f5',borderRadius:6}} />
                  <Text numberOfLines={2} style={{color:dark?OPERATIONS_DARK.text:'#162b43',fontWeight:'700'}}>{image.name}</Text>
                  <Text style={{color:dark?OPERATIONS_DARK.secondary:'#607080',fontSize:12}}>{group} · {area.areaName}{image.uploadedAt?` · ${new Date(image.uploadedAt).toLocaleDateString()}`:''}</Text>
                  <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                    <TouchableOpacity accessibilityRole="button" onPress={()=>{setViewingImageKey(image.key);setViewingLayout(true);}} style={{padding:8,minHeight:40,justifyContent:'center',backgroundColor:dark?OPERATIONS_DARK.card:'#e9f1f5',borderRadius:7}}><Text style={{color:dark?OPERATIONS_DARK.text:'#12304a',fontWeight:'700'}}>View Image</Text></TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" accessibilityState={{selected:selectedLayoutImageKey===image.key}} onPress={()=>{setSelectedLayoutImageKey(image.key);setPlacementMode(false);}} style={{padding:8,minHeight:40,justifyContent:'center',backgroundColor:selectedLayoutImageKey===image.key?'#16b8d4':(dark?OPERATIONS_DARK.card:'#e9f1f5'),borderRadius:7}}><Text style={{color:selectedLayoutImageKey===image.key?'#062232':(dark?OPERATIONS_DARK.text:'#12304a'),fontWeight:'700'}}>Select for Marking</Text></TouchableOpacity>
                  </View>
                </View>)}
              </View>
            </View>;
          })}

          {markingImages.length>1&&!selectedMarkingImage && <Text style={{color:dark?OPERATIONS_DARK.amber:'#9b6a00'}}>Select an image before placing a new equipment marker.</Text>}
          {selectedMarkingImage && <Text style={{color:dark?OPERATIONS_DARK.secondary:'#607080'}}>Selected: {selectedMarkingImage.name}</Text>}

          {placementMode && (
            <View style={styles.placementMessage}>
              <Text style={styles.placementMessageText}>
              Click on the selected image where you want to place the equipment.
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
              path={selectedMarkingImage?.path}
              resizeMode="contain"
              onLoad={event => {
                const source = event?.nativeEvent?.source;
                if (source?.width > 0 && source?.height > 0) {
                  setImageAspectRatio(source.width / source.height);
                }
              }}
              style={styles.layoutImage}
            />
              {pinsForSelectedImage.map(equipment => (
              <Pressable
                key={equipment.id}
                accessibilityLabel={`Equipment ${equipment.markingNo ?? equipment.sequenceNo}: ${equipment.tagNumber}`}
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
                <Text style={styles.pinText}>{equipment.markingNo ?? equipment.sequenceNo}</Text>
              </Pressable>
            ))}
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, headingTheme]}>Equipment</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
            <Text style={[styles.sectionCount, dark && {color: OPERATIONS_DARK.secondary}]}>{area.equipment.length} total</Text>
            <TouchableOpacity accessibilityRole="button" style={[styles.addButton, dark && styles.registerButtonDark]} onPress={() => {setSelectedEquipmentId(null); setEditingEquipment(null); setPendingPosition(null); setForm(emptyForm()); setFormError(''); setPendingPhotos([]); setPhotoRole('Overview'); setFormVisible(true);}}>
              <Text style={[styles.addButtonText, dark && styles.registerButtonTextDark]}>+ Register Equipment</Text>
            </TouchableOpacity>
          </View>
        </View>
        {area.equipment.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.stateTitle}>No equipment added</Text>
            <Text style={styles.stateMessage}>Register equipment directly, or place it on the layout when a plan is available.</Text>
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
        {!!selectedEquipmentId && !!equipmentPhotos.length && <View style={styles.photoPanel}><Text style={styles.cardTitle}>Equipment photographs</Text><View style={styles.photoRow}>{equipmentPhotos.map(photo => <View key={photo.id} style={styles.equipmentPhoto}><AuthenticatedImage path={photo.url} fileName={photo.fileName} style={styles.photoImage} placeholderText="Photo unavailable"/><Text style={styles.cardHint}>{photo.equipmentPhotoRole} · {photo.fileName}</Text></View>)}</View></View>}
      </ScrollView>

    </>
  );
}

function newClientEventId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
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
      <View nativeID="ex-area-equipment-table" style={styles.table}>
        <View testID="area-equipment-heading" style={styles.tableHeader}>
          <TableCell text="AREA MARKING" width={90} header />
          <TableCell text="TAG NUMBER" width={125} header />
          <TableCell text="EQUIPMENT ID" width={130} header />
          <TableCell text="RFID TAG UID" width={150} header />
          <TableCell text="TYPE" width={110} header />
          <TableCell text="LOCATION" width={170} header />
          <TableCell text="MANUFACTURER" width={135} header />
          <TableCell text="REGISTRATION" width={125} header />
          <TableCell text="STATUS" width={135} header />
          <TableCell text="ACTIONS" width={225} header />
        </View>
        {equipment.map((item, index) => (
          <Pressable
            key={item.id}
            testID="area-equipment-row"
            accessibilityRole="button"
            accessibilityState={{selected: selectedId === item.id}}
            onHoverIn={() => setHoveredId(item.id)}
            onHoverOut={() => setHoveredId(current => current === item.id ? null : current)}
            onPress={() => onSelect(item.id)}
            style={[
              styles.tableRow,
              index % 2 === 1 && styles.tableRowAlternate,
              hoveredId === item.id && styles.tableRowHovered,
              selectedId === item.id && styles.tableRowSelected,
            ]}>
            <TableCell text={String(item.markingNo ?? item.sequenceNo)} width={90} strong />
            <TableCell text={item.tagNumber} width={125} strong />
            <TableCell text={item.equipmentId || '--'} width={130} />
            <TableCell text={item.rfidTagUid || '--'} width={150} />
            <TableCell text={item.type} width={110} />
            <TableCell text={item.location || '--'} width={170} />
            <TableCell text={item.manufacturer || '--'} width={135} />
            <TableCell text={item.registrationStatus || 'Unreviewed'} width={125} />
            <View style={[styles.tableCell, styles.statusCell]}>
              <StatusBadge status={item.status} />
            </View>
            <View style={[styles.tableCell, styles.actionsCell]}>
              <TouchableOpacity
                testID="area-equipment-view"
                accessibilityRole="button"
                onPress={event => {
                  event.stopPropagation?.();
                  onView(item.id);
                }}
                style={styles.viewButton}>
                <Text style={styles.viewButtonText}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="area-equipment-edit"
                accessibilityRole="button"
                onPress={event => {
                  event.stopPropagation?.();
                  onEdit(item);
                }}
                style={styles.editButton}>
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="area-equipment-delete"
                accessibilityRole="button"
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
      <Text style={[styles.statusBadgeText, textStyle]}>
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
      <Text testID="area-equipment-cell-text" numberOfLines={2} style={[styles.tableText, header && styles.tableHeaderText, strong && styles.tableStrongText]}>
        {text}
      </Text>
    </View>
  );
}

function EquipmentFormPage({areaName, dark, editing, form, error, saving, equipment, photoRole, pendingPhotos, savedPhotos, photosLoading, photosError, sequenceLabel, onRemoveSaved, onReplaceSaved, onRemovePending, onPhotoRoleChange, onPhotosSelected, onChange, onCancel, onSave, onSaveAndStart, canStartInspection}: {
  areaName: string;
  dark: boolean;
  editing: boolean;
  form: EquipmentForm;
  error: string;
  saving: boolean;
  equipment: AreaEquipment[];
  photoRole: 'Overview' | 'Nameplate' | 'ExMarking' | 'Installation' | 'Additional';
  pendingPhotos: InspectionPhotoFile[];
  savedPhotos: any[];
  photosLoading:boolean; photosError:string;
  onRemoveSaved:(photo:any)=>void;
  onReplaceSaved:(photo:any,files:InspectionPhotoFile[])=>void;
  sequenceLabel: string;
  onRemovePending:(index:number)=>void;
  onPhotoRoleChange: (role: 'Overview' | 'Nameplate' | 'ExMarking' | 'Installation' | 'Additional') => void;
  onPhotosSelected: (files: InspectionPhotoFile[]) => void;
  onChange: (key: keyof EquipmentForm, value: string) => void;
  onCancel: () => void;
  onSave: () => void;
  onSaveAndStart: () => void;
  canStartInspection: boolean;
}) {
  const [preview,setPreview]=useState<string|null>(null);
  const [replacing,setReplacing]=useState<string|null>(null);
  const c = dark ? OPERATIONS_DARK : LIGHT;
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!saving) onCancel();
      return true;
    });
    return () => back.remove();
  }, [onCancel, saving]);
  const panel = [styles.formPanel, {backgroundColor: c.card, borderColor: c.border}];
  const heading = [styles.formHeading, {color: c.text}];
  const label = [styles.formLabel, {color: c.text}];
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.screen, {backgroundColor: c.bg}]}>
      <ScrollView nativeID="ex-area-equipment-form" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
        <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={onCancel} style={styles.backButton}>
          <Text style={[styles.backText, {color: dark ? c.cyan : c.indigo}]}>← Back to area</Text>
        </TouchableOpacity>
        <View style={styles.header}>
          <Image source={require('../assets/landing/industry-3.jpg')} resizeMode="cover" style={styles.heroPhoto} accessible={false} />
          <View nativeID="ex-operations-hero-overlay" pointerEvents="none" style={StyleSheet.absoluteFill} />
          <Text style={styles.eyebrow}>AREA EQUIPMENT</Text>
          <Text accessibilityRole="header" style={styles.title}>{editing ? 'Edit Equipment' : 'Add Equipment'}</Text>
          <Text style={styles.subtitle}>{areaName}</Text>
        </View>
        <View style={panel}>
          <Text accessibilityRole="header" style={heading}>Equipment information</Text><Text style={{color:c.text}}>Sl. No (automatic, read-only): {sequenceLabel}</Text>
          <View style={styles.formGrid}>
            <FormField dark={dark} label="Item Tag *" value={form.tagNumber} onChangeText={value => onChange('tagNumber', value)} />
            <FormField dark={dark} label="Equipment ID / Ex-Tag" value={form.equipmentId} onChangeText={value => onChange('equipmentId', value)} />
            <FormField dark={dark} label="RFID Tag UID" value={form.rfidTagUid} onChangeText={value => onChange('rfidTagUid', value)} placeholder="Scan or enter tag UID" />
            <IdentifierTechnologySelect dark={dark} value={form.rfidIdentificationMethod} onChange={value => onChange('rfidIdentificationMethod', value)} disabled={saving} />
            <View style={styles.formField}>
              <Text style={label}>Type *</Text>
              <SearchableOptionPicker dark={dark} label="Select equipment type" placeholder="Select equipment type" value={form.type}
                options={equipmentOptions([...equipmentTypes, 'Other'], equipment.map(item => item.type), form.type)}
                onChange={value => onChange('type', value)} customLabel="Add Custom Type" disabled={saving} />
            </View>
            {form.type === 'Other' && <FormField dark={dark} label="Other Equipment Type *" value={form.otherType} onChangeText={value => onChange('otherType', value)} placeholder="Enter equipment type" />}
            <FormField dark={dark} label="Circuit ID" value={form.circuitId} onChangeText={value => onChange('circuitId', value)} />
            <FormField dark={dark} label="Location / Area" value={form.location} onChangeText={value => onChange('location', value)} />
            <FormField dark={dark} label="Manufacturer" value={form.manufacturer} onChangeText={value => onChange('manufacturer', value)} />
            <FormField dark={dark} label="Certificate Number" value={form.certificateNumber} onChangeText={value => onChange('certificateNumber', value)} />
            <FormField dark={dark} label="Description" value={form.description} onChangeText={value => onChange('description', value)} />
            <FormField dark={dark} label="Model" value={form.model} onChangeText={value => onChange('model', value)} />
            <FormField dark={dark} label="Serial Number" value={form.serialNumber} onChangeText={value => onChange('serialNumber', value)} />
          </View>
        </View>
        <View style={panel}>
          <Text accessibilityRole="header" style={heading}>Hazardous area and protection</Text>
          <View style={styles.formGrid}>
            <View style={styles.formField}><Text style={label}>Protection Type</Text><SearchableOptionPicker dark={dark} label="Protection Type" placeholder="Select protection type" value={form.exProtectionType} options={equipmentOptions([],equipment.map(item=>item.exProtectionType||''),form.exProtectionType)} customLabel="Add Custom Protection Type" onChange={value=>onChange('exProtectionType',value)} disabled={saving}/></View>
            <View style={styles.formField}>
              <Text style={label}>Zone / Division</Text>
              <SearchableOptionPicker dark={dark} label="Hazardous Area Zone" placeholder="Select or enter verified zone"
                value={form.hazardousAreaZone}
                options={[{label: 'Clear zone', value: ''}, ...equipmentOptions(zoneOptions, equipment.map(item => item.hazardousAreaZone), form.hazardousAreaZone)]}
                onChange={value => onChange('hazardousAreaZone', value)} customLabel="Add Custom Zone" disabled={saving} />
            </View>
            <FormField dark={dark} label="Gas / Dust Group" value={form.gasGroup} onChangeText={value => onChange('gasGroup', value)} />
            <FormField dark={dark} label="Temperature Class" value={form.temperatureClass} onChangeText={value => onChange('temperatureClass', value)} />
            <FormField dark={dark} label="Ambient Temperature Range" value={form.ambientTemperatureRange} onChangeText={value => onChange('ambientTemperatureRange', value)} />
            <FormField dark={dark} label="IP Rating" value={form.ipRating} onChangeText={value => onChange('ipRating', value)} />
            <FormField dark={dark} label="Certificate Issuing Organization" value={form.notifiedBody} onChangeText={value => onChange('notifiedBody', value)} />
            <FormField dark={dark} label="Special Conditions of Use" value={form.specialConditionsOfUse} onChangeText={value => onChange('specialConditionsOfUse', value)} multiline />
          </View>
          <Text style={{fontSize: 13, color: c.secondary}}>Leave unavailable details blank. Only enter Ex information verified from the nameplate or controlled documents.</Text>
        </View>
        <View style={panel}>
          <Text accessibilityRole="header" style={heading}>Equipment evidence photographs</Text>
          <View style={styles.identifyMethods}>
            {(['Overview', 'Nameplate', 'ExMarking', 'Installation', 'Additional'] as const).map(role => (
              <TouchableOpacity key={role} accessibilityRole="button" accessibilityState={{selected: photoRole === role}}
                disabled={saving} onPress={() => onPhotoRoleChange(role)}
                style={[styles.methodButton, {backgroundColor: photoRole === role ? '#55e4ef' : c.elevated}]}>
                <Text style={[styles.methodText, {color: photoRole === role ? '#04202c' : c.text}]}>{role === 'ExMarking' ? 'Ex marking' : role}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <InspectionPhotoPicker disabled={saving} onSelected={onPhotosSelected} />
          {pendingPhotos.map((file,index)=><View key={index} style={{gap:8}}>{!!file.uri&&<Image source={{uri:file.uri}} style={{width:100,height:80,borderRadius:8}}/>}<Text style={{color:c.text}}>{file.fileName}</Text><TouchableOpacity accessibilityRole="button" disabled={saving} onPress={()=>onRemovePending(index)}><Text style={{color:c.critical}}>Remove Selected Photo</Text></TouchableOpacity>{!!file.uri&&<TouchableOpacity accessibilityRole="button" onPress={()=>setPreview(file.uri!)}><Text style={{color:c.cyan}}>View Photo</Text></TouchableOpacity>}</View>)}
          {photosLoading&&<ActivityIndicator color={c.cyan}/>}{!!photosError&&<Text accessibilityRole="alert" style={{color:c.critical}}>{photosError}</Text>}
          {editing&&savedPhotos.map(photo=><View key={photo.id} style={{gap:8}}><AuthenticatedImage path={photo.url} fileName={photo.fileName} style={{width:100,height:80,borderRadius:8}}/><Text style={{color:c.text}}>{photo.fileName}</Text><TouchableOpacity accessibilityRole="button" onPress={()=>setPreview(photo.url)}><Text style={{color:c.cyan}}>View Photo</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" disabled={saving} onPress={()=>setReplacing(photo.id)}><Text style={{color:c.cyan}}>Replace Photo</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" disabled={saving} onPress={()=>onRemoveSaved(photo)}><Text style={{color:c.critical}}>Remove Saved Photo</Text></TouchableOpacity>{replacing===photo.id&&<InspectionPhotoPicker disabled={saving} allowPdf={false} onSelected={files=>{setReplacing(null);onReplaceSaved(photo,files);}}/>}</View>)}
          {!!preview&&<ZoomableImageViewer visible title="Equipment Photograph" images={[preview]} onClose={()=>setPreview(null)}/>}

          {!!pendingPhotos.length && <Text style={{color: c.secondary}}>{pendingPhotos.length} photo(s) selected for {photoRole}. They upload after the equipment record is saved.</Text>}
        </View>
        {!!error && <Text accessibilityRole="alert" style={[styles.formError, {color: c.critical}]}>{error}</Text>}
        <View style={[styles.formActions, {borderTopColor: c.border}]}>
          <TouchableOpacity disabled={saving} onPress={onCancel} accessibilityRole="button" style={[styles.formCancelButton, {borderColor: c.borderActive}]}>
            <Text style={[styles.formCancelText, {color: c.text}]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={saving} onPress={onSave} accessibilityRole="button" style={[styles.formSaveButton, saving && styles.buttonDisabled]}>
            {saving ? <ActivityIndicator color="#092331" /> : <Text style={styles.formSaveText}>{editing ? 'Save Changes' : 'Add Equipment'}</Text>}
          </TouchableOpacity>
          {canStartInspection && <TouchableOpacity disabled={saving} onPress={onSaveAndStart} accessibilityRole="button" style={[styles.formSaveButton, saving && styles.buttonDisabled]}>
            {saving ? <ActivityIndicator color="#092331" /> : <Text style={styles.formSaveText}>Save &amp; start inspection</Text>}
          </TouchableOpacity>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function IdentifierTechnologySelect({value, onChange, disabled, dark}: {dark: boolean; value: string; onChange: (value: string) => void; disabled: boolean}) {
  const c = dark ? OPERATIONS_DARK : LIGHT;
  return <View style={styles.formField}>
    <Text style={[styles.formLabel, {color: c.text}]}>Tag technology</Text>
    <View style={{flexDirection: 'row', gap: 8}}>{(['HF_RFID', 'NFC'] as const).map(method => <TouchableOpacity key={method} disabled={disabled} onPress={() => onChange(method)} style={[styles.methodButton, {backgroundColor: value === method ? '#55e4ef' : c.elevated}]}><Text style={[styles.methodText, {color: value === method ? '#04202c' : c.text}]}>{method === 'HF_RFID' ? 'HF RFID' : method}</Text></TouchableOpacity>)}</View>
  </View>;
}

function FormField({dark, label, value, onChangeText, multiline = false, placeholder = 'Enter value'}: {
  dark: boolean; label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean; placeholder?: string;
}) {
  const c = dark ? OPERATIONS_DARK : LIGHT;
  return (
    <View style={styles.formField}>
      <Text style={[styles.formLabel, {color: c.text}]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        style={[styles.formInput, {color: c.text, borderColor: c.border, backgroundColor: c.bg}, multiline && styles.formInputMultiline]}
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
  screen: {flex: 1, backgroundColor: '#f0f6f8'},
  content: {padding: 16, paddingBottom: 48, gap: 12, width: '100%', alignSelf: 'center'},
  backButton: {alignSelf: 'flex-start', paddingVertical: 5},
  backText: {fontSize: 13, color: '#8fa7f8', fontWeight: '800'},
  header: {minHeight: 130, backgroundColor: '#092331', borderRadius: 16, padding: 23, justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#1389a5'},
  heroPhoto: {position: 'absolute', right: 0, width: '72%', height: '100%', opacity: Platform.OS === 'web' ? 1 : 0.45},
  identifyCard: {padding: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e3e6ee', borderRadius: 16},
  identifyMethods: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 10},
  methodButton: {paddingHorizontal: 12, paddingVertical: 9, borderRadius: 6, backgroundColor: '#eef0f5'},
  methodButtonActive: {backgroundColor: '#dfe4ff'},
  methodText: {fontSize: 11, color: '#50556d', fontWeight: '700'},
  methodTextActive: {color: '#343ba7'},
  identifyInput: {minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: '#d8dbe5', borderRadius: 6, color: '#272b49'},
  scanButton: {paddingHorizontal: 12, paddingVertical: 9, borderRadius: 6, backgroundColor: '#092331'},
  scanButtonText: {fontSize: 11, color: '#fff', fontWeight: '800'},
  lookupButton: {alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 6, backgroundColor: '#3f47d6'},
  lookupButtonText: {fontSize: 11, color: '#fff', fontWeight: '800'},
  identifyResult: {marginTop: 12, padding: 12, borderWidth: 1, borderRadius: 6},
  identifyMatched: {backgroundColor: '#eff8f2', borderColor: '#b9dfc8'},
  identifyUnknown: {backgroundColor: '#fff8e8', borderColor: '#ecd79c'},
  identifyWarning: {backgroundColor: '#fff0f0', borderColor: '#ebc0c4'},
  identifyResultTitle: {fontSize: 13, color: '#25294f', fontWeight: '800'},
  photoPanel: {marginTop: 14, padding: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e3e6ee', borderRadius: 8},
  photoRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10},
  equipmentPhoto: {width: 145, gap: 4},
  photoImage: {width: 145, height: 115, borderRadius: 6, backgroundColor: '#eef0f6'},
  eyebrow: {fontSize: 10, color: '#8ed8d2', fontWeight: '800', letterSpacing: 1.1},
  title: {fontSize: 32, color: '#fff', fontWeight: '900', marginTop: 5},
  subtitle: {fontSize: 14, color: '#e4f3f9', marginTop: 7},
  layoutCard: {padding: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e3e6ee', borderRadius: 16},
  cardHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14},
  cardHeaderPhone: {alignItems: 'stretch', flexDirection: 'column'},
  cardHeaderCopy: {flex: 1},
  cardTitle: {fontSize: 19, fontWeight: '800', color: '#25294f'},
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
  sectionHeader: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginTop: 16},
  sectionTitle: {fontSize: 18, color: '#092331', fontWeight: '800'},
  sectionCount: {fontSize: 12, color: '#73788c', fontWeight: '700'},
  registerButtonDark: {backgroundColor: '#52eaf7'},
  registerButtonTextDark: {color: '#04202c'},
  tableScrollContent: {minWidth: '100%', paddingBottom: 4},
  table: {minWidth: 1365, flexGrow: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dfe3ee', borderRadius: 12, overflow: 'hidden'},
  tableHeader: {flexDirection: 'row', minHeight: 46, backgroundColor: '#eef1f8'},
  tableRow: {flexDirection: 'row', minHeight: 64, borderTopWidth: 1, borderTopColor: '#e9ecf3'},
  tableRowAlternate: {backgroundColor: '#fafbfe'},
  tableRowHovered: {backgroundColor: '#f1f3ff'},
  tableRowSelected: {backgroundColor: '#e8ecff', borderLeftWidth: 3, borderLeftColor: '#5961e2'},
  tableCell: {paddingHorizontal: 12, justifyContent: 'center'},
  tableText: {fontSize: 14, lineHeight: 20, color: '#55596e'},
  tableHeaderText: {fontSize: 11, color: '#666d84', fontWeight: '900'},
  tableStrongText: {color: '#292d4e', fontWeight: '800'},
  actionsCell: {width: 225, flexDirection: 'row', alignItems: 'center', gap: 7},
  statusCell: {width: 135},
  statusBadge: {alignSelf: 'flex-start', maxWidth: 125, borderRadius: 5, paddingHorizontal: 9, paddingVertical: 6},
  statusBadgeText: {fontSize: 11, fontWeight: '800'},
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
  formContent: {width: '100%', maxWidth: 1440, alignSelf: 'center', padding: 16, paddingBottom: 36, gap: 14},
  formPanel: {padding: 18, borderWidth: 1, borderRadius: 14, gap: 12},
  formHeading: {fontSize: 19, fontWeight: '800'},
  formGrid: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 14},
  formField: {flexGrow: 1, flexBasis: 275, minWidth: 0},
  formLabel: {fontSize: 14, fontWeight: '700', marginBottom: 6},
  formInput: {minHeight: 46, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15},
  formInputMultiline: {minHeight: 82, textAlignVertical: 'top'},
  formError: {fontSize: 14, fontWeight: '700'},
  formActions: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10, paddingVertical: 14, borderTopWidth: 1},
  formCancelButton: {minHeight: 44, minWidth: 90, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14},
  formCancelText: {fontSize: 14, fontWeight: '800'},
  formSaveButton: {minHeight: 44, minWidth: 130, borderRadius: 8, backgroundColor: '#55e4ef', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16},
  formSaveText: {fontSize: 14, color: '#092331', fontWeight: '800'},
  fullState: {flex: 1, minHeight: 400, backgroundColor: '#f4f6fb', alignItems: 'center', justifyContent: 'center', padding: 28},
  stateTitle: {fontSize: 17, color: '#292d50', fontWeight: '800'},
  stateMessage: {fontSize: 13, color: '#7d8192', lineHeight: 19, textAlign: 'center', marginTop: 10},
  stateActions: {flexDirection: 'row', gap: 10, marginTop: 18},
  primaryButton: {backgroundColor: '#8ed8d2', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10},
  primaryButtonText: {fontSize: 12, color: '#092331', fontWeight: '800'},
  secondaryButton: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#d9dce8', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 7},
  secondaryButtonText: {fontSize: 12, color: '#424760', fontWeight: '800'},
});
