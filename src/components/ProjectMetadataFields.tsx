import React from 'react';
import {Text, TextInput, View} from 'react-native';
export type ProjectMetadata = {uidNumber: string; documentNumber: string; revision: string; description: string; clientName: string};
export const emptyProjectMetadata = (): ProjectMetadata => ({uidNumber: '', documentNumber: '', revision: '', description: '', clientName: ''});
export default function ProjectMetadataFields({value, onChange, inputStyle, columns = false}: {value: ProjectMetadata; onChange?: (value: ProjectMetadata) => void; inputStyle?: any; columns?: boolean}) {
  return <View style={[{gap: 12, marginBottom: 16}, columns && {gap: 14, flexDirection: 'row', flexWrap: 'wrap'}]}>{(['uidNumber', 'documentNumber', 'revision', 'description'] as const).map(key => {
    const label = {uidNumber: 'UID Number', documentNumber: 'Document Number', revision: 'Revision', description: 'Description'}[key];
    return <View key={key} style={columns ? {flexGrow: 1, flexBasis: key === 'description' ? '100%' : '30%', minWidth: 0} : undefined}><Text style={{fontSize: 12.5, fontWeight: '700', color: '#5b6178', marginBottom: 7}}>{label}</Text>
      {onChange ? <TextInput accessibilityLabel={label} style={[inputStyle, key === 'description' && {minHeight: 80, textAlignVertical: 'top'}]} value={value[key]} onChangeText={text => onChange({...value, [key]: text.toUpperCase()})} autoCapitalize="characters" multiline={key === 'description'} maxLength={key === 'description' ? 4000 : key === 'documentNumber' ? 200 : 100} /> : <Text style={{color: '#242d52'}}>{value[key] || '-'}</Text>}
    </View>;
  })}</View>;
}
