import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import {getAssignmentOptions, ProjectAssignableUser} from '../api/projects';
import {getReportingManagers, ReportingManager, setQcReportingManager} from '../api/managerQc';
import {getApiErrorMessage} from '../api/errors';
import {useThemeMode} from '../theme/useThemeMode';
import {DARK, LIGHT} from '../theme/palette';

export default function QcReportingManagers({onChanged}: {onChanged: () => void}) {
  const [users, setUsers] = useState<ProjectAssignableUser[]>([]);
  const [managers, setManagers] = useState<ReportingManager[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const theme = useThemeMode(); const colors = theme === 'dark' ? DARK : LIGHT;
  useEffect(() => {
    let active = true;
    Promise.all([getAssignmentOptions(), getReportingManagers()]).then(([qcs, list]) => {
      if (active) {setUsers(qcs.data.filter(u => u.role.toLowerCase() === 'qc')); setManagers(list.data);}
    }).catch(err => {if (active) setError(getApiErrorMessage(err, 'Could not load reporting managers.'));})
      .finally(() => {if (active) setBusy(false);});
    return () => {active = false;};
  }, []);
  const update = async (qc: ProjectAssignableUser, manager: ReportingManager | null) => {
    setBusy(true); setError('');
    try {
      await setQcReportingManager(qc.id, manager?.id ?? null);
      setUsers(current => current.map(u => u.id === qc.id ? {...u, managerId: manager?.id, managerName: manager?.displayName} : u));
      onChanged();
    } catch (err) {setError(getApiErrorMessage(err, 'Could not update reporting manager.'));}
    finally {setBusy(false);}
  };
  return <View style={{padding: 18, gap: 16, backgroundColor: colors.card, borderRadius: 12}}>
    <Text style={{fontSize: 18, fontWeight: '700', color: colors.text}}>QC reporting managers</Text>
    {error ? <Text accessibilityRole="alert" style={{color: colors.critical}}>{error}</Text> : null}
    {busy ? <ActivityIndicator /> : null}
    {users.map(qc => <View key={qc.id} style={{gap: 8}}>
      <Text style={{color: colors.text}}>{qc.displayName} — Manager: {qc.managerName || 'Not assigned'}</Text>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>{[null, ...managers].map(manager =>
        <TouchableOpacity key={manager?.id || 'none'} accessibilityRole="button" disabled={busy}
          onPress={() => update(qc, manager)} style={{padding: 10, borderRadius: 6, backgroundColor: colors.amber, opacity: busy ? 0.5 : 1}}>
          <Text style={{color: colors.onAmber}}>{manager?.displayName || 'Not assigned'}{(qc.managerId || null) === (manager?.id || null) ? ' ✓' : ''}</Text>
        </TouchableOpacity>)}</View>
    </View>)}
  </View>;
}
