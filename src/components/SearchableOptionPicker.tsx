import React, {useState} from 'react';
import {ScrollView, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {OPERATIONS_DARK} from '../theme/operationsPalette';
import {LIGHT} from '../theme/palette';
import {equipmentOptionKey} from '../equipment/equipmentOptions';

type Option = {label: string; value: string};

export default function SearchableOptionPicker({label, value, options, onChange, placeholder, customLabel, disabled, dark}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder: string;
  customLabel?: string;
  disabled?: boolean;
  dark?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const c = dark ? OPERATIONS_DARK : LIGHT;
  const cleaned = query.trim().replace(/\s+/g, ' ');
  const searchKey = equipmentOptionKey(cleaned);
  const matches = options.filter(option => equipmentOptionKey(option.label).includes(searchKey));
  const canAdd = customLabel && cleaned && !options.some(option => equipmentOptionKey(option.label) === searchKey);
  const choose = (next: string) => {
    onChange(next);
    setExpanded(false);
  };
  const control = {borderWidth: 1, borderColor: c.border, backgroundColor: c.card, borderRadius: 8, padding: 10, minHeight: 44};

  return <View style={{gap: 5}}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{expanded, disabled}}
      disabled={disabled} onPress={() => {setQuery(''); setExpanded(!expanded);}} style={control}>
      <Text style={{color: c.text}}>{(value && options.find(option => option.value === value)?.label) || value || placeholder} ▾</Text>
    </TouchableOpacity>
    {expanded && <View style={control}>
      <TextInput accessibilityLabel={`Search ${label}`} placeholder="Search options" placeholderTextColor={c.muted}
        value={query} onChangeText={setQuery} maxLength={customLabel ? 100 : undefined}
        editable={!disabled} style={[control, {color: c.text}]} />
      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{maxHeight: 200}}>
        {matches.map(option => <TouchableOpacity key={option.value} accessibilityRole="button" disabled={disabled}
          onPress={() => choose(option.value)} style={{padding: 10, minHeight: 40}}>
          <Text style={{color: c.text}}>{option.label}</Text>
        </TouchableOpacity>)}
        {canAdd ? <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={() => choose(cleaned)}
          style={{padding: 10, minHeight: 40}}><Text style={{color: dark ? c.cyan : c.indigo}}>{customLabel} “{cleaned}”</Text></TouchableOpacity> : null}
        {!matches.length && !canAdd && <Text style={{color: c.muted, padding: 10}}>No matching options</Text>}
      </ScrollView>
    </View>}
  </View>;
}
