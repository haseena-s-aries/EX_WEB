import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {getApiErrorMessage} from '../api/errors';
import {
  createSurveyorInspection,
  deleteSurveyorInspectionPhoto,
  getSurveyorChecklist,
  getSurveyorEquipmentDetails,
  getSurveyorEquipmentInspection,
  InspectionPhotoFile,
  InspectionType,
  SurveyorEquipmentDetails,
  SurveyorEquipmentInspection,
  SurveyorInspectionAnswer,
  updateSurveyorInspection,
  uploadSurveyorInspectionPhotos,
} from '../api/projects';
import AuthenticatedImage from '../components/AuthenticatedImage';
import InspectionPhotoPicker from '../components/InspectionPhotoPicker';

type Props = {
  equipmentId: string;
  inspectorName: string;
  onBack: () => void;
  onSaved: () => void;
};

const TABS: InspectionType[] = ['Visual', 'Close', 'Detailed'];
const today = () => new Date().toISOString().slice(0, 10);
const toApiDate = (date: string) => `${date}T00:00:00Z`;

export default function SurveyorInspectionScreen({
  equipmentId,
  inspectorName,
  onBack,
  onSaved,
}: Props) {
  const [equipment, setEquipment] = useState<SurveyorEquipmentDetails | null>(null);
  const [inspection, setInspection] = useState<SurveyorEquipmentInspection | null>(null);
  const [answers, setAnswers] = useState<SurveyorInspectionAnswer[]>([]);
  const [activeTab, setActiveTab] = useState<InspectionType>('Visual');
  const [inspectionDate, setInspectionDate] = useState(today());
  const [name, setName] = useState(inspectorName);
  const [comments, setComments] = useState('');
  const [pendingPhotos, setPendingPhotos] = useState<InspectionPhotoFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const applyInspection = useCallback((value: SurveyorEquipmentInspection) => {
    setInspection(value);
    setAnswers(value.answers);
    setInspectionDate(new Date(value.inspectionDate).toISOString().slice(0, 10));
    setName(value.inspectorName || inspectorName);
    setComments(value.comments || '');
  }, [inspectorName]);

  const loadInspection = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [equipmentResponse, checklistResponse] = await Promise.all([
        getSurveyorEquipmentDetails(equipmentId),
        getSurveyorChecklist(),
      ]);
      setEquipment(equipmentResponse.data);
      try {
        const inspectionResponse = await getSurveyorEquipmentInspection(equipmentId);
        applyInspection(inspectionResponse.data);
      } catch (inspectionError: any) {
        if (inspectionError?.response?.status !== 404) throw inspectionError;
        const draftResponse = await createSurveyorInspection(equipmentId, {
          inspectionDate: toApiDate(today()),
          inspectorName,
          comments: null,
          isCompleted: false,
          answers: checklistResponse.data.map(item => ({
            checklistItemId: item.checklistItemId,
            isChecked: false,
          })),
        });
        applyInspection(draftResponse.data);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not load the inspection checklist.'));
    } finally {
      setLoading(false);
    }
  }, [applyInspection, equipmentId, inspectorName]);

  useEffect(() => {
    loadInspection();
  }, [loadInspection]);

  const visibleAnswers = useMemo(
    () => answers.filter(answer => answer.inspectionType === activeTab),
    [activeTab, answers],
  );
  const checkedCount = answers.filter(answer => answer.isChecked).length;
  const editable = inspection?.isEditable !== false;

  const toggleAnswer = (checklistItemId: string) => {
    if (!editable) return;
    setAnswers(current => current.map(answer =>
      answer.checklistItemId === checklistItemId
        ? {...answer, isChecked: !answer.isChecked}
        : answer,
    ));
  };

  const saveInspection = async () => {
    if (!inspectionDate.trim() || !name.trim()) {
      Alert.alert('Missing information', 'Inspection Date and Inspector Name are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        inspectionDate: toApiDate(inspectionDate),
        inspectorName: name.trim(),
        comments: comments.trim() || null,
        isCompleted: true,
        answers: answers.map(answer => ({
          checklistItemId: answer.checklistItemId,
          isChecked: answer.isChecked,
          remarks: answer.remarks || null,
        })),
      };
      const saved = inspection
        ? await updateSurveyorInspection(inspection.inspectionId, payload)
        : await createSurveyorInspection(equipmentId, payload);
      if (pendingPhotos.length > 0) {
        await uploadSurveyorInspectionPhotos(saved.data.inspectionId, pendingPhotos);
      }
      const refreshed = (await getSurveyorEquipmentInspection(equipmentId)).data;
      setPendingPhotos([]);
      applyInspection(refreshed);
      onSaved();
      onBack();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not save the inspection.'));
    } finally {
      setSaving(false);
    }
  };

  const removeExistingPhoto = async (photoId: string) => {
    if (!inspection || !editable) return;
    try {
      await deleteSurveyorInspectionPhoto(inspection.inspectionId, photoId);
      const refreshed = await getSurveyorEquipmentInspection(equipmentId);
      applyInspection(refreshed.data);
    } catch (requestError) {
      Alert.alert('Delete failed', getApiErrorMessage(requestError, 'Could not delete this photo.'));
    }
  };

  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color="#8fa7f8" size="large" />
        <Text style={styles.stateText}>Preparing inspection...</Text>
      </View>
    );
  }

  if (error && !inspection) {
    return (
      <View style={styles.state}>
        <Text style={styles.stateTitle}>Inspection unavailable</Text>
        <Text style={styles.stateText}>{error}</Text>
        <TouchableOpacity onPress={onBack} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>&lt; Back to equipment</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>INSPECTION CHECKLIST</Text>
          <Text style={styles.title}>{equipment?.tagNumber || 'Equipment'}</Text>
          <Text style={styles.subtitle}>{equipment?.type} | {equipment?.areaName}</Text>
        </View>
        <View style={styles.progressBox}>
          <Text style={styles.progressValue}>{checkedCount}/{answers.length}</Text>
          <Text style={styles.progressLabel}>items checked</Text>
        </View>
      </View>

      {inspection?.qcComments ? (
        <View style={styles.qcNotice}>
          <Text style={styles.qcTitle}>QC comments</Text>
          <Text style={styles.qcText}>{inspection.qcComments}</Text>
          {inspection.qcSeverity ? (
            <Text style={styles.qcSeverity}>Severity: {inspection.qcSeverity}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.formPanel}>
        <View style={styles.fieldRow}>
          <Field label="Inspection Date *">
            <TextInput
              editable={editable}
              value={inspectionDate}
              onChangeText={setInspectionDate}
              placeholder="YYYY-MM-DD"
              style={[styles.input, !editable && styles.inputDisabled]}
            />
          </Field>
          <Field label="Inspector Name *">
            <TextInput
              editable={editable}
              value={name}
              onChangeText={setName}
              style={[styles.input, !editable && styles.inputDisabled]}
            />
          </Field>
        </View>

        <View style={styles.tabs}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.checklist}>
          {visibleAnswers.map(answer => (
            <TouchableOpacity
              key={answer.checklistItemId}
              disabled={!editable}
              onPress={() => toggleAnswer(answer.checklistItemId)}
              style={styles.checkRow}>
              <View style={[styles.checkbox, answer.isChecked && styles.checkboxChecked]}>
                <Text style={styles.checkmark}>{answer.isChecked ? '✓' : ''}</Text>
              </View>
              <Text style={styles.checkText}>{answer.text}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field label="Comments">
          <TextInput
            editable={editable}
            multiline
            value={comments}
            onChangeText={setComments}
            placeholder="Add inspection observations"
            style={[styles.input, styles.commentsInput, !editable && styles.inputDisabled]}
          />
        </Field>

        <View style={styles.photoSection}>
          <Text style={styles.fieldLabel}>Photos</Text>
          <InspectionPhotoPicker
            disabled={!editable || saving}
            onSelected={files => setPendingPhotos(current => [...current, ...files])}
          />
          <View style={styles.photoGrid}>
            {inspection?.photos.map(photo => (
              <View key={photo.id} style={styles.photoTile}>
                <AuthenticatedImage path={photo.photoPath} style={styles.photo} />
                <Text numberOfLines={1} style={styles.photoName}>{photo.fileName}</Text>
                {editable ? (
                  <TouchableOpacity
                    onPress={() => removeExistingPhoto(photo.id)}
                    style={styles.removePhoto}>
                    <Text style={styles.removePhotoText}>Remove</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
            {pendingPhotos.map((photo, index) => (
              <View key={`${photo.uri}-${index}`} style={styles.photoTile}>
                <Image source={{uri: photo.uri}} style={styles.photo} />
                <Text numberOfLines={1} style={styles.photoName}>
                  {photo.fileName || photo.name || 'New photo'}
                </Text>
                <TouchableOpacity
                  onPress={() => setPendingPhotos(current => current.filter((_, i) => i !== index))}
                  style={styles.removePhoto}>
                  <Text style={styles.removePhotoText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {editable ? (
          <TouchableOpacity
            disabled={saving}
            onPress={saveInspection}
            style={[styles.saveButton, saving && styles.buttonDisabled]}>
            {saving ? <ActivityIndicator color="#242d52" /> : null}
            <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Inspection'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.lockedNotice}>
            <Text style={styles.lockedText}>This inspection is QC approved and locked.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#f7f9ff'},
  content: {padding: 24, paddingBottom: 48, maxWidth: 1050, width: '100%', alignSelf: 'center'},
  backButton: {alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 8},
  backText: {color: '#8fa7f8', fontWeight: '800', fontSize: 13},
  header: {minHeight: 132, backgroundColor: '#242d52', borderRadius: 8, padding: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16},
  eyebrow: {fontSize: 10, color: '#b8a5f8', fontWeight: '800'},
  title: {fontSize: 24, color: '#fff', fontWeight: '800', marginTop: 6},
  subtitle: {fontSize: 12, color: '#dfe6ff', marginTop: 6},
  progressBox: {alignItems: 'center', minWidth: 100, borderLeftWidth: 1, borderLeftColor: '#485274', paddingLeft: 20},
  progressValue: {fontSize: 22, color: '#fff', fontWeight: '900'},
  progressLabel: {fontSize: 10, color: '#c8d1ef', marginTop: 3},
  qcNotice: {marginTop: 14, borderLeftWidth: 3, borderLeftColor: '#ba4e3c', backgroundColor: '#fff4f1', padding: 14},
  qcTitle: {fontSize: 12, color: '#9b3d30', fontWeight: '800'},
  qcText: {fontSize: 12, color: '#5c4c49', lineHeight: 18, marginTop: 5},
  qcSeverity: {fontSize: 11, color: '#9b3d30', fontWeight: '700', marginTop: 7},
  formPanel: {marginTop: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e9f6', borderRadius: 8, padding: 22},
  fieldRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 14},
  field: {flexGrow: 1, flexBasis: 260, marginBottom: 18},
  fieldLabel: {fontSize: 10, color: '#777d91', fontWeight: '800', textTransform: 'uppercase', marginBottom: 7},
  input: {minHeight: 42, borderWidth: 1, borderColor: '#d9ddea', borderRadius: 7, paddingHorizontal: 12, color: '#343851', backgroundColor: '#fff'},
  inputDisabled: {backgroundColor: '#f2f3f7', color: '#777d91'},
  commentsInput: {minHeight: 100, paddingTop: 12, textAlignVertical: 'top'},
  tabs: {flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e9f6', marginBottom: 8},
  tab: {minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, borderBottomWidth: 3, borderBottomColor: 'transparent'},
  tabActive: {borderBottomColor: '#8fa7f8'},
  tabText: {fontSize: 12, color: '#838798', fontWeight: '800'},
  tabTextActive: {color: '#4d5f9e'},
  checklist: {marginBottom: 20},
  checkRow: {minHeight: 52, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eef0f5', paddingVertical: 10, gap: 12},
  checkbox: {width: 23, height: 23, borderWidth: 2, borderColor: '#c4c9d9', borderRadius: 4, alignItems: 'center', justifyContent: 'center'},
  checkboxChecked: {borderColor: '#718be8', backgroundColor: '#718be8'},
  checkmark: {color: '#fff', fontSize: 14, fontWeight: '900'},
  checkText: {flex: 1, fontSize: 13, color: '#3b3f59', lineHeight: 19},
  photoSection: {marginTop: 2},
  photoGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14},
  photoTile: {width: 150, borderWidth: 1, borderColor: '#e1e4ef', borderRadius: 7, overflow: 'hidden', backgroundColor: '#fafbff'},
  photo: {width: '100%', height: 100},
  photoName: {fontSize: 10, color: '#656b80', paddingHorizontal: 8, paddingTop: 7},
  removePhoto: {minHeight: 30, justifyContent: 'center', paddingHorizontal: 8},
  removePhotoText: {fontSize: 10, color: '#ba4e3c', fontWeight: '800'},
  errorText: {fontSize: 12, color: '#ba4e3c', marginBottom: 12},
  saveButton: {alignSelf: 'flex-start', minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20, borderRadius: 7, backgroundColor: '#b8a5f8'},
  saveText: {fontSize: 13, color: '#242d52', fontWeight: '800'},
  buttonDisabled: {opacity: 0.6},
  lockedNotice: {backgroundColor: '#f2f3f7', padding: 14, borderRadius: 7},
  lockedText: {fontSize: 12, color: '#656b80', fontWeight: '700'},
  state: {flex: 1, minHeight: 400, backgroundColor: '#f7f9ff', alignItems: 'center', justifyContent: 'center', padding: 28},
  stateTitle: {fontSize: 17, color: '#242d52', fontWeight: '800'},
  stateText: {fontSize: 13, color: '#7d8192', textAlign: 'center', marginTop: 10},
  secondaryButton: {marginTop: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d9dce8', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 7},
  secondaryText: {fontSize: 12, color: '#424760', fontWeight: '800'},
});
