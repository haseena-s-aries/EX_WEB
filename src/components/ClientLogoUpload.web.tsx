import React, {useRef, useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {ClientLogoProps, validateClientLogo} from './clientLogo';
export default function ClientLogoUpload({value, onChange, disabled}: ClientLogoProps) {
  const input = useRef<any>(null); const [error, setError] = useState('');
  return <View style={{gap: 8}}>
    <Text style={{fontWeight: '700', color: '#5b6178'}}>Client Logo / Image</Text>
    {React.createElement('input', {ref: input, type: 'file', accept: '.jpg,.jpeg,.png', disabled, 'aria-label': 'Choose Client Logo', style: {display: 'none'}, onChange: (event: any) => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
      const message = validateClientLogo(file); setError(message);
      if (!message) onChange({name: file.name, type: file.type || (file.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'), webFile: file});
    }})}
    <TouchableOpacity disabled={disabled} onPress={() => input.current?.click()} style={{padding: 12, borderWidth: 1, borderColor: '#e5e9f6', borderRadius: 10}}><Text style={{color: '#718be8'}}>Choose Image</Text></TouchableOpacity>
    <Text style={{color: '#85899a', fontSize: 12}}>Optional — JPG, JPEG or PNG</Text>
    {value && <TouchableOpacity disabled={disabled} onPress={() => onChange(null)}><Text style={{color: '#ba4e3c'}}>Remove Image</Text></TouchableOpacity>}
    {value && <Text style={{color: '#5b6178'}}>Image selected</Text>}
    {!!error && <Text accessibilityRole="alert" style={{color: '#ba4e3c'}}>{error}</Text>}
  </View>;
}
