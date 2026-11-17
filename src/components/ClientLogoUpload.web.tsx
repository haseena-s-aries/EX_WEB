import {useDashboardPresentation} from './DashboardPresentation';
import React, {useEffect, useRef, useState} from 'react';
import {Image, Text, TouchableOpacity, View} from 'react-native';
import {ClientLogoProps, validateClientLogo} from './clientLogo';
export default function ClientLogoUpload({value, onChange, disabled, label = 'Client Company Logo'}: ClientLogoProps) {
  const {c} = useDashboardPresentation();
  const input = useRef<any>(null); const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  useEffect(() => {if (!value?.webFile || typeof URL.createObjectURL !== 'function') {setPreview(''); return;} const url = URL.createObjectURL(value.webFile); setPreview(url); return () => URL.revokeObjectURL(url);}, [value]);
  return <View style={{gap: 8}}>
    <Text testID="project-form-label" style={{fontWeight: '700', color: c.secondary}}>{label}</Text>
    {React.createElement('input', {ref: input, type: 'file', accept: '.jpg,.jpeg,.png', disabled, 'aria-label': `Choose ${label}`, style: {display: 'none'}, onChange: (event: any) => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
      const message = validateClientLogo(file); setError(message);
      if (!message) onChange({name: file.name, type: file.type || (file.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'), webFile: file});
    }})}
    <TouchableOpacity testID="project-upload-button" accessibilityRole="button" disabled={disabled} onPress={() => input.current?.click()} style={{padding: 12, borderWidth: 1, borderColor: c.border, borderRadius: 10}}><Text style={{color: c.cyan}}>Choose Image</Text></TouchableOpacity>
    <Text style={{color: c.secondary, fontSize: 12}}>Optional — JPG, JPEG or PNG</Text>
    {value && <TouchableOpacity disabled={disabled} onPress={() => onChange(null)}><Text style={{color: c.critical}}>Remove Image</Text></TouchableOpacity>}
    {!!preview && <Image accessibilityLabel={`${label} preview`} source={{uri: preview}} resizeMode="contain" style={{width: 180, height: 100}} />}
    {value && <Text style={{color: c.secondary}}>Image selected</Text>}
    {!!error && <Text accessibilityRole="alert" style={{color: c.critical}}>{error}</Text>}
  </View>;
}
