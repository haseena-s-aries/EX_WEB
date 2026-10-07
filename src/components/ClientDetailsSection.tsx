import React from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';
import ClientLogoUpload from './ClientLogoUpload';
import AuthenticatedImage from './AuthenticatedImage';
import {ClientLogoFile} from './clientLogo';
export default function ClientDetailsSection({name, onNameChange, logo, onLogoChange, existingPath, removeExisting, onRemoveExisting, inputStyle, disabled}: {
  name: string; onNameChange?: (name: string) => void; logo?: ClientLogoFile | null; onLogoChange?: (file: ClientLogoFile | null) => void;
  existingPath?: string | null; removeExisting?: boolean; onRemoveExisting?: () => void; inputStyle?: any; disabled?: boolean;
}) {
  return <View style={{gap: 12, marginBottom: 16}}><Text style={{fontSize: 12.5, fontWeight: '700', color: '#5b6178'}}>Client Name (Optional)</Text>
    {onNameChange ? <TextInput accessibilityLabel="Client Name" style={inputStyle} value={name} onChangeText={text => onNameChange(text.toUpperCase())} autoCapitalize="characters" placeholder="Enter client name" maxLength={200} /> : <Text style={{color: '#242d52'}}>{name || '-'}</Text>}
    {!!existingPath && !removeExisting && !logo && <AuthenticatedImage path={existingPath} resizeMode="contain" style={{width: 180, height: 90}} />}
    {onLogoChange && <ClientLogoUpload value={logo || null} onChange={onLogoChange} disabled={disabled} />}
    {!!existingPath && !logo && onRemoveExisting && <TouchableOpacity disabled={disabled} onPress={onRemoveExisting}><Text style={{color: '#ba4e3c'}}>{removeExisting ? 'Undo Remove Image' : 'Remove Image'}</Text></TouchableOpacity>}
  </View>;
}
