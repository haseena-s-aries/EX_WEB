import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {getProjects} from '../api/projects';
import {searchEquipment} from '../api/equipmentIdentification';
import {Colors} from '../theme/palette';

type WorkspaceTone = 'Navy' | 'Blue';
type Result = {key: string; projectId: string; title: string; detail: string};

export default function AdminWorkspaceHeader({title, tone, onTone, notification, colors, onProject}: {
  title: string;
  tone: WorkspaceTone;
  onTone: (value: WorkspaceTone) => void;
  notification: React.ReactNode;
  colors: Colors;
  onProject: (projectId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [message, setMessage] = useState('');
  const searchId = useRef(0);
  useEffect(() => () => { searchId.current++; }, []);

  async function search() {
    const term = query.trim();
    const id = ++searchId.current;
    setResults([]);
    if (term.length < 2) {setMessage('Enter at least two characters.'); return;}
    setMessage('Searching…');
    const [projects, equipment] = await Promise.allSettled([getProjects(), searchEquipment(term)]);
    if (id !== searchId.current) return;
    const matches: Result[] = [];
    if (projects.status === 'fulfilled') {
      const lower = term.toLowerCase();
      matches.push(...projects.value.data
        .filter(project => [project.projectName, project.jobNo, project.location].some(value => value?.toLowerCase().includes(lower)))
        .slice(0, 5)
        .map(project => ({key: project.id, projectId: project.id, title: project.projectName, detail: 'Project'})));
    }
    if (equipment.status === 'fulfilled') {
      const items: {equipmentId: string; projectId: string; tagNumber: string; projectName: string}[] = equipment.value.data.items || [];
      matches.push(...items.slice(0, 5).map(item => ({key: item.equipmentId, projectId: item.projectId, title: item.tagNumber, detail: item.projectName})));
    }
    setResults(matches);
    const partial = projects.status === 'rejected' || equipment.status === 'rejected';
    setMessage(partial ? 'Some search results could not be loaded.' : matches.length ? '' : 'No matching projects or equipment.');
  }

  return <View style={[styles.bar, {backgroundColor: colors.card, borderColor: colors.border}]}>
    <Text numberOfLines={1} style={[styles.crumb, {color: colors.secondary}]}>Workspace  /  <Text style={{color: colors.text, fontWeight: '700'}}>{title}</Text></Text>
    <View style={[styles.switcher, {backgroundColor: colors.elevated, borderColor: colors.border}]}>
      {(['Navy', 'Blue'] as const).map(option => <TouchableOpacity key={option} accessibilityRole="button" accessibilityState={{selected: tone === option}} onPress={() => onTone(option)} style={[styles.tone, tone === option && {backgroundColor: colors.card}]}>
        <Text style={{color: tone === option ? colors.text : colors.secondary, fontWeight: '700'}}>{option}</Text>
      </TouchableOpacity>)}
    </View>
    <View style={styles.search}>
      <View style={[styles.searchRow, {borderColor: colors.border, backgroundColor: colors.bg}]}>
        <TextInput accessibilityLabel="Search projects and equipment" placeholder="Search projects, equipment…" placeholderTextColor={colors.muted} value={query} onChangeText={value => {searchId.current++; setQuery(value); setResults([]); setMessage('');}} onSubmitEditing={search} style={[styles.input, {color: colors.text}]} />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Search workspace" onPress={search} style={styles.searchButton}><Text style={{color: colors.secondary, fontSize: 20}}>⌕</Text></TouchableOpacity>
      </View>
      {(results.length > 0 || !!message) && <View style={[styles.results, {backgroundColor: colors.card, borderColor: colors.border}]}>
        {results.map(result => <TouchableOpacity accessibilityRole="button" key={result.key} onPress={() => {setResults([]); setMessage(''); setQuery(''); onProject(result.projectId);}} style={styles.result}>
          <Text style={{color: colors.text, fontWeight: '700'}}>{result.title}</Text><Text style={{color: colors.secondary}}>{result.detail}</Text>
        </TouchableOpacity>)}
        {!!message && <Text style={[styles.result, {color: colors.secondary}]}>{message}</Text>}
      </View>}
    </View>
    {notification}
  </View>;
}
const styles = StyleSheet.create({
  bar: {minHeight: 68, paddingHorizontal: 24, gap: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, zIndex: 30},
  crumb: {fontSize: 15, flex: 1, minWidth: 0},
  switcher: {flexDirection: 'row', padding: 3, borderWidth: 1, borderRadius: 8},
  tone: {paddingHorizontal: 9, paddingVertical: 7, borderRadius: 5},
  search: {flexShrink: 1, width: 300, minWidth: 156, zIndex: 1},
  searchRow: {flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 7},
  input: {flex: 1, minWidth: 0, height: 38, paddingHorizontal: 10, fontSize: 14},
  searchButton: {paddingHorizontal: 11, height: 38, justifyContent: 'center'},
  results: {position: 'absolute', top: 45, left: 0, right: 0, borderWidth: 1, borderRadius: 8, overflow: 'hidden'},
  result: {padding: 10, gap: 3},
});
