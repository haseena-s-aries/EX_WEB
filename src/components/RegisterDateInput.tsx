import React from 'react';
import {TextInput, type TextInputProps} from 'react-native';

export type RegisterDateProps = {value: string; onChange: (value: string) => void; disabled: boolean; style: TextInputProps['style']};
export default function RegisterDateInput({value, onChange, disabled, style}: RegisterDateProps) {
  return <TextInput accessibilityLabel="Defect date" placeholder="YYYY-MM-DD" value={value} onChangeText={onChange} editable={!disabled} style={style}/>;
}
