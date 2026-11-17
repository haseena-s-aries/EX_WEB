import React from 'react';
import type {ProjectDateProps} from './ProjectDateField';
import {DARK, LIGHT} from '../theme/palette';
import {useThemeMode} from '../theme/useThemeMode';

export default function ProjectDateField({label, value, onChange, disabled, required}: ProjectDateProps) {
  const c = useThemeMode() === 'dark' ? DARK : LIGHT;
  return <label style={{display: 'grid', gap: 5, color: c.text, fontWeight: 700, fontSize: 13}}>
    {label}{required ? ' *' : ''}
    <input type="date" aria-label={label} aria-required={required} value={value} disabled={disabled} max="9999-12-31"
      onChange={event => onChange(event.currentTarget.value)}
      style={{width: '100%', boxSizing: 'border-box', padding: 10, minHeight: 40, borderRadius: 6,
        color: c.text, backgroundColor: c.card, border: `1px solid ${c.border}`}} />
  </label>;
}
