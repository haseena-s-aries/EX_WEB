import React, {useState} from 'react';
import {Modal, Text, TouchableOpacity, View} from 'react-native';
import {DARK, LIGHT} from '../theme/palette';
import {useThemeMode} from '../theme/useThemeMode';

export type ProjectDateProps = {label: string; value: string; onChange: (date: string) => void; disabled?: boolean; required?: boolean};

export default function ProjectDateField({label, value, onChange, disabled, required}: ProjectDateProps) {
  const c = useThemeMode() === 'dark' ? DARK : LIGHT;
  const [month, setMonth] = useState<Date>();
  const year = month?.getFullYear() ?? 0;
  const index = month?.getMonth() ?? 0;
  const firstDay = month?.getDay() ?? 0;
  const days = month ? new Date(year, index + 1, 0).getDate() : 0;
  const open = () => {
    const selected = value ? new Date(`${value}T12:00:00`) : new Date();
    setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
  };
  const choose = (day: number) => {
    onChange(`${String(year).padStart(4, '0')}-${String(index + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    setMonth(undefined);
  };
  return <View style={{gap: 5}}>
    <Text style={{color: c.text, fontWeight: '700'}}>{label}{required ? ' *' : ''}</Text>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={open} disabled={disabled}
      style={{padding: 10, borderWidth: 1, borderColor: c.border, borderRadius: 6, backgroundColor: c.card}}>
      <Text style={{color: value ? c.text : c.muted}}>{value || 'Select date'}</Text>
    </TouchableOpacity>
    {!!month && <Modal transparent visible onRequestClose={() => setMonth(undefined)}>
      <View style={{flex: 1, justifyContent: 'center', padding: 16, backgroundColor: '#0008'}}>
        <View style={{width: '100%', maxWidth: 380, alignSelf: 'center', padding: 12, borderRadius: 10, backgroundColor: c.card}}>
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setMonth(new Date(year, index - 1, 1))} style={{padding: 10}}><Text style={{color: c.text}}>‹</Text></TouchableOpacity>
            <Text style={{color: c.text, fontWeight: '700'}}>{month.toLocaleDateString(undefined, {month: 'long', year: 'numeric'})}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setMonth(new Date(year, index + 1, 1))} style={{padding: 10}}><Text style={{color: c.text}}>›</Text></TouchableOpacity>
          </View>
          <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <Text key={day} style={{width: '14.28%', textAlign: 'center', color: c.muted}}>{day}</Text>)}
            {Array.from({length: firstDay}, (_, n) => <View key={`space-${n}`} style={{width: '14.28%'}} />)}
            {Array.from({length: days}, (_, n) => <TouchableOpacity key={n} accessibilityRole="button"
              onPress={() => choose(n + 1)} style={{width: '14.28%', minHeight: 40, alignItems: 'center', justifyContent: 'center'}}>
              <Text style={{color: c.text}}>{n + 1}</Text>
            </TouchableOpacity>)}
          </View>
          <TouchableOpacity accessibilityRole="button" onPress={() => setMonth(undefined)} style={{padding: 10}}><Text style={{color: c.text}}>Cancel</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>}
  </View>;
}
