import React, {useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {pick, types, isErrorWithCode, errorCodes} from '@react-native-documents/picker';
import {ClientLogoProps, validateClientLogo} from './clientLogo';
export default function ClientLogoUpload({value, onChange, disabled}: ClientLogoProps) {
  const [error, setError] = useState('');
  const choose = async () => {try {
    const [file] = await pick({type: [types.images], mode: 'import'}); const message = validateClientLogo(file); setError(message);
    if (!message) onChange({name: file.name!, type: file.type || (file.name!.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'), uri: file.uri});
  } catch (err) {if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return; setError('Could not choose the image. Please try again.');}};
  return <View style={{gap: 8}}><Text style={{fontWeight: '700', color: '#5b6178'}}>Client Logo / Image</Text>
    <TouchableOpacity disabled={disabled} onPress={choose} style={{padding: 12, borderWidth: 1, borderColor: '#e5e9f6', borderRadius: 10}}><Text style={{color: '#718be8'}}>Choose Image</Text></TouchableOpacity>
    <Text style={{color: '#85899a', fontSize: 12}}>Optional — JPG, JPEG or PNG</Text>
    {value && <TouchableOpacity disabled={disabled} onPress={() => onChange(null)}><Text style={{color: '#ba4e3c'}}>Remove Image</Text></TouchableOpacity>}
    {value && <Text style={{color: '#5b6178'}}>Image selected</Text>}
    {!!error && <Text accessibilityRole="alert" style={{color: '#ba4e3c'}}>{error}</Text>}
  </View>;
}
