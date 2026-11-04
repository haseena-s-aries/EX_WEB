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
  useWindowDimensions,
} from 'react-native';
import {getApiErrorMessage} from '../api/errors';
import {
  createSurveyorInspection,
  deleteSurveyorInspectionPhoto,
  getSurveyorChecklist,
  getSurveyorChecklistPreview,
  SurveyorChecklistPreview,
  getSurveyorProject,
  getSurveyorArea,
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

const subCheckSummary = (value?: string | null) => {
  if (!value) return '';
  try {
    const checks = JSON.parse(value) as {label: string; applicableGrades: string[]}[];
    return checks.map(check => `${check.label}: ${check.applicableGrades.join(', ')}`).join(' · ');
  } catch { return ''; }
};
const SECTIONS = [
  {code: 'Apparatus', title: 'A. APPARATUS'},
  {code: 'Installation', title: 'B. INSTALLATION'},
  {code: 'Environment', title: 'C. ENVIRONMENT'},
  {code: 'Unclassified', title: 'UNCLASSIFIED'},
];
const GRADES: InspectionType[] = ['Detailed', 'Close', 'Visual'];
const valueOf = (value?: string | number | null) =>
  value === undefined || value === null || String(value).trim() === '' ? '—' : String(value);

const TABS: InspectionType[] = ['Visual', 'Close', 'Detailed'];
const today = () => new Date().toISOString().slice(0, 10);
const toApiDate = (date: string) => `${date}T00:00:00Z`;

export default function SurveyorInspectionScreen({
  equipmentId,
  inspectorName,
  onBack,
  onSaved,
}: Props) {
  const {width} = useWindowDimensions();
  const compact = width < 700;
  const [projectName, setProjectName] = useState('');
  const [metadataWarning, setMetadataWarning] = useState(false);
  const [equipment, setEquipment] = useState<SurveyorEquipmentDetails | null>(null);
  const [inspection, setInspection] = useState<SurveyorEquipmentInspection | null>(null);
  const [sourcePreview, setSourcePreview] = useState<SurveyorChecklistPreview | null>(null);
  const [showSourcePreview, setShowSourcePreview] = useState(false);
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
      const detail = equipmentResponse.data;
      setEquipment(detail);
      // These existing scoped read endpoints provide header fields omitted by the legacy detail DTO.
      // Missing optional header data must not block inspection answers or submission.
      const [projectResult, areaResult, previewResult] = await Promise.allSettled([
        getSurveyorProject(detail.projectId),
        getSurveyorArea(detail.projectId, detail.areaId),
        getSurveyorChecklistPreview(),
      ]);
      setMetadataWarning(projectResult.status === 'rejected' || areaResult.status === 'rejected');
      setProjectName(projectResult.status === 'fulfilled' ? projectResult.value.data.projectName : '');
      const preview = previewResult.status === 'fulfilled' ? previewResult.value.data : null;
      setSourcePreview(preview);
      if (areaResult.status === 'fulfilled') {
        const pin = areaResult.value.data.equipment.find(item => item.id === equipmentId);
        if (pin) setEquipment({...pin, ...detail,
          description: pin.description, model: pin.model, serialNumber: pin.serialNumber,
          exProtectionType: pin.exProtectionType, gasGroup: pin.gasGroup,
          temperatureClass: pin.temperatureClass, hazardousAreaZone: pin.hazardousAreaZone,
          ambientTemperatureRange: pin.ambientTemperatureRange, ipRating: pin.ipRating,
          notifiedBody: pin.notifiedBody,
        });
      }
      try {
        const inspectionResponse = await getSurveyorEquipmentInspection(equipmentId);
        applyInspection(inspectionResponse.data);
        setShowSourcePreview(false);
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
        setShowSourcePreview(false);
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

  const tableAnswers = useMemo<SurveyorInspectionAnswer[]>(
    () => showSourcePreview && sourcePreview
      ? sourcePreview.items.map(item => ({...item, isChecked: false, remarks: null})) : answers,
    [answers, showSourcePreview, sourcePreview],
  );
  const visibleAnswers = useMemo(
    () => tableAnswers.filter(answer => answer.inspectionType === activeTab),
    [activeTab, tableAnswers],
  );
  const checkedCount = answers.filter(answer => answer.isChecked).length;
  const totalChecklistCount = answers.length;
  const progressPercent = totalChecklistCount === 0
    ? 0
    : Math.round((checkedCount / totalChecklistCount) * 100);
  const allVisibleChecked = visibleAnswers.length > 0 &&
    visibleAnswers.every(answer => answer.isChecked);
  const editable = inspection?.isEditable !== false && !showSourcePreview;

  const toggleAnswer = (checklistItemId: string) => {
    if (!editable) return;
    setAnswers(current => current.map(answer =>
      answer.checklistItemId === checklistItemId
        ? {...answer, isChecked: !answer.isChecked}
        : answer,
    ));
  };

  const toggleAllVisibleAnswers = () => {
    if (!editable || visibleAnswers.length === 0) return;
    const nextChecked = !allVisibleChecked;
    setAnswers(current => current.map(answer =>
      answer.inspectionType === activeTab
        ? {...answer, isChecked: nextChecked}
        : answer,
    ));
  };

  const saveInspection = async () => {
    if (!editable || saving) return;
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
      // Photo deletion must not replace unsaved answers, remarks, or header edits.
      setInspection(refreshed.data);
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
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, compact && styles.compactContent]}>
      <TouchableOpacity accessibilityRole="button" onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>&lt; Back to equipment</Text>
      </TouchableOpacity>

      <View style={styles.documentHeading}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>INSPECTION CHECKLIST</Text>
          <Text accessibilityRole="header" style={styles.title}>EX Inspection Test Record</Text>
          <Text style={styles.subtitle}>Equipment inspection · {valueOf(equipment?.tagNumber)}</Text>
        </View>
        <View style={styles.progressBox}>
          <Text style={styles.progressValue}>{showSourcePreview ? sourcePreview?.pointCount : `${checkedCount}/${answers.length}`}</Text>
          <Text style={styles.progressLabel}>{showSourcePreview ? 'source points · preview' : 'items checked'}</Text>
        </View>
      </View>

      <View style={styles.recordHeader}>
        <View style={styles.recordTitleRow}>
          <Text style={styles.recordTitle}>Project: {valueOf(projectName)}</Text>
          <Text style={styles.status}>Status: {valueOf(inspection?.status)}</Text>
        </View>
        <View style={styles.metadataGrid}>
          {[
            ['Item tag', equipment?.tagNumber], ['Circuit ID', equipment?.circuitId], ['Inspection date', inspectionDate],
            ['Area', equipment?.areaName], ['Location', equipment?.location], ['Description', equipment?.description],
            ['Manufacturer', equipment?.manufacturer], ['Model', equipment?.model], ['Serial number', equipment?.serialNumber],
            ['Certificate', equipment?.certificateNumber], ['Notified body', equipment?.notifiedBody], ['Zone', equipment?.hazardousAreaZone],
            ['Gas group', equipment?.gasGroup], ['Temperature class', equipment?.temperatureClass], ['Protection type', equipment?.exProtectionType],
            ['Ambient temperature', equipment?.ambientTemperatureRange], ['IP rating', equipment?.ipRating], ['Equipment type', equipment?.type],
          ].map(([label, value]) => (
            <View key={label} style={[styles.metadataCell, compact && styles.metadataCellCompact]}>
              <Text style={styles.metadataLabel}>{label}</Text>
              <Text style={styles.metadataValue}>{valueOf(value)}</Text>
            </View>
          ))}
        </View>
      </View>
      {metadataWarning ? <Text style={styles.helperText}>Some equipment or project details could not be loaded. Available inspection answers are shown below.</Text> : null}

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
          <Field label="Inspection Date *" inline>
            <TextInput
              editable={editable && !saving}
              value={inspectionDate}
              onChangeText={setInspectionDate}
              accessibilityLabel="Inspection date"
              placeholder="YYYY-MM-DD"
              style={[styles.input, !editable && styles.inputDisabled]}
            />
          </Field>
          <Field label="Inspector Name *" inline>
            <TextInput
              editable={editable && !saving}
              accessibilityLabel="Inspector name"
              value={name}
              onChangeText={setName}
              style={[styles.input, !editable && styles.inputDisabled]}
            />
          </Field>
        </View>

        {sourcePreview && !answers.some(item => item.sourceItemReference) ? (
          <View style={styles.sourceNotice}>
            <Text style={styles.sourceTitle}>Full checklist · 23 Apparatus / 33 Installation / 3 Environment</Text>
            <Text style={styles.helperText}>{showSourcePreview
              ? sourcePreview.isPublished
                ? 'Reference view. This existing inspection keeps its saved checklist; new inspections use the published points.'
                : 'Preview only — awaiting independent technical approval. These points are not saved answers for this inspection.'
              : inspection?.isEditable === false ? 'This saved inspection is QC approved and read-only.' : 'Editing this inspection’s saved answers. Checkboxes and remarks are available below.'}</Text>
            <View style={styles.sourceActions}>
              <TouchableOpacity accessibilityRole="button" accessibilityState={{selected: showSourcePreview}}
                onPress={() => setShowSourcePreview(true)} style={styles.sourceButton}>
                <Text style={styles.sourceButtonText}>View full checklist points</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityState={{selected: !showSourcePreview}}
                onPress={() => setShowSourcePreview(false)} style={styles.sourceButton}>
                <Text style={styles.sourceButtonText}>Saved inspection ({answers.length} items)</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.tabs}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              accessibilityRole="tab"
              accessibilityState={{selected: activeTab === tab}}
              accessibilityLabel={`${tab} inspection grade`}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tableToolbar}>
          <TouchableOpacity
            accessibilityRole="checkbox"
            accessibilityLabel={`Select All ${activeTab} items`}
            accessibilityState={{checked: allVisibleChecked, disabled: !editable || saving}}
            disabled={!editable || saving || visibleAnswers.length === 0}
            onPress={toggleAllVisibleAnswers}
            style={styles.selectAllRow}>
            <View style={[styles.checkbox, allVisibleChecked && styles.checkboxChecked]}>
              <Text style={styles.checkmark}>{allVisibleChecked ? '✓' : ''}</Text>
            </View>
            <Text style={styles.selectAllText}>Select All</Text>
          </TouchableOpacity>
          <Text style={styles.tableCount}>{showSourcePreview ? 'Preview · ' : ''}{activeTab} · {visibleAnswers.length} items</Text>
        </View>
        {compact ? <Text style={styles.helperText}>Swipe the table sideways to view grades and remarks.</Text> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator style={styles.tableScroll} contentContainerStyle={styles.tableContainer}>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.columnHeader, styles.numberCell]}>No.</Text>
              <Text style={[styles.columnHeader, styles.questionCell]}>Items to be checked</Text>
              <Text style={[styles.columnHeader, styles.applicabilityCell]}>Check points /{ '\n' }protection type</Text>
              <View style={styles.gradesHeader}>
                <Text style={styles.gradeTitle}>Grade of inspection</Text>
                <View style={styles.gradeLabels}>
                  {GRADES.map(grade => <Text key={grade} style={[styles.gradeLabel, grade === activeTab && styles.activeGradeLabel]}>{grade[0]}</Text>)}
                </View>
              </View>
              <Text style={[styles.columnHeader, styles.remarksCell]}>Remarks</Text>
            </View>
            {SECTIONS.map(section => {
              const rows = visibleAnswers.filter(answer =>
                (SECTIONS.some(item => item.code !== 'Unclassified' && item.code === answer.sectionCode)
                  ? answer.sectionCode : 'Unclassified') === section.code);
              if (rows.length === 0) return null;
              return (
                <View key={section.code}>
                  <View style={styles.sectionRow}>
                    <Text accessibilityRole="header" style={styles.sectionTitle}>{section.title}</Text>
                    {section.code === 'Unclassified' ? <Text style={styles.sectionHint}>Section not recorded</Text> : null}
                  </View>
                  {rows.map((answer, index) => (
                    <View key={answer.checklistItemId} style={styles.tableRow}>
                      <Text style={[styles.numberCell, styles.rowNumber]}>{answer.sourceItemNumber ?? index + 1}</Text>
                      <View style={styles.questionCell}>
                        <Text style={styles.checkText}>{answer.text}</Text>
                        {subCheckSummary(answer.subChecksJson) ? <Text style={styles.subCheckText}>{subCheckSummary(answer.subChecksJson)}</Text> : null}
                        {answer.isRequired ? <Text style={styles.requiredText}>Required</Text> : null}
                      </View>
                      <View style={styles.applicabilityCell}><Text style={styles.cellText}>{valueOf(answer.applicableProtectionTypes)}</Text></View>
                      {GRADES.map(grade => (
                        <View key={grade} style={[styles.gradeCell,
                          answer.applicableGrades && !answer.applicableGrades.split(',').includes(grade) ? styles.unavailableGrade : null]}>
                          {grade === answer.inspectionType && showSourcePreview ? (
                            <Text style={styles.previewCellText}>View only</Text>
                          ) : grade === answer.inspectionType ? (
                            <TouchableOpacity
                              testID={`answer-${answer.checklistItemId}`}
                              accessibilityRole="checkbox"
                              accessibilityLabel={`${answer.text}, ${grade}`}
                              accessibilityState={{checked: answer.isChecked, disabled: !editable || saving}}
                              disabled={!editable || saving}
                              onPress={() => toggleAnswer(answer.checklistItemId)}
                              style={styles.checkTarget}>
                              <View style={[styles.checkbox, answer.isChecked && styles.checkboxChecked]}>
                                <Text style={styles.checkmark}>{answer.isChecked ? '✓' : ''}</Text>
                              </View>
                            </TouchableOpacity>
                          ) : <Text accessibilityLabel={answer.applicableGrades && !answer.applicableGrades.split(',').includes(grade) ? 'Unavailable grade in source checklist' : 'Separate checklist for this grade'} style={styles.otherGrade}>—</Text>}
                        </View>
                      ))}
                      <View style={styles.remarksCell}>
                        <TextInput
                          accessibilityLabel={`Remarks: ${answer.text}`}
                          testID={`remarks-${answer.checklistItemId}`}
                          editable={editable && !saving}
                          value={answer.remarks || ''}
                          multiline
                          maxLength={1000}
                          placeholder={editable ? 'Add remark' : '—'}
                          placeholderTextColor="#7c8289"
                          onChangeText={remarks => setAnswers(current => current.map(item =>
                            item.checklistItemId === answer.checklistItemId ? {...item, remarks} : item))}
                          style={styles.remarkInput}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
            {visibleAnswers.length === 0 ? <Text style={styles.emptyText}>No checklist items available for this inspection grade.</Text> : null}
          </View>
        </ScrollView>
        <Text style={styles.tableLegend}>D = Detailed · C = Close · V = Visual. A tick records a checked item. A dash in another grade points to its separate checklist. Grey cells are unavailable in the source.</Text>

        {!showSourcePreview && <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              Progress: {checkedCount} / {totalChecklistCount} checked
            </Text>
            <Text style={styles.progressPercent}>{progressPercent}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, {width: `${progressPercent}%`}]}
            />
          </View>
        </View>}

        <Field label="Comments">
          <TextInput
            editable={editable && !saving}
            multiline
            accessibilityLabel="Overall comments and remarks"
            maxLength={2000}
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
                    disabled={saving}
                    accessibilityLabel={`Remove photo ${photo.fileName}`}
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
                  disabled={!editable || saving}
                  accessibilityLabel={`Remove pending photo ${photo.fileName || photo.name || index + 1}`}
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
            accessibilityRole="button"
            disabled={saving}
            onPress={saveInspection}
            style={[styles.saveButton, saving && styles.buttonDisabled]}>
            {saving ? <ActivityIndicator color="#242d52" /> : null}
            <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Inspection'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.lockedNotice}>
            <Text style={styles.lockedText}>{showSourcePreview ? 'Reference preview only. Select Saved inspection to return to your recorded answers.' : 'This inspection is QC approved and locked.'}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function Field({label, children, inline}: {label: string; children: React.ReactNode; inline?: boolean}) {
  return (
    <View style={[styles.field, inline && styles.inlineField]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#f3f4f2'},
  content: {padding: 24, paddingBottom: 48, maxWidth: 1320, width: '100%', alignSelf: 'center'},
  backButton: {alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 8},
  backText: {color: '#344d53', fontWeight: '800', fontSize: 13},
  compactContent: {padding: 12, paddingBottom: 32},
  documentHeading: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18, borderTopWidth: 3, borderTopColor: '#344d53'},
  headingCopy: {flex: 1},
  eyebrow: {fontSize: 10, color: '#526269', fontWeight: '800', letterSpacing: 1.5, marginBottom: 6},
  title: {fontSize: 25, color: '#1d3035', fontWeight: '800'},
  subtitle: {fontSize: 12, color: '#59666a', marginTop: 6},
  progressBox: {alignItems: 'flex-end', paddingLeft: 12},
  progressValue: {fontSize: 23, color: '#244c47', fontWeight: '800'},
  progressLabel: {fontSize: 10, color: '#59666a', marginTop: 3},
  recordHeader: {backgroundColor: '#fff', borderTopWidth: 1, borderLeftWidth: 1, borderColor: '#aeb7b7'},
  recordTitleRow: {flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#e9eeeb', borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#aeb7b7', padding: 12, gap: 10, justifyContent: 'space-between'},
  recordTitle: {fontSize: 14, color: '#203d3b', fontWeight: '800', flexShrink: 1},
  status: {fontSize: 12, color: '#203d3b', fontWeight: '700'},
  metadataGrid: {flexDirection: 'row', flexWrap: 'wrap'},
  metadataCell: {width: '33.333333%', minHeight: 62, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#aeb7b7', paddingHorizontal: 12, paddingVertical: 10},
  metadataCellCompact: {width: '50%'},
  metadataLabel: {fontSize: 10, fontWeight: '700', color: '#617071', marginBottom: 4},
  metadataValue: {fontSize: 13, color: '#1f3034', lineHeight: 18},
  helperText: {fontSize: 12, color: '#627071', lineHeight: 18, marginVertical: 8},
  qcNotice: {marginTop: 14, borderLeftWidth: 3, borderLeftColor: '#ba4e3c', backgroundColor: '#fff4f1', padding: 14},
  qcTitle: {fontSize: 12, color: '#9b3d30', fontWeight: '800'},
  qcText: {fontSize: 12, color: '#5c4c49', lineHeight: 18, marginTop: 5},
  qcSeverity: {fontSize: 11, color: '#9b3d30', fontWeight: '700', marginTop: 7},
  formPanel: {marginTop: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd2d0', padding: 16},
  fieldRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 14},
  field: {marginBottom: 18},
  inlineField: {flexGrow: 1, flexBasis: 240},
  fieldLabel: {fontSize: 10, color: '#777d91', fontWeight: '800', textTransform: 'uppercase', marginBottom: 7},
  input: {minHeight: 42, borderWidth: 1, borderColor: '#d9ddea', borderRadius: 7, paddingHorizontal: 12, color: '#343851', backgroundColor: '#fff'},
  inputDisabled: {backgroundColor: '#f2f3f7', color: '#777d91'},
  commentsInput: {minHeight: 100, paddingTop: 12, textAlignVertical: 'top'},
  tabs: {flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e9f6', marginBottom: 8},
  tab: {minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, borderBottomWidth: 3, borderBottomColor: 'transparent'},
  tabActive: {borderBottomColor: '#315e50'},
  tabText: {fontSize: 12, color: '#838798', fontWeight: '800'},
  tabTextActive: {color: '#315e50'},
  sourceNotice: {padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#bccdc4', backgroundColor: '#f1f6f2'},
  sourceTitle: {fontSize: 13, fontWeight: '800', color: '#244c47'},
  sourceActions: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  sourceButton: {minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderColor: '#8ba99a', backgroundColor: '#fff', borderRadius: 4},
  sourceButtonText: {fontSize: 12, color: '#244c47', fontWeight: '700'},
  tableToolbar: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10},
  tableCount: {fontSize: 12, color: '#617071'},
  selectAllRow: {minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10},
  selectAllText: {fontSize: 12, color: '#24413f', fontWeight: '700'},
  tableScroll: {borderWidth: 1, borderColor: '#aeb7b7'},
  tableContainer: {flexGrow: 1},
  table: {minWidth: 940, flexGrow: 1},
  tableHeader: {flexDirection: 'row', backgroundColor: '#f1f3f0', alignItems: 'stretch', borderBottomWidth: 1, borderBottomColor: '#aeb7b7'},
  columnHeader: {fontSize: 12, fontWeight: '800', color: '#293e40', textAlignVertical: 'center'},
  numberCell: {width: 44, textAlign: 'center', paddingVertical: 12, borderRightWidth: 1, borderRightColor: '#c1c8c5'},
  questionCell: {width: 340, flexGrow: 1, padding: 12, justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#c1c8c5'},
  applicabilityCell: {width: 126, padding: 10, justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#c1c8c5'},
  gradesHeader: {width: 168},
  gradeTitle: {fontSize: 11, color: '#293e40', textAlign: 'center', fontWeight: '800', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#c1c8c5'},
  gradeLabels: {flexDirection: 'row'},
  gradeLabel: {width: 56, textAlign: 'center', paddingVertical: 8, borderRightWidth: 1, borderRightColor: '#c1c8c5', fontSize: 13, fontWeight: '800', color: '#596969'},
  activeGradeLabel: {color: '#244c47', backgroundColor: '#e0ebe6'},
  remarksCell: {width: 260, padding: 8, justifyContent: 'center'},
  sectionRow: {minHeight: 35, backgroundColor: '#e9eeeb', borderBottomWidth: 1, borderBottomColor: '#aeb7b7', paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12},
  sectionTitle: {fontSize: 12, fontWeight: '800', color: '#263e3b', letterSpacing: 0.6},
  sectionHint: {fontSize: 11, color: '#63736e'},
  tableRow: {minHeight: 65, flexDirection: 'row', alignItems: 'stretch', borderBottomWidth: 1, borderBottomColor: '#c1c8c5', backgroundColor: '#fff'},
  rowNumber: {fontSize: 12, color: '#53645f', textAlignVertical: 'center'},
  checkText: {fontSize: 13, color: '#293a3b', lineHeight: 19},
  unavailableGrade: {backgroundColor: '#d8dcda'},
  subCheckText: {fontSize: 11, color: '#566c62', lineHeight: 17, marginTop: 6},
  requiredText: {fontSize: 9, color: '#6c7975', marginTop: 5},
  cellText: {fontSize: 12, lineHeight: 18, color: '#4e625b'},
  gradeCell: {width: 56, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#c1c8c5'},
  checkTarget: {minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center'},
  previewCellText: {fontSize: 10, color: '#65736c', textAlign: 'center', padding: 4},
  otherGrade: {fontSize: 14, color: '#8b9690'},
  checkbox: {width: 23, height: 23, borderWidth: 1.5, borderColor: '#85998e', borderRadius: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff'},
  checkboxChecked: {borderColor: '#315e50', backgroundColor: '#315e50'},
  checkmark: {color: '#fff', fontSize: 15, fontWeight: '800'},
  remarkInput: {minHeight: 44, borderWidth: 1, borderColor: '#d7dfda', borderRadius: 3, padding: 8, fontSize: 12, lineHeight: 18, color: '#293a3b', textAlignVertical: 'top'},
  tableLegend: {fontSize: 11, lineHeight: 17, color: '#67756f', marginTop: 10, marginBottom: 20},
  emptyText: {fontSize: 13, color: '#67756f', padding: 18},
  progressSection: {marginBottom: 22},
  progressHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8},
  progressText: {fontSize: 12, color: '#4b5064', fontWeight: '800'},
  progressPercent: {fontSize: 12, color: '#566dbd', fontWeight: '900'},
  progressTrack: {height: 10, overflow: 'hidden', borderRadius: 5, backgroundColor: '#e8ebf4'},
  progressFill: {height: '100%', borderRadius: 5, backgroundColor: '#315e50'},
  photoSection: {marginTop: 2},
  photoGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14},
  photoTile: {width: 150, borderWidth: 1, borderColor: '#e1e4ef', borderRadius: 7, overflow: 'hidden', backgroundColor: '#fafbff'},
  photo: {width: '100%', height: 100},
  photoName: {fontSize: 10, color: '#656b80', paddingHorizontal: 8, paddingTop: 7},
  removePhoto: {minHeight: 30, justifyContent: 'center', paddingHorizontal: 8},
  removePhotoText: {fontSize: 10, color: '#ba4e3c', fontWeight: '800'},
  errorText: {fontSize: 12, color: '#ba4e3c', marginBottom: 12},
  saveButton: {alignSelf: 'flex-start', minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20, borderRadius: 7, backgroundColor: '#244c47'},
  saveText: {fontSize: 13, color: '#fff', fontWeight: '800'},
  buttonDisabled: {opacity: 0.6},
  lockedNotice: {backgroundColor: '#f2f3f7', padding: 14, borderRadius: 7},
  lockedText: {fontSize: 12, color: '#656b80', fontWeight: '700'},
  state: {flex: 1, minHeight: 400, backgroundColor: '#f3f4f2', alignItems: 'center', justifyContent: 'center', padding: 28},
  stateTitle: {fontSize: 17, color: '#242d52', fontWeight: '800'},
  stateText: {fontSize: 13, color: '#7d8192', textAlign: 'center', marginTop: 10},
  secondaryButton: {marginTop: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d9dce8', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 7},
  secondaryText: {fontSize: 12, color: '#424760', fontWeight: '800'},
});
