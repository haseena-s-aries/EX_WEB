import React, {useEffect, useState} from 'react';
import {Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {addProjectArea, getProjectAreaPhotos, InspectionPhotoFile, ProjectAreaPhoto, updateProjectArea, uploadProjectAreaPhotos} from '../api/projects';
import {getApiErrorMessage} from '../api/errors';
import AuthenticatedImage from './AuthenticatedImage';
import InspectionPhotoPicker from './InspectionPhotoPicker';
import type {Colors} from '../theme/palette';

type Area = {id: string; areaName: string};
type Draft = {key: number; id?: string; name: string; savedName?: string; pending: InspectionPhotoFile[]; error?: string};
type Props = {
  project: {id: string; projectName: string; areas: Area[]};
  canEdit: boolean; colors: Colors; onClose: () => void; onAreaSaved: (area: Area) => void;
};

export default function HaerAreaManager({project, canEdit, colors, onClose, onAreaSaved}: Props) {
  const [drafts, setDrafts] = useState<Draft[]>(() => project.areas.map((a, key) =>
    ({key, id: a.id, name: a.areaName, savedName: a.areaName, pending: []})));
  const [initialAreas] = useState(() => project.areas);
  const [nextKey, setNextKey] = useState(project.areas.length);
  const [stored, setStored] = useState<Record<string, ProjectAreaPhoto[]>>({});
  const [photoErrors, setPhotoErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<{path: string; local: boolean}>();
  useEffect(() => {
    let active = true;
    initialAreas.forEach(area => {
      getProjectAreaPhotos(project.id, area.id).then(({data}) => {
        if (active) setStored(old => ({...old, [area.id]: [...data, ...(old[area.id] ?? []).filter(photo => !data.some(item => item.id === photo.id))]}));
      }).catch(error => {
        if (active) setPhotoErrors(old => ({...old, [area.id]: getApiErrorMessage(error, 'Could not load area photos.')}));
      });
    });
    return () => {active = false;};
  }, [initialAreas, project.id]);

  const patch = (key: number, change: Partial<Draft>) =>
    setDrafts(old => old.map(d => d.key === key ? {...d, ...change} : d));
  const add = () => {
    setDrafts(old => [...old, {key: nextKey, name: '', pending: []}]);
    setNextKey(nextKey + 1);
  };
  const dirty = drafts.filter(d => !d.id || d.name.trim() !== d.savedName || d.pending.length);
  async function save() {
    setBusy(true);
    let saved = 0;
    let failed = 0;
    for (const draft of dirty) {
      const name = draft.name.trim();
      let id = draft.id;
      try {
        if (!name) throw new Error('Area name is required.');
        if (drafts.some(other => other.key !== draft.key && other.name.trim().toLowerCase() === name.toLowerCase()))
          throw new Error('An area with this name already exists in this project.');
        if (!id || name !== draft.savedName) {
          const {data} = id ? await updateProjectArea(project.id, id, name) : await addProjectArea(project.id, name, undefined);
          id = data.id;
          patch(draft.key, {id, name: data.areaName, savedName: data.areaName, error: undefined});
          onAreaSaved(data);
        }
        if (draft.pending.length) {
          const {data} = await uploadProjectAreaPhotos(project.id, id, draft.pending);
          setStored(old => ({...old, [id!]: [...(old[id!] ?? []).filter(photo => !data.some(item => item.id === photo.id)), ...data]}));
          patch(draft.key, {pending: []});
        }
        patch(draft.key, {error: undefined});
        saved++;
      } catch (error) {
        patch(draft.key, {error: getApiErrorMessage(error, error instanceof Error ? error.message : 'Could not save area.')});
        failed++;
      }
    }
    setMessage(`${saved} saved · ${failed} need attention`);
    setBusy(false);
  }

  const button = (label: string, action: () => void, disabled = busy) =>
    <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={action}
      style={[s.button, {borderColor: colors.border, backgroundColor: colors.elevated, opacity: disabled ? .5 : 1}]}>
      <Text style={{color: colors.text, fontWeight: '700'}}>{label}</Text>
    </TouchableOpacity>;
  const image = (path: string, local: boolean, large = false) => {
    const style = large ? s.large : s.thumb;
    return local ? <Image source={{uri: path}} style={style} resizeMode="contain"/> :
      <AuthenticatedImage path={path} style={style} placeholderText="Photo unavailable"/>;
  };
  const thumb = (path: string, local: boolean) =>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Preview area photo" onPress={() => setPreview({path, local})}>
      {image(path, local)}
    </TouchableOpacity>;

  return <Modal transparent visible onRequestClose={() => {if (!busy) onClose();}}>
    <View style={s.overlay}>
      <View style={[s.panel, {backgroundColor: colors.card}]}>
        <Text accessibilityRole="header" style={[s.title, {color: colors.text}]}>Manage Areas</Text>
        <Text style={{color: colors.secondary}}>{project.projectName}</Text>
        {preview ? <>
          {image(preview.path, preview.local, true)}
          {button('Close preview', () => setPreview(undefined), false)}
        </> : <>
          <ScrollView style={s.list} contentContainerStyle={s.listContent} keyboardShouldPersistTaps="handled">
            {!drafts.length && <Text style={{color: colors.secondary}}>No areas in this project.</Text>}
            {drafts.map(d => <View key={d.key} style={[s.area, {borderColor: colors.border}]}>
              {(canEdit || !d.id) ? <TextInput accessibilityLabel="Area name" placeholder="Area name" placeholderTextColor={colors.muted}
                editable={!busy} value={d.name} onChangeText={name => patch(d.key, {name, error: undefined})}
                style={[s.input, {color: colors.text, borderColor: colors.border}]}/> :
                <Text style={{color: colors.text, fontWeight: '700'}}>{d.name}</Text>}
              <Text style={{color: colors.secondary}}>Area photos</Text>
              <View style={s.line}>
                {(d.id ? stored[d.id] ?? [] : []).map(photo => {
                  const path = photo.downloadUrl || photo.filePath;
                  return path ? <View key={photo.id}>{thumb(path, false)}</View> : null;
                })}
                {d.pending.map((photo, index) => <View key={index} style={{gap: 4}}>
                  {photo.uri && thumb(photo.uri, true)}
                  {button('Remove photo', () => patch(d.key, {pending: d.pending.filter((_, i) => i !== index)}))}
                </View>)}
              </View>
              <InspectionPhotoPicker disabled={busy} onSelected={photos => patch(d.key, {pending: [...d.pending, ...photos]})}/>
              {!d.id && button('Remove unsaved area', () => setDrafts(old => old.filter(item => item.key !== d.key)))}
              {!!d.id && !!photoErrors[d.id] && <Text style={{color: colors.critical}}>{photoErrors[d.id]}</Text>}
              {!!d.error && <Text accessibilityRole="alert" style={{color: colors.critical}}>{d.error}</Text>}
            </View>)}
          </ScrollView>
          {!!message && <Text accessibilityLiveRegion="polite" style={{color: colors.text}}>{message}</Text>}
          <View style={s.line}>
            {button(drafts.some(d => !d.id) ? 'Add Another Area' : '+ Add Area', add)}
            {button(busy ? 'Saving…' : 'Save All Areas', () => void save(), busy || !dirty.length)}
            {button('Close', onClose)}
          </View>
        </>}
      </View>
    </View>
  </Modal>;
}

const s = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: '#0008', justifyContent: 'center', alignItems: 'center', padding: 16},
  panel: {width: '100%', maxWidth: 680, maxHeight: '94%', borderRadius: 10, padding: 16, gap: 10},
  title: {fontSize: 21, fontWeight: '800'}, line: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  area: {padding: 10, borderWidth: 1, borderRadius: 6, gap: 7}, list: {maxHeight: 490}, listContent: {gap: 8},
  input: {borderWidth: 1, borderRadius: 6, minHeight: 36, padding: 8},
  button: {borderWidth: 1, borderRadius: 6, minHeight: 36, padding: 8, alignSelf: 'flex-start'},
  thumb: {width: 96, height: 70, borderRadius: 4}, large: {width: '100%', height: 300},
});
