import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {getApiErrorMessage} from '../api/errors';
import {
  getSurveyorEquipmentDetails,
  SurveyorEquipmentDetails,
} from '../api/projects';

type Props = {
  projectId: string;
  areaId: string;
  equipmentId: string;
  onBack: () => void;
  onInspect: () => void;
  refreshVersion?: number;
};

const statusLabel = (status: string) => status
  .replace('Qc', 'QC ')
  .replace(/([a-z])([A-Z])/g, '$1 $2');

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not set' : `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

export default function SurveyorEquipmentDetailsScreen({
  equipmentId,
  onBack,
  onInspect,
  refreshVersion,
}: Props) {
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
        <ActivityIndicator color="#8fa7f8" size="large" />
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
      : equipment.inspectionStatus === 'Completed'
        ? 'View Inspection'
        : 'Continue Inspection';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>&lt; Back to area</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.sequenceBox}>
          <Text style={styles.sequence}>{equipment.sequenceNo}</Text>
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>EQUIPMENT DETAILS</Text>
          <Text style={styles.title}>{equipment.tagNumber}</Text>
          <Text style={styles.subtitle}>{equipment.type} | {equipment.areaName}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{statusLabel(equipment.inspectionStatus)}</Text>
        </View>
      </View>

      <View style={styles.detailsPanel}>
        <Text style={styles.panelTitle}>Equipment Information</Text>
        <View style={styles.detailsGrid}>
          <Detail label="Sequence No" value={String(equipment.sequenceNo)} />
          <Detail label="Tag Number" value={equipment.tagNumber} />
          <Detail label="Equipment ID" value={equipment.equipmentId} />
          <Detail label="Type" value={equipment.type} />
          <Detail label="Circuit ID" value={equipment.circuitId} />
          <Detail label="Location" value={equipment.location} />
          <Detail label="Manufacturer" value={equipment.manufacturer} />
          <Detail label="Protection Details" value={equipment.protectionDetails} />
          <Detail label="Certificate Number" value={equipment.certificateNumber} />
          <Detail label="Area Name" value={equipment.areaName} />
          <Detail label="Created Date" value={formatDate(equipment.createdAt)} />
          <Detail label="Inspection Status" value={statusLabel(equipment.inspectionStatus)} />
        </View>

        {equipment.qcComments ? (
          <View style={styles.qcNotice}>
            <Text style={styles.qcNoticeTitle}>QC requested changes</Text>
            <Text style={styles.qcNoticeText}>{equipment.qcComments}</Text>
            {equipment.qcSeverity ? (
              <Text style={styles.qcSeverity}>Severity: {equipment.qcSeverity}</Text>
            ) : null}
          </View>
        ) : null}

        <TouchableOpacity onPress={onInspect} style={styles.inspectButton}>
          <Text style={styles.inspectButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Detail({label, value}: {label: string; value?: string | null}) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'Not set'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#f7f9ff'},
  content: {padding: 24, paddingBottom: 48, maxWidth: 1050, width: '100%', alignSelf: 'center'},
  backButton: {alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 8},
  backText: {color: '#8fa7f8', fontWeight: '800', fontSize: 13},
  header: {minHeight: 140, backgroundColor: '#242d52', borderRadius: 8, padding: 22, flexDirection: 'row', alignItems: 'center', gap: 16},
  sequenceBox: {width: 54, height: 54, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#b8a5f8'},
  sequence: {fontSize: 22, color: '#242d52', fontWeight: '900'},
  headerCopy: {flex: 1},
  eyebrow: {fontSize: 10, color: '#b8a5f8', fontWeight: '800'},
  title: {fontSize: 25, color: '#fff', fontWeight: '800', marginTop: 5},
  subtitle: {fontSize: 12, color: '#dfe6ff', marginTop: 6},
  statusBadge: {backgroundColor: '#f0eeff', borderRadius: 14, paddingHorizontal: 11, paddingVertical: 7},
  statusText: {fontSize: 11, color: '#566dbd', fontWeight: '800'},
  detailsPanel: {marginTop: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e9f6', borderRadius: 8, padding: 22},
  panelTitle: {fontSize: 16, color: '#242d52', fontWeight: '800', marginBottom: 18},
  detailsGrid: {flexDirection: 'row', flexWrap: 'wrap', rowGap: 20},
  detailItem: {width: '50%', minWidth: 170, paddingRight: 16},
  detailLabel: {fontSize: 10, color: '#9296a6', fontWeight: '800', textTransform: 'uppercase'},
  detailValue: {fontSize: 13, color: '#343851', fontWeight: '700', marginTop: 5},
  qcNotice: {marginTop: 22, borderLeftWidth: 3, borderLeftColor: '#ba4e3c', backgroundColor: '#fff4f1', padding: 14},
  qcNoticeTitle: {fontSize: 12, color: '#9b3d30', fontWeight: '800'},
  qcNoticeText: {fontSize: 12, color: '#5c4c49', lineHeight: 18, marginTop: 5},
  qcSeverity: {fontSize: 11, color: '#9b3d30', fontWeight: '700', marginTop: 7},
  inspectButton: {alignSelf: 'flex-start', minHeight: 44, marginTop: 22, paddingHorizontal: 20, borderRadius: 7, backgroundColor: '#b8a5f8', alignItems: 'center', justifyContent: 'center'},
  inspectButtonText: {fontSize: 13, color: '#242d52', fontWeight: '800'},
  state: {flex: 1, minHeight: 400, backgroundColor: '#f7f9ff', alignItems: 'center', justifyContent: 'center', padding: 28},
  stateTitle: {fontSize: 17, color: '#242d52', fontWeight: '800'},
  stateText: {fontSize: 13, color: '#7d8192', textAlign: 'center', marginTop: 10},
  stateActions: {flexDirection: 'row', gap: 10, marginTop: 18},
  primaryButton: {backgroundColor: '#b8a5f8', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 7},
  primaryText: {fontSize: 12, color: '#242d52', fontWeight: '800'},
  secondaryButton: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#d9dce8', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 7},
  secondaryText: {fontSize: 12, color: '#424760', fontWeight: '800'},
});
