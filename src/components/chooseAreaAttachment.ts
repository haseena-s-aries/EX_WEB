import {Alert} from 'react-native';

export async function chooseAreaAttachment(onPick: (file: {uri: string; name: string; type: string}) => void) {
  const {errorCodes, isErrorWithCode, pick, types} = await import('@react-native-documents/picker');
  try {
    const [file] = await pick({type: [types.images, types.pdf], mode: 'import'});
    if (file?.name) onPick({uri: file.uri, name: file.name, type: file.type || 'application/octet-stream'});
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return;
    Alert.alert('Could not choose the layout', 'Try selecting the file again.');
  }
}
