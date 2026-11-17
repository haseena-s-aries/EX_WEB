import React, {useState} from 'react';
import {ScrollView, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useDashboardPresentation} from './DashboardPresentation';
export default function ClientAssignmentPicker({value, options, onChange, disabled = false}: {
  value: string[]; options: {id: string; displayName: string; email?: string}[]; onChange: (ids: string[]) => void; disabled?: boolean;
}) {
  const {c} = useDashboardPresentation(); const [open, setOpen] = useState(false); const [query, setQuery] = useState('');
  const selected = [...new Set(value)];
  const control = {borderWidth: 1, borderColor: c.border, borderRadius: 9, backgroundColor: c.card, padding: 12, minHeight: 44};
  return <View style={{gap: 10}}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Assign Client ID" accessibilityState={{expanded: open, disabled}} disabled={disabled} onPress={() => setOpen(v => !v)} style={control}>
      <Text style={{color: c.text}}>{selected.length ? `${selected.length} Client${selected.length === 1 ? '' : 's'} selected` : 'Select Client users (optional)'} ▾</Text>
    </TouchableOpacity>
    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{selected.map(id => {const user = options.find(o => o.id === id); return <TouchableOpacity key={id}
      accessibilityRole="button" accessibilityLabel={`Remove Client ${user?.displayName || id}`} disabled={disabled} onPress={() => onChange(selected.filter(v => v !== id))}
      style={{...control, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.elevated, maxWidth: '100%'}}>
      <Text style={{color: c.text, flexShrink: 1}}>{user?.displayName || id}</Text><Text style={{color: c.cyan}}>×</Text>
    </TouchableOpacity>;})}</View>
    {open && <View style={{...control, gap: 8}}><TextInput accessibilityLabel="Search Client users" placeholder="Search name, email or Client ID" placeholderTextColor={c.muted}
      value={query} onChangeText={setQuery} editable={!disabled} style={{...control, color: c.text}} />
      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{maxHeight: 240}}>
        {options.filter(o => `${o.displayName} ${o.email || ''} ${o.id}`.toLowerCase().includes(query.trim().toLowerCase())).map(o =>
          <TouchableOpacity key={o.id} accessibilityRole="checkbox" accessibilityLabel={`Client ${o.displayName} ${o.email || ''}`} accessibilityState={{checked: selected.includes(o.id), disabled}} disabled={disabled}
            onPress={() => onChange(selected.includes(o.id) ? selected.filter(id => id !== o.id) : [...selected, o.id])} style={{padding: 12, minHeight: 48, borderBottomWidth: 1, borderBottomColor: c.border}}>
            <Text style={{color: c.text}}>{selected.includes(o.id) ? '☑' : '☐'} {o.displayName}</Text>{!!o.email && <Text style={{color: c.secondary, fontSize: 12}}>{o.email}</Text>}
          </TouchableOpacity>)}
        {!options.some(o => `${o.displayName} ${o.email || ''} ${o.id}`.toLowerCase().includes(query.trim().toLowerCase())) && <Text style={{color: c.muted, padding: 12}}>No matching Client users.</Text>}
      </ScrollView>
    </View>}
  </View>;
}
