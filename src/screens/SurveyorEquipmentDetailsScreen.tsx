import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {getApiErrorMessage} from '../api/errors';
import {
  getSurveyorEquipmentDetails,
  SurveyorEquipmentDetails,
} from '../api/projects';
import {useThemeMode} from '../theme/useThemeMode';
import {OPERATIONS_DARK} from '../theme/operationsPalette';
import {LIGHT} from '../theme/palette';

type Props = {
  projectId: string;
  areaId: string;
  equipmentId: string;
  onBack: () => void;
  onInspect: () => void;
  onStartActivity?: () => void;
  refreshVersion?: number;
  userRole?: string;
};

const statusLabel = (status: string) => status
  .replace('Qc', 'QC ')
  .replace(/([a-z])([A-Z])/g, '$1 $2');

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not set' : `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

export default function SurveyorEquipmentDetailsScreen({
  projectId,
  areaId,
  equipmentId,
  onBack,
  onInspect,
  onStartActivity,
  refreshVersion,
  userRole,
}: Props) {
  const dark = useThemeMode() === 'dark';
  const colors = dark ? OPERATIONS_DARK : LIGHT;
  const styles = dark ? darkStyles : lightStyles;
  const {width} = useWindowDimensions();
  const compact = width < 620;
  const detailWidth = compact ? '100%' : width >= 1180 ? '33.333%' : '50%';
  const [equipment, setEquipment] = useState<SurveyorEquipmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEquipment = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getSurveyorEquipmentDetails(equipmentId);
      setEquipment(response.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not load equipment details.'));
    } finally {
      setLoading(false);
    }
  }, [equipmentId]);

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment, refreshVersion]);

  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={colors.cyan} size="large" />
        <Text style={styles.stateText}>Loading equipment...</Text>
      </View>
    );
  }

  if (!equipment || error) {
    return (
      <View style={styles.state}>
        <Text style={styles.stateTitle}>Equipment unavailable</Text>
        <Text style={styles.stateText}>{error}</Text>
        <View style={styles.stateActions}>
          <TouchableOpacity onPress={onBack} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={loadEquipment} style={styles.primaryButton}>
            <Text style={styles.primaryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const actionLabel = equipment.inspectionStatus === 'NotStarted'
    ? 'Start Inspection'
    : equipment.inspectionStatus === 'QcApproved'
      ? 'View Inspection'
      : equipment.inspectionStatus === 'Completed' || equipment.inspectionStatus === 'PendingQcReview'
        ? 'View Inspection'
        : 'Continue Inspection';

  return (
    <ScrollView nativeID="ex-equipment-details" style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity accessibilityRole="button" onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>← Back to area</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Image accessible={false} source={require('../assets/landing/industry-3.jpg')} resizeMode="cover" style={styles.heroPhoto} />
        <View pointerEvents="none" nativeID="ex-operations-hero-overlay" style={StyleSheet.absoluteFill} />
        <View style={styles.heroRow}>
          <View style={styles.sequenceBox}><Text style={styles.sequence}>{equipment.markingNo ?? equipment.sequenceNo}</Text></View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>EQUIPMENT DETAILS</Text>
            <Text accessibilityRole="header" style={styles.title}>{equipment.tagNumber}</Text>
            <Text style={styles.subtitle}>{[equipment.type, equipment.areaName].filter(Boolean).join(' · ')}</Text>
          </View>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{statusLabel(equipment.inspectionStatus)}</Text>
        </View>
      </View>

      <View testID="equipment-detail-panel" style={styles.detailsPanel}>
        <Text accessibilityRole="header" style={styles.panelTitle}>Equipment Information</Text>
        <View style={styles.detailsGrid}>
          {([
            ['Area Marking No', String(equipment.markingNo ?? equipment.sequenceNo)],
            ['HAER Sl. No', String(equipment.sequenceNo)],
            ['Tag Number', equipment.tagNumber],
            ['Equipment ID', equipment.equipmentId],
            ['RFID Tag UID', equipment.rfidTagUid],
            ['Type', equipment.type],
            ['Circuit ID', equipment.circuitId],
            ['Location', equipment.location],
            ['Manufacturer', equipment.manufacturer],
            ['Protection Details', equipment.protectionDetails],
            ['Certificate Number', equipment.certificateNumber],
            ['Area Name', equipment.areaName],
            ['Created Date', formatDate(equipment.createdAt)],
            ['Inspection Status', statusLabel(equipment.inspectionStatus)],
          ] as const).map(([label, value]) => (
            <View key={label} style={[styles.detailItem, {width: detailWidth}]}>
              <Text style={styles.detailLabel}>{label}</Text>
              <Text style={styles.detailValue}>{value || 'Not set'}</Text>
            </View>
          ))}
        </View>
      </View>

      <View testID="equipment-detail-panel" style={styles.detailsPanel}>
        <Text accessibilityRole="header" style={styles.panelTitle}>Inspection</Text>
        {equipment.qcComments ? (
          <View style={styles.qcNotice}>
            <Text style={styles.qcNoticeTitle}>QC requested changes</Text>
            <Text style={styles.qcNoticeText}>{equipment.qcComments}</Text>
            {equipment.qcSeverity ? (
              <Text style={styles.qcSeverity}>Severity: {equipment.qcSeverity}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.inspectionActions}>
          <TouchableOpacity accessibilityRole="button" onPress={onInspect} style={styles.primaryButton}>
            <Text style={styles.primaryText}>{actionLabel}</Text>
          </TouchableOpacity>
          {onStartActivity && <TouchableOpacity accessibilityRole="button" onPress={onStartActivity} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Inspection history / new repeat</Text>
          </TouchableOpacity>}
        </View>
      </View>
    </ScrollView>
  );
}

function createStyles(dark: boolean) {
  const c = dark ? OPERATIONS_DARK : LIGHT;
  return StyleSheet.create({
    screen: {flex: 1, backgroundColor: c.bg},
    content: {padding: 16, paddingBottom: 48, gap: 14, maxWidth: 1600, width: '100%', alignSelf: 'center'},
    backButton: {alignSelf: 'flex-start', justifyContent: 'center', minHeight: 40},
    backText: {color: dark ? c.cyan : c.indigo, fontWeight: '800', fontSize: 14},
    header: {minHeight: 150, backgroundColor: '#052337', borderWidth: 1, borderColor: '#158ba3', borderRadius: 16, padding: 20, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, overflow: 'hidden'},
    heroPhoto: {position: 'absolute', right: 0, width: '72%', height: '100%', opacity: Platform.OS === 'web' ? 1 : 0.28},
    heroRow: {flexDirection: 'row', flexGrow: 1, flexShrink: 1, alignItems: 'center', gap: 14, minWidth: 210},
    sequenceBox: {minWidth: 48, paddingHorizontal: 8, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#74edf5'},
    sequence: {fontSize: 20, color: '#092331', fontWeight: '900'},
    headerCopy: {flex: 1},
    eyebrow: {fontSize: 11, color: '#64edf7', fontWeight: '800', letterSpacing: 1.4},
    title: {fontSize: 32, color: '#fff', fontWeight: '900', marginTop: 3},
    subtitle: {fontSize: 14, color: '#e0f1fa', marginTop: 4},
    statusBadge: {backgroundColor: '#0a3148', borderWidth: 1, borderColor: '#4bc8de', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7},
    statusText: {fontSize: 12, color: '#c5f9ff', fontWeight: '800'},
    detailsPanel: {backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 15, padding: 18, gap: 12},
    panelTitle: {fontSize: 20, color: c.text, fontWeight: '800'},
    detailsGrid: {flexDirection: 'row', flexWrap: 'wrap'},
    detailItem: {paddingVertical: 11, paddingRight: 14, borderTopWidth: 1, borderTopColor: c.border},
    detailLabel: {fontSize: 11, color: c.secondary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4},
    detailValue: {fontSize: 15, color: c.text, fontWeight: '700', marginTop: 4},
    qcNotice: {borderLeftWidth: 3, borderLeftColor: c.critical, backgroundColor: dark ? '#392335' : '#fff4f1', borderRadius: 6, padding: 14},
    qcNoticeTitle: {fontSize: 14, color: c.critical, fontWeight: '800'},
    qcNoticeText: {fontSize: 14, color: c.text, lineHeight: 20, marginTop: 5},
    qcSeverity: {fontSize: 12, color: c.critical, fontWeight: '700', marginTop: 7},
    inspectionActions: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
    state: {flex: 1, minHeight: 350, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 24},
    stateTitle: {fontSize: 20, color: c.text, fontWeight: '800'},
    stateText: {fontSize: 14, color: c.secondary, textAlign: 'center', marginTop: 10},
    stateActions: {flexDirection: 'row', gap: 10, marginTop: 18},
    primaryButton: {minHeight: 44, justifyContent: 'center', backgroundColor: '#58e7f2', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 9},
    primaryText: {fontSize: 14, color: '#092331', fontWeight: '800'},
    secondaryButton: {minHeight: 44, justifyContent: 'center', backgroundColor: c.elevated, borderWidth: 1, borderColor: c.borderActive, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 9},
    secondaryText: {fontSize: 14, color: c.text, fontWeight: '800'},
  });
}

const darkStyles = createStyles(true);
const lightStyles = createStyles(false);
