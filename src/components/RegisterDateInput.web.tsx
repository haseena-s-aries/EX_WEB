import React from 'react';
import {StyleSheet} from 'react-native';
import type {RegisterDateProps} from './RegisterDateInput';

export default function RegisterDateInput({value, onChange, disabled, style}: RegisterDateProps) {
  const themed = StyleSheet.flatten(style);
  return <input aria-label="Defect date" type="date" value={value} onChange={e => onChange(e.currentTarget.value)} disabled={disabled}
    style={{width: '100%', boxSizing: 'border-box', padding: 6, minHeight: 34, borderRadius: 6, border: `1px solid ${String(themed?.borderColor)}`,
      color: themed?.color as string, backgroundColor: themed?.backgroundColor as string}}/>;
}
