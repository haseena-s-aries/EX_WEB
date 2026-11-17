import React from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';
import ClientLogoUpload from './ClientLogoUpload';
import {useDashboardPresentation} from './DashboardPresentation';
import AuthenticatedImage from './AuthenticatedImage';
import {ClientLogoFile} from './clientLogo';
export default function ClientDetailsSection({name, onNameChange, logo, onLogoChange, existingPath, removeExisting, onRemoveExisting, inputStyle, disabled, required = false, preserveCase = false}: {
  name: string; onNameChange?: (name: string) => void; logo?: ClientLogoFile | null; onLogoChange?: (file: ClientLogoFile | null) => void;
  existingPath?: string | null; removeExisting?: boolean; onRemoveExisting?: () => void; inputStyle?: any; disabled?: boolean; required?: boolean; preserveCase?: boolean;
}) {
  const {c} = useDashboardPresentation();
  return <View style={{gap: 12, marginBottom: 16}}><Text testID="project-form-label" style={{fontSize: 12.5, fontWeight: '700', color: c.secondary, textTransform: 'uppercase'}}>Client Company Name{required && <Text style={{color: c.critical}}> *</Text>}</Text>
    {onNameChange ? <TextInput accessibilityLabel="Client Company Name" editable={!disabled} accessibilityState={{disabled}} style={inputStyle} value={name} onChangeText={text => onNameChange(preserveCase ? text : text.toUpperCase())} autoCapitalize={preserveCase ? "none" : "characters"} placeholder="Enter Client Company Name / Details" placeholderTextColor={c.muted} maxLength={200} /> : <Text style={{color: c.text}}>{name || '-'}</Text>}
    {!!existingPath && !removeExisting && !logo && <AuthenticatedImage path={existingPath} resizeMode="contain" style={{width: 180, height: 90}} />}
    {onLogoChange && <ClientLogoUpload value={logo || null} onChange={onLogoChange} disabled={disabled} />}
    {!!existingPath && !logo && onRemoveExisting && <TouchableOpacity disabled={disabled} onPress={onRemoveExisting}><Text style={{color: '#ba4e3c'}}>{removeExisting ? 'Undo Remove Image' : 'Remove Image'}</Text></TouchableOpacity>}
  </View>;
}
