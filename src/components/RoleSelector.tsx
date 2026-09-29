import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';

const ROLES = ['Admin', 'Surveyor', 'QC', 'Manager', 'Client'];

type Props = {
  value: string;
  onChange: (role: string) => void;
};

export default function RoleSelector({value, onChange}: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Role</Text>
      <View style={styles.row}>
        {ROLES.map(role => {
          const active = value === role;
          return (
            <TouchableOpacity
              key={role}
              onPress={() => onChange(role)}
              style={[styles.chip, active && styles.chipActive]}>
              <Text
                style={[styles.chipText, active && styles.chipTextActive]}
                numberOfLines={1}>
                {role}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {marginBottom: 16},
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5b6178',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  row: {flexDirection: 'row', gap: 6},
  chip: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#dce5dd',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: '#f8f9fc',
    alignItems: 'center',
  },
  chipActive: {backgroundColor: '#718be8', borderColor: '#718be8'},
  chipText: {fontSize: 11, color: '#4a4f63', fontWeight: '600'},
  chipTextActive: {color: '#fff'},
});