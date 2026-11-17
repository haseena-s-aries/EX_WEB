import React from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
} from 'react-native-image-picker';
import {InspectionPhotoFile} from '../api/projects';

type Props = {
  disabled?: boolean;
  allowPdf?: boolean;
  onSelected: (files: InspectionPhotoFile[]) => void;
};

const toPhotoFile = (asset: Asset): InspectionPhotoFile => ({
  uri: asset.uri,
  type: asset.type,
  fileName: asset.fileName,
  webFile: (asset as any).file,
});

export default function InspectionPhotoPicker({disabled, onSelected, allowPdf = true}: Props) {
  const selectPdf = async () => {
    const {errorCodes, isErrorWithCode, pick, types} = await import('@react-native-documents/picker');
    try {
      const files = await pick({type: [types.pdf], mode: 'import', allowMultiSelection: true});
      onSelected(files.filter(file => file.name).map(file => ({
        uri: file.uri, type: 'application/pdf', fileName: file.name!,
      })));
    } catch (error) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return;
      Alert.alert('Could not select PDF', 'Try choosing the file again.');
    }
  };
  const selectFromGallery = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', selectionLimit: 0});
    if (result.didCancel) return;
    if (result.errorMessage) {
      Alert.alert('Photo selection failed', result.errorMessage);
      return;
    }
    onSelected((result.assets || []).filter(asset => asset.uri).map(toPhotoFile));
  };

  const takePhoto = async () => {
    const result = await launchCamera({mediaType: 'photo', saveToPhotos: false});
    if (result.didCancel) return;
    if (result.errorMessage) {
      Alert.alert('Camera failed', result.errorMessage);
      return;
    }
    onSelected((result.assets || []).filter(asset => asset.uri).map(toPhotoFile));
  };

  return (
    <View style={styles.actions}>
      <TouchableOpacity
        disabled={disabled}
        onPress={takePhoto}
        style={[styles.button, disabled && styles.disabled]}>
        <Text style={styles.buttonText}>Camera</Text>
      </TouchableOpacity>
      <TouchableOpacity
        disabled={disabled}
        onPress={selectFromGallery}
        style={[styles.button, disabled && styles.disabled]}>
        <Text style={styles.buttonText}>Gallery</Text>
      </TouchableOpacity>
      {allowPdf && <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={selectPdf}
        style={[styles.button, disabled && styles.disabled]}>
        <Text style={styles.buttonText}>Choose PDF</Text>
      </TouchableOpacity>}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  button: {minHeight: 40, justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: '#b8a5f8', borderRadius: 7, backgroundColor: '#f8f6ff'},
  disabled: {opacity: 0.5},
  buttonText: {fontSize: 12, color: '#4d5577', fontWeight: '800'},
});
