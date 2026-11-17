import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  pick,
  types,
  isErrorWithCode,
  errorCodes,
} from '@react-native-documents/picker';
import {
  PlanUploadProps,
  validateHazardousAreaPlan,
} from './hazardousAreaPlan';

export default function HazardousAreaPlanUpload({
  value,
  onChange,
  disabled,
}: PlanUploadProps) {
  const [error, setError] = useState('');
  const choose = async () => {
    try {
      const [file] = await pick({
        type: [types.images, types.pdf],
        mode: 'import',
      });
      const message = validateHazardousAreaPlan(file);
      setError(message);
      if (!message)
        onChange({
          name: file.name!,
          type:
            file.type ||
            (file.name!.toLowerCase().endsWith('.pdf')
              ? 'application/pdf'
              : file.name!.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'),
          uri: file.uri,
        });
    } catch (requestError) {
      if (
        isErrorWithCode(requestError) &&
        requestError.code === errorCodes.OPERATION_CANCELED
      )
        return;
      setError('Could not choose the file. Please try again.');
    }
  };
  return (
    <View style={{ gap: 8, marginBottom: 16 }}>
      <Text testID="project-form-label" style={{ fontSize: 13, fontWeight: '700', color: '#5b6178' }}>
        Hazardous Area Plan
      </Text>
      <TouchableOpacity
        disabled={disabled}
        onPress={choose}
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: '#e5e9f6',
          borderRadius: 10,
        }}
      >
        <Text style={{ color: '#718be8' }}>Choose File / Upload</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 12, color: '#85899a' }}>
        Optional — JPG, JPEG, PNG or PDF
      </Text>
      {!!value && (
        <Text style={{ fontSize: 12, color: '#5b6178' }}>
          ✓ Hazardous Area Plan selected
        </Text>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={{ color: '#ba4e3c' }}>
          {error}
        </Text>
      )}
    </View>
  );
}
