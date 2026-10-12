import React, {useRef, useState} from 'react';
import {Alert, Platform, Text, TouchableOpacity} from 'react-native';
import {deleteProject} from '../api/projects';
import {getApiErrorMessage} from '../api/errors';
import {useThemeMode} from '../theme/useThemeMode';
import {DARK, LIGHT, tint} from '../theme/palette';

type Props = {userRole?: string; projectId: string; projectName: string; onDeleted: () => void | Promise<void>};
export default function DeleteProjectButton({userRole, projectId, projectName, onDeleted}: Props) {
  const c = useThemeMode() === 'dark' ? DARK : LIGHT;
  const [deleting, setDeleting] = useState(false);
  const busy = useRef(false);
  if (!['admin', 'manager'].includes(String(userRole).toLowerCase())) return null;
  const performDelete = async () => {
    if (busy.current) return;
    busy.current = true;
    setDeleting(true);
    try {await deleteProject(projectId); await onDeleted();}
    catch (error) {
      const message = getApiErrorMessage(error, 'Could not delete the project. Please try again.');
      if (Platform.OS === 'web') (globalThis as any).alert(message);
      else Alert.alert('Could not delete project', message);
    } finally {busy.current = false; setDeleting(false);}
  };
  const confirmDelete = (event: any) => {
    event?.stopPropagation?.();
    const message = `Delete "${projectName}"? This permanently deletes its areas, equipment, inspections, QC reviews and uploaded files. This cannot be undone.`;
    if (Platform.OS === 'web') {
      if ((globalThis as any).confirm(message)) void performDelete();
    } else Alert.alert('Delete Project', message, [
      {text: 'Cancel', style: 'cancel'}, {text: 'Delete', style: 'destructive', onPress: () => {void performDelete();}},
    ]);
  };
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Delete project ${projectName}`} disabled={deleting} onPress={confirmDelete} style={{paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: tint(c.critical, '66'), alignSelf: 'flex-start', opacity: deleting ? .5 : 1}}>
    <Text style={{color: c.critical, fontWeight: '700', fontSize: 12}}>{deleting ? 'Deleting…' : 'Delete Project'}</Text>
  </TouchableOpacity>;
}
