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
  AreaEquipment,
  getSurveyorArea,
  getProjectAreaPhotos,
  SurveyorAreaDetails,
} from '../api/projects';
import AuthenticatedImage from '../components/AuthenticatedImage';

type Props = {
  projectId: string;
  areaId: string;
  onBack: () => void;
};

export default function SurveyorAreaDetailsScreen({
  projectId,
  areaId,
  onBack,
}: Props) {
  const [area, setArea] = useState<SurveyorAreaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadArea = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [response, photosResponse] = await Promise.all([
        getSurveyorArea(projectId, areaId),
        getProjectAreaPhotos(projectId, areaId).catch(() => null),
      ]);
      const firstPhoto = photosResponse?.data?.[0];
      setArea({
        ...response.data,
        layoutImagePath:
          response.data.layoutImagePath || firstPhoto?.downloadUrl || firstPhoto?.filePath,
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

  if (loading) {
    return (
      <View style={styles.fullState}>
        <ActivityIndicator color="#3f47d6" size="large" />
        <Text style={styles.stateMessage}>Loading area layout...</Text>
      </View>
    );
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>&lt; Back to project</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>AREA DETAILS</Text>
          <Text style={styles.title}>{area.areaName}</Text>
          <Text style={styles.subtitle}>{area.equipment.length} equipment items</Text>
        </View>
      </View>

      <View style={styles.layoutCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Area Layout</Text>
          <Text style={styles.cardHint}>Pins use the saved equipment coordinates.</Text>
        </View>
        <View style={styles.layoutCanvas}>
          <AuthenticatedImage path={area.layoutImagePath} style={styles.layoutImage} />
          {area.equipment.map((equipment, index) => (
            <View
              key={equipment.id}
              accessibilityLabel={`${equipment.tagNumber} equipment pin`}
              style={[
                styles.pin,
                {
                  left: `${Math.max(0, Math.min(100, equipment.xPercent))}%` as any,
                  top: `${Math.max(0, Math.min(100, equipment.yPercent))}%` as any,
                },
              ]}>
              <Text style={styles.pinText}>{index + 1}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Equipment</Text>
        <Text style={styles.sectionCount}>{area.equipment.length} total</Text>
      </View>

      {area.equipment.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.stateTitle}>No equipment added</Text>
          <Text style={styles.stateMessage}>Equipment pins will appear here when available.</Text>
        </View>
      ) : (
        <View style={styles.equipmentList}>
          {area.equipment.map((equipment, index) => (
            <EquipmentCard equipment={equipment} index={index + 1} key={equipment.id} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function EquipmentCard({
  equipment,
  index,
}: {
  equipment: AreaEquipment;
  index: number;
}) {
  return (
    <View style={styles.equipmentCard}>
      <View style={styles.equipmentIndex}>
        <Text style={styles.equipmentIndexText}>{index}</Text>
      </View>
      <View style={styles.equipmentContent}>
        <View style={styles.equipmentTop}>
          <Text style={styles.equipmentTag}>{equipment.tagNumber}</Text>
          <Text style={styles.equipmentType}>{equipment.type}</Text>
        </View>
        <View style={styles.equipmentGrid}>
          <EquipmentValue label="Code" value={equipment.equipmentCode} />
          <EquipmentValue label="Location" value={equipment.location} />
          <EquipmentValue label="Manufacturer" value={equipment.manufacturer} />
          <EquipmentValue label="Certificate" value={equipment.certificateNumber} />
        </View>
      </View>
    </View>
  );
}

function EquipmentValue({label, value}: {label: string; value?: string | null}) {
  return (
    <View style={styles.equipmentValue}>
      <Text style={styles.valueLabel}>{label}</Text>
      <Text style={styles.valueText}>{value || 'Not set'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#f4f6fb'},
  content: {padding: 24, paddingBottom: 48, maxWidth: 1180, width: '100%', alignSelf: 'center'},
  backButton: {alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 8},
  backText: {fontSize: 13, color: '#3f47d6', fontWeight: '800'},
  header: {minHeight: 125, backgroundColor: '#20255f', borderRadius: 8, padding: 23, justifyContent: 'center'},
  eyebrow: {fontSize: 10, color: '#afb5ff', fontWeight: '800'},
  title: {fontSize: 24, color: '#fff', fontWeight: '800', marginTop: 7},
  subtitle: {fontSize: 12, color: '#d0d4e9', marginTop: 7},
  layoutCard: {marginTop: 16, padding: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e3e6ee', borderRadius: 8},
  cardHeader: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14},
  cardTitle: {fontSize: 16, fontWeight: '800', color: '#25294f'},
  cardHint: {fontSize: 11, color: '#898d9e'},
  layoutCanvas: {position: 'relative', width: '100%', aspectRatio: 16 / 9, maxHeight: 560, minHeight: 230, overflow: 'hidden', borderRadius: 6, backgroundColor: '#eef0f6'},
  layoutImage: {width: '100%', height: '100%'},
  pin: {position: 'absolute', width: 26, height: 26, marginLeft: -13, marginTop: -13, borderRadius: 13, backgroundColor: '#e63f4f', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center'},
  pinText: {fontSize: 10, color: '#fff', fontWeight: '800'},
  sectionHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 27, marginBottom: 12},
  sectionTitle: {fontSize: 18, color: '#1f2349', fontWeight: '800'},
  sectionCount: {fontSize: 12, color: '#73788c', fontWeight: '700'},
  equipmentList: {gap: 10},
  equipmentCard: {flexDirection: 'row', gap: 13, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e3e6ee', borderRadius: 8, padding: 16},
  equipmentIndex: {width: 31, height: 31, borderRadius: 16, backgroundColor: '#e63f4f', alignItems: 'center', justifyContent: 'center'},
  equipmentIndexText: {fontSize: 11, color: '#fff', fontWeight: '800'},
  equipmentContent: {flex: 1, minWidth: 0},
  equipmentTop: {flexDirection: 'row', flexWrap: 'wrap', gap: 9, alignItems: 'center'},
  equipmentTag: {fontSize: 15, color: '#292d4e', fontWeight: '800'},
  equipmentType: {fontSize: 10, color: '#3f47d6', fontWeight: '800', backgroundColor: '#ebedff', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 4},
  equipmentGrid: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 13, rowGap: 12},
  equipmentValue: {width: '25%', minWidth: 130, paddingRight: 12},
  valueLabel: {fontSize: 9, color: '#9599a9', fontWeight: '800', textTransform: 'uppercase'},
  valueText: {fontSize: 12, color: '#494d63', fontWeight: '600', marginTop: 4},
  emptyState: {minHeight: 160, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e3e6ee', borderRadius: 8, alignItems: 'center', justifyContent: 'center', padding: 24},
  fullState: {flex: 1, minHeight: 400, backgroundColor: '#f4f6fb', alignItems: 'center', justifyContent: 'center', padding: 28},
  stateTitle: {fontSize: 17, color: '#292d50', fontWeight: '800'},
  stateMessage: {fontSize: 13, color: '#7d8192', lineHeight: 19, textAlign: 'center', marginTop: 10},
  stateActions: {flexDirection: 'row', gap: 10, marginTop: 18},
  primaryButton: {backgroundColor: '#3f47d6', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 7},
  primaryButtonText: {fontSize: 12, color: '#fff', fontWeight: '800'},
  secondaryButton: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#d9dce8', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 7},
  secondaryButtonText: {fontSize: 12, color: '#424760', fontWeight: '800'},
});
