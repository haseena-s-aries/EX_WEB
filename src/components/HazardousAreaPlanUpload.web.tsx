import React, { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
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
  const fileInput = useRef<any>(null);
  useEffect(() => {
    if (!value && fileInput.current) fileInput.current.value = '';
  }, [value]);
  return (
    <View style={{ gap: 8, marginBottom: 16 }}>
      <Text testID="project-form-label" style={{ fontSize: 13, fontWeight: '700', color: '#5b6178' }}>
        Hazardous Area Plan
      </Text>
      {React.createElement('input', {
        ref: fileInput,
        type: 'file',
        accept: '.jpg,.jpeg,.png,.pdf',
        disabled,
        'aria-label': 'Choose Hazardous Area Plan',
        style: {
          display: 'none',
          padding: 12,
          border: '1px solid #e5e9f6',
          borderRadius: 10,
          color: '#5b6178',
          maxWidth: '100%',
        },
        onChange: (event: any) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const message = validateHazardousAreaPlan(file);
          setError(message);
          if (message) {
            event.target.value = '';
            return;
          }
          onChange({
            name: file.name,
            type:
              file.type ||
              (file.name.toLowerCase().endsWith('.pdf')
                ? 'application/pdf'
                : file.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'),
            webFile: file,
          });
        },
      })}
      {React.createElement(
        'button',
        {
          type: 'button',
          'data-project-upload': true,
          disabled,
          onClick: () => fileInput.current?.click(),
          style: {
            alignSelf: 'flex-start',
            padding: 12,
            border: '1px solid #e5e9f6',
            borderRadius: 10,
            background: '#fff',
            color: '#718be8',
          },
        },
        'Choose File',
      )}
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
