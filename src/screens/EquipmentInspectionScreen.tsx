import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import {getApiErrorMessage} from '../api/errors';
import {getSurveyorEquipmentDetails} from '../api/projects';
import CategoryInspectionEntryScreen from './CategoryInspectionEntryScreen';

type Props = {
  equipmentId: string;
  projectId?: string;
  areaId?: string;
  onModifyChecklist?: () => void;
  onLegacy?: () => void;
  onBack: () => void;
  onSaved: () => void;
};

/** Compatibility entry that always opens the supported project checkpoint inspection. */
export default function EquipmentInspectionScreen(props: Props) {
  const [context, setContext] = useState({projectId: props.projectId || '', areaId: props.areaId || ''});
  const [loading, setLoading] = useState(!props.projectId || !props.areaId);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (props.projectId && props.areaId) {
      setContext({projectId: props.projectId, areaId: props.areaId});
      setLoading(false);
      setError('');
      return () => {active = false;};
    }
    setLoading(true);
    getSurveyorEquipmentDetails(props.equipmentId).then(({data}) => {
      if (!active) return;
      setContext({projectId: props.projectId || data.projectId, areaId: props.areaId || data.areaId});
      setError('');
    }).catch(requestError => {
      if (active) setError(getApiErrorMessage(requestError, 'Could not locate this equipment in its assigned project.'));
    }).finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, [props.areaId, props.equipmentId, props.projectId]);

  if (loading) return <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12}}>
    <ActivityIndicator accessibilityLabel="Loading equipment inspection" />
    <Text>Opening Equipment Inspection…</Text>
  </View>;

  if (error || !context.projectId) return <View style={{flex: 1, padding: 24, justifyContent: 'center', gap: 12}}>
    <Text accessibilityRole="header" style={{fontSize: 22, fontWeight: '800'}}>Equipment Inspection unavailable</Text>
    <Text accessibilityRole="alert">{error || 'The project for this equipment could not be identified.'}</Text>
    <TouchableOpacity accessibilityRole="button" onPress={props.onBack} style={{alignSelf: 'flex-start', padding: 12, borderRadius: 8, backgroundColor: '#00D9EE'}}>
      <Text style={{fontWeight: '800', color: '#061522'}}>Back to equipment</Text>
    </TouchableOpacity>
  </View>;

  return <CategoryInspectionEntryScreen project={context.projectId} item={props.equipmentId} areaId={context.areaId || undefined}
    onBack={props.onBack} onSaved={props.onSaved} onLegacy={props.onLegacy} onModifyChecklist={props.onModifyChecklist} />;
}
