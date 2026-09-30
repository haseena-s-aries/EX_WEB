import React, {useRef} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {InspectionPhotoFile} from '../api/projects';

type Props = {
  disabled?: boolean;
  onSelected: (files: InspectionPhotoFile[]) => void;
};

export default function InspectionPhotoPicker({disabled, onSelected}: Props) {
  const inputRef = useRef<any>(null);

  return (
    <View>
      {/* @ts-ignore React Native Web intentionally renders a browser file input. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        multiple
        disabled={disabled}
        style={styles.hiddenInput as any}
        onChange={(event: any) => {
          const files = Array.from(event.target.files || []) as any[];
          onSelected(files.map(file => ({
            uri: URL.createObjectURL(file),
            type: file.type,
            fileName: file.name,
            webFile: file,
          })));
          event.target.value = '';
        }}
      />
      <TouchableOpacity
        disabled={disabled}
        onPress={() => inputRef.current?.click()}
        style={[styles.button, disabled && styles.disabled]}>
        <Text style={styles.buttonText}>Choose Photos</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenInput: {display: 'none'},
  button: {alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: '#b8a5f8', borderRadius: 7, backgroundColor: '#f8f6ff'},
  disabled: {opacity: 0.5},
  buttonText: {fontSize: 12, color: '#4d5577', fontWeight: '800'},
});
