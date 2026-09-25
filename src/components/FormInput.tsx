import React, {useState} from 'react';
import {TextInput, View, Text, StyleSheet, TextInputProps} from 'react-native';

type Props = TextInputProps & {label: string};

export default function FormInput({label, style, ...rest}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...rest}
        onFocus={e => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={[styles.input, focused && styles.inputFocused, style]}
        placeholderTextColor="#9aa0b4"
      />
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
  input: {
    borderWidth: 1.5,
    borderColor: '#e1e4ee',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1a1d2b',
    backgroundColor: '#f8f9fc',
  },
  inputFocused: {
    borderColor: '#1a237e',
    backgroundColor: '#ffffff',
  },
});