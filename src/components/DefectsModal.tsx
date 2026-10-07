import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {DefectsResponse, DefectSummary, getDefects} from '../api/defects';
import {getApiErrorMessage} from '../api/errors';
import {Colors} from '../theme/palette';
import ZoomableImageViewer from './ZoomableImageViewer';

const statuses: Record<string, string> = {Open: 'Open', RectificationSubmitted: 'Rectification Submitted', Verified: 'Verified', Closed: 'Closed'};
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleString() : 'Not set';

export default function DefectsModal({onClose, onSummary, c}: {onClose: () => void; onSummary: (summary: DefectSummary) => void; c: Colors}) {
  const [data, setData] = useState<DefectsResponse | null>(null);
  const [openOnly, setOpenOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState<string[] | null>(null);
  const requestVersion = useRef(0);
  const load = useCallback(async () => {
    const request = ++requestVersion.current;
    setLoading(true); setError('');
    try {const response = await getDefects(openOnly); if (request === requestVersion.current) {setData(response.data); onSummary(response.data.summary);}}
    catch (err) {if (request === requestVersion.current) setError(getApiErrorMessage(err, 'Could not load defects. Please try again.'));}
    finally {if (request === requestVersion.current) setLoading(false);}
  }, [openOnly, onSummary]);
  useEffect(() => {void load(); return () => {requestVersion.current++;};}, [load]);
  const button = {borderWidth: 1, borderColor: c.border, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9} as const;
  return <Modal transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}><View style={[styles.card, {backgroundColor: c.card, borderColor: c.border}]}>
      <View style={[styles.header, {borderColor: c.border}]}>
        <View style={{flex: 1}}><Text style={{fontSize: 20, fontWeight: '800', color: c.text}}>Defects Flagged</Text><Text style={{fontSize: 12, color: c.muted, marginTop: 4}}>Recorded inspection findings · {data?.summary.openCount ?? '…'} unresolved</Text></View>
        <TouchableOpacity accessibilityLabel="Close defects" onPress={onClose} style={button}><Text style={{color: c.text}}>Close</Text></TouchableOpacity>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => setOpenOnly(true)} style={[button, openOnly && {backgroundColor: c.elevated}]}><Text style={{color: c.text}}>Open Defects</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setOpenOnly(false)} style={[button, !openOnly && {backgroundColor: c.elevated}]}><Text style={{color: c.text}}>All Defects</Text></TouchableOpacity>
        <TouchableOpacity disabled={loading} onPress={() => {void load();}} style={button}><Text style={{color: c.text}}>Refresh</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{padding: 20, gap: 12}}>
        {loading ? <ActivityIndicator color={c.indigo} /> : error ? <Text accessibilityRole="alert" style={{color: c.critical}}>{error}</Text> : !data?.items.length ? <Text style={{color: c.muted}}>{openOnly ? 'No open defects' : 'No recorded defects'}</Text> : data.items.map(item => <View key={item.id} style={[styles.finding, {borderColor: c.border}]}>
          <Text style={{color: c.text, fontSize: 15, fontWeight: '800'}}>{item.projectName} · {item.areaName} · {item.tagNumber}</Text>
          <View style={{flexDirection: 'row', gap: 8, marginVertical: 8, flexWrap: 'wrap'}}><Text style={{color: item.severity === 'High' ? c.critical : item.severity === 'Medium' ? c.yellow : c.muted, fontWeight: '700'}}>{item.severity} severity</Text><Text style={{color: c.indigo, fontWeight: '700'}}>{statuses[item.status] || item.status}</Text></View>
          <Text style={{color: c.text, fontSize: 13}}>{item.observation}</Text>
          {!!item.recommendation && <Text style={{color: c.muted, marginTop: 7}}>Recommendation: {item.recommendation}</Text>}
          <Text style={{color: c.muted, marginTop: 10}}>Reported by: {item.reportedBy}</Text>
          <Text style={{color: c.muted, marginTop: 5}}>Inspection date: {dateLabel(item.inspectionDate)}</Text>
          {!!item.inspectionDueDate && <Text style={{color: c.muted, marginTop: 5}}>Inspection due: {dateLabel(item.inspectionDueDate)}</Text>}
          {item.photos.length > 0 ? <TouchableOpacity accessibilityLabel={`View photos for ${item.tagNumber}`} onPress={() => setPhotos(item.photos.map(photo => photo.downloadUrl))} style={[button, {alignSelf: 'flex-start', marginTop: 12}]}><Text style={{color: c.text}}>View Photos ({item.photos.length})</Text></TouchableOpacity> : <Text style={{color: c.muted, marginTop: 9}}>No defect photos recorded</Text>}
        </View>)}
      </ScrollView>
      <Text style={{color: c.muted, fontSize: 11, paddingHorizontal: 20, paddingBottom: 16}}>Open includes findings awaiting rectification verification. Verified and closed findings are excluded from the open count.</Text>
    </View></View>
    {photos && <ZoomableImageViewer visible images={photos} onClose={() => setPhotos(null)} />}
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(20,23,46,.54)', justifyContent: 'center', alignItems: 'center', padding: 18},
  card: {width: '100%', maxWidth: 900, maxHeight: '92%', borderRadius: 12, borderWidth: 1, overflow: 'hidden'},
  header: {padding: 20, borderBottomWidth: 1, flexDirection: 'row', gap: 12, alignItems: 'center'},
  actions: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingTop: 16},
  finding: {padding: 16, borderRadius: 8, borderWidth: 1},
});
