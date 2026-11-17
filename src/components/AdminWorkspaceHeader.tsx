import AccountAvatar from './AccountAvatar';
import {visual} from '../theme/visual';
import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {getProjects, getSurveyorProjects} from '../api/projects';
import {searchEquipment} from '../api/equipmentIdentification';
import {Colors} from '../theme/palette';
import {projectDisplay} from '../utils/projectDisplay';

type Result = {key: string; projectId: string; title: string; detail: string};

export default function AdminWorkspaceHeader({title, notification, colors, onProject, profile, showWelcome = true}: {
  title: string;
  notification: React.ReactNode;
  colors: Colors;
  onProject: (projectId: string) => void;
  profile?: {name: string; role: string; onLogout: () => void};
  showWelcome?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [message, setMessage] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const assignedOnly = profile?.role.toLowerCase() === 'surveyor';
  const welcomeProfile = showWelcome ? profile : undefined;
  const searchId = useRef(0);
  useEffect(() => () => { searchId.current++; }, []);

  async function search() {
    const term = query.trim();
    const id = ++searchId.current;
    setResults([]);
    if (term.length < 2) {setMessage('Enter at least two characters.'); return;}
    setMessage('Searching…');
    if (assignedOnly) {
      try {
        const {data} = await getSurveyorProjects();
        if (id !== searchId.current) return;
        const lower = term.toLowerCase();
        const matches = data.filter(project =>
          [project.projectName, project.jobNo, project.location, project.vesselOrSiteName]
            .some(value => value?.toLowerCase().includes(lower)),
        ).slice(0, 5).map(project => ({
          key: project.projectId, projectId: project.projectId, title: projectDisplay(project.projectName), detail: projectDisplay(project.location) || 'Assigned project',
        }));
        setResults(matches);
        setMessage(matches.length ? '' : 'No matching assigned projects.');
      } catch {
        if (id === searchId.current) setMessage('Assigned projects could not be searched.');
      }
      return;
    }
    const [projects, equipment] = await Promise.allSettled([getProjects(), searchEquipment(term)]);
    if (id !== searchId.current) return;
    const matches: Result[] = [];
    if (projects.status === 'fulfilled') {
      const lower = term.toLowerCase();
      matches.push(...projects.value.data
        .filter(project => [project.projectName, project.jobNo, project.location].some(value => value?.toLowerCase().includes(lower)))
        .slice(0, 5)
        .map(project => ({key: project.id, projectId: project.id, title: projectDisplay(project.projectName), detail: 'Project'})));
    }
    if (equipment.status === 'fulfilled') {
      const items: {equipmentId: string; projectId: string; tagNumber: string; projectName: string}[] = equipment.value.data.items || [];
      matches.push(...items.slice(0, 5).map(item => ({key: item.equipmentId, projectId: item.projectId, title: item.tagNumber, detail: projectDisplay(item.projectName)})));
    }
    setResults(matches);
    const partial = projects.status === 'rejected' || equipment.status === 'rejected';
    setMessage(partial ? 'Some search results could not be loaded.' : matches.length ? '' : 'No matching projects or equipment.');
  }

  return <View nativeID="ex-topbar" style={[styles.bar, {backgroundColor: colors.card, borderColor: colors.border}]}>
    <View style={styles.crumb}>
      {!welcomeProfile && <Text style={[styles.kicker, {color: colors.secondary}]}>EX–SURVEY WORKSPACE</Text>}
      <Text accessibilityRole="header" numberOfLines={1} style={[styles.route, {color: colors.text}]}>
        {welcomeProfile ? `Welcome, ${welcomeProfile.name}` : title}
      </Text>
      {!!welcomeProfile && <Text style={[styles.role, {color: colors.cyan, backgroundColor: colors.elevated}]}>{welcomeProfile.role}</Text>}
    </View>
    <View style={styles.search}>
      <View style={[styles.searchRow, {borderColor: colors.border, backgroundColor: colors.bg}]}>
        <TextInput accessibilityLabel={assignedOnly ? 'Search workspace projects' : 'Search projects and equipment'}
          placeholder={assignedOnly ? 'Search assigned projects…' : 'Search projects, equipment…'} placeholderTextColor={colors.muted}
          value={query} onChangeText={value => {searchId.current++; setQuery(value); setResults([]); setMessage('');}}
          onSubmitEditing={search} style={[styles.input, {color: colors.text}]} />
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
    {profile && <View style={styles.profile}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Account menu"
        accessibilityState={{expanded: profileOpen}} onPress={() => setProfileOpen(open => !open)}
        style={[styles.avatar, {backgroundColor: colors.elevated, borderColor: colors.border}]}>
        <AccountAvatar name={profile.name} color={colors.cyan} />
      </TouchableOpacity>
      {profileOpen && <View style={[styles.accountMenu, {backgroundColor: colors.card, borderColor: colors.border}]}>
        <Text style={{color: colors.text, fontWeight: '800'}}>{profile.name}</Text>
        <Text style={{color: colors.secondary}}>{profile.role}</Text>
        <TouchableOpacity accessibilityRole="button" onPress={profile.onLogout} style={{paddingVertical: 8}}>
          <Text style={{color: colors.critical, fontWeight: '800'}}>Log out</Text>
        </TouchableOpacity>
      </View>}
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  bar: {minHeight: 74, paddingHorizontal: 24, gap: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, zIndex: 30},
  crumb: {flex: 1, minWidth: 0, gap: 3},
  kicker: {fontFamily: visual.mono, fontSize: 9, letterSpacing: 1.1, fontWeight: '700'},
  route: {fontFamily: visual.display, fontSize: 17, fontWeight: '800'},
  role: {alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3, fontSize: 11, fontWeight: '800'},
  profile: {zIndex: 2},
  avatar: {width: 42, height: 42, borderWidth: 1, borderRadius: 21, alignItems: 'center', justifyContent: 'center'},
  accountMenu: {position: 'absolute', right: 0, top: 49, width: 185, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4},
  search: {flexShrink: 1, width: 300, minWidth: 156, zIndex: 1},
  searchRow: {flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12},
  input: {flex: 1, minWidth: 0, height: 38, paddingHorizontal: 10, fontSize: 14},
  searchButton: {paddingHorizontal: 11, height: 38, justifyContent: 'center'},
  results: {position: 'absolute', top: 45, left: 0, right: 0, borderWidth: 1, borderRadius: 8, overflow: 'hidden'},
  result: {padding: 10, gap: 3},
});
