import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {getApiErrorMessage} from '../api/errors';
import {getProjects} from '../api/projects';
import {EquipmentRow, inspectionKey, inspectionLabel, loadAllEquipment} from '../api/adminEquipment';
import {useThemeMode} from '../theme/useThemeMode';
import {Colors, DARK, LIGHT, tint} from '../theme/palette';

type Props = {
  onEquipmentPress: (projectId: string) => void;
  onDocumentsPress?: (row: EquipmentRow) => void;
  refreshVersion?: number;
};

const statusColor = (c: Colors, status: string) => {
  const key = inspectionKey(status);
  if (key === 'qcapproved') return c.success;
  if (key === 'changesrequested') return c.critical;
  if (key === 'completed' || key === 'inprogress') return c.cyan;
  return c.yellow;
};

/** Every piece of equipment across all projects. */
export default function AdminEquipmentListScreen({onEquipmentPress, onDocumentsPress, refreshVersion}: Props) {
  const mode = useThemeMode();
  const c = mode === 'dark' ? DARK : LIGHT;
  const s = useMemo(() => makeStyles(c), [c]);

  const [rows, setRows] = useState<EquipmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const projects = (await getProjects()).data;
      setRows(await loadAllEquipment(projects));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not load equipment.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshVersion]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.tagNumber, r.type, r.projectName, r.areaName, inspectionLabel(r.inspectionStatus)].some(v =>
        String(v || '').toLowerCase().includes(q),
      ),
    );
  }, [rows, query]);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
      <View style={s.heading}>
        <Text style={s.title}>Equipment</Text>
        {!loading && !error ? <Text style={s.hint}>{filtered.length} items</Text> : null}
      </View>

      <View style={s.searchBox}>
        <Text style={s.searchIcon}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search tag, type, project or area…"
          placeholderTextColor={c.muted}
          style={[s.searchInput, Platform.select({web: {outlineStyle: 'none'} as object, default: {}})]}
        />
      </View>

      {loading ? (
        <View style={s.stateBox}>
          <ActivityIndicator color={c.amber} size="large" />
          <Text style={s.stateText}>Loading equipment...</Text>
        </View>
      ) : error ? (
        <View style={s.stateBox}>
          <Text style={s.stateTitle}>Equipment unavailable</Text>
          <Text style={s.stateText}>{error}</Text>
          <TouchableOpacity style={s.retry} onPress={() => load()}>
            <Text style={s.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.stateBox}>
          <Text style={s.stateTitle}>{rows.length ? 'No matching equipment' : 'No equipment yet'}</Text>
          <Text style={s.stateText}>
            {rows.length ? 'Try a different search.' : 'Equipment added to project areas will appear here.'}
          </Text>
        </View>
      ) : (
        <View style={{gap: 10}}>
          {filtered.map(row => {
            const sc = statusColor(c, row.inspectionStatus);
            const label = inspectionLabel(row.inspectionStatus);
            return (
              <View key={row.id} style={{flexDirection:'row',gap:7,alignItems:'stretch'}}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => onEquipmentPress(row.projectId)}
                activeOpacity={0.75}
                style={s.card}>
                <View style={{flex: 1, minWidth: 0}}>
                  <Text style={s.tag} numberOfLines={1}>
                    #{row.sequenceNo} {row.tagNumber}
                  </Text>
                  <Text style={s.type} numberOfLines={1}>
                    {row.type}
                  </Text>
                  <Text style={s.context} numberOfLines={1}>
                    {row.projectName} | {row.areaName}
                  </Text>
                </View>
                <View style={[s.badge, {backgroundColor: tint(sc, '26')}]}>
                  <Text style={[s.badgeText, {color: sc}]}>{label.toUpperCase()}</Text>
                </View>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
              {onDocumentsPress&&<TouchableOpacity accessibilityRole="button" onPress={()=>onDocumentsPress(row)} style={[s.card,{flex:0,justifyContent:'center'}]}><Text style={s.badgeText}>Documents</Text></TouchableOpacity>}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    screen: {flex: 1, backgroundColor: c.bg},
    content: {padding: 16, paddingBottom: 32, maxWidth: 760, width: '100%', alignSelf: 'center'},
    heading: {flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8, marginBottom: 12},
    title: {color: c.text, fontSize: 22, fontWeight: '800'},
    hint: {color: c.muted, fontSize: 12, fontWeight: '600'},
    searchBox: {flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 12, height: 44, marginBottom: 14},
    searchIcon: {color: c.muted, fontSize: 17},
    searchInput: {flex: 1, color: c.text, fontSize: 14, paddingVertical: 0, height: '100%'},
    card: {flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14},
    tag: {color: c.text, fontSize: 14.5, fontWeight: '800'},
    type: {color: c.cyan, fontSize: 11.5, fontWeight: '700', marginTop: 3},
    context: {color: c.secondary, fontSize: 11.5, marginTop: 3},
    badge: {borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4},
    badgeText: {fontSize: 9.5, fontWeight: '800', letterSpacing: 0.3},
    chevron: {color: c.muted, fontSize: 22},
    stateBox: {minHeight: 200, backgroundColor: c.card, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 28, borderWidth: 1, borderColor: c.border},
    stateTitle: {color: c.text, fontSize: 16, fontWeight: '800'},
    stateText: {color: c.secondary, fontSize: 13, lineHeight: 19, marginTop: 10, textAlign: 'center'},
    retry: {marginTop: 16, backgroundColor: c.amber, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10},
    retryText: {color: c.onAmber, fontWeight: '800', fontSize: 13},
  });
}
