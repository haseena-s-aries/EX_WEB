import {useDashboardPresentation} from './DashboardPresentation';
import React, {useState} from 'react';
import {Image, Text, TouchableOpacity, View} from 'react-native';
import {pick, types, isErrorWithCode, errorCodes} from '@react-native-documents/picker';
import {ClientLogoProps, validateClientLogo} from './clientLogo';
export default function ClientLogoUpload({value, onChange, disabled, label = 'Client Company Logo'}: ClientLogoProps) {
  const {c} = useDashboardPresentation();
  const [error, setError] = useState('');
  const choose = async () => {try {
    const [file] = await pick({type: [types.images], mode: 'import'}); const message = validateClientLogo(file); setError(message);
    if (!message) onChange({name: file.name!, type: file.type || (file.name!.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'), uri: file.uri});
  } catch (err) {if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return; setError('Could not choose the image. Please try again.');}};
  return <View style={{gap: 8}}><Text testID="project-form-label" style={{fontWeight: '700', color: c.secondary}}>{label}</Text>
    <TouchableOpacity disabled={disabled} onPress={choose} style={{padding: 12, borderWidth: 1, borderColor: c.border, borderRadius: 10}}><Text style={{color: c.cyan}}>Choose Image</Text></TouchableOpacity>
    <Text style={{color: c.secondary, fontSize: 12}}>Optional — JPG, JPEG or PNG</Text>
    {value && <TouchableOpacity disabled={disabled} onPress={() => onChange(null)}><Text style={{color: c.critical}}>Remove Image</Text></TouchableOpacity>}
    {!!value?.uri && <Image accessibilityLabel={`${label} preview`} source={{uri: value.uri}} resizeMode="contain" style={{width: 180, height: 100}} />}
    {value && <Text style={{color: c.secondary}}>Image selected</Text>}
    {!!error && <Text accessibilityRole="alert" style={{color: c.critical}}>{error}</Text>}
  </View>;
}
