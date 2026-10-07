import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {getProjectReport, getReportProjects, ReportData, ReportProject} from '../api/reports';
import {getApiErrorMessage} from '../api/errors';
import {GeneratedReport, reportFileName} from '../reports/types';
import {downloadReportPdf, generateReportPdf} from '../reports/pdfFile';
import ReportPdfPreview from '../components/ReportPdfPreview';
import {useThemeMode} from '../theme/useThemeMode';
import {DARK, LIGHT} from '../theme/palette';

export default function ReportsScreen({onBack}: {onBack?: () => void}) {
  const c = useThemeMode() === 'dark' ? DARK : LIGHT;
  const [projects, setProjects] = useState<ReportProject[]>([]);
  const [selected, setSelected] = useState<ReportProject | null>(null);
  const [data, setData] = useState<ReportData | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState<GeneratedReport | null>(null);
  const [viewing, setViewing] = useState(false);
  const version = useRef(0);
  const file = useRef<GeneratedReport | null>(null);
  const clearPdf = () => {file.current?.dispose(); file.current = null; setGenerated(null); setViewing(false);};
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {setProjects((await getReportProjects()).data);}
    catch (err) {setError(getApiErrorMessage(err, 'Could not load reports.'));}
    finally {setLoading(false);}
  }, []);
  useEffect(() => {void load(); return () => {version.current++; file.current?.dispose();};}, [load]);
  const select = (project: ReportProject) => {version.current++; clearPdf(); setSelected(project); setData(null); setError('');};
  const preview = async () => {
    if (!selected) return; const request = ++version.current; setBusy(true); setError(''); clearPdf();
    try {const response = await getProjectReport(selected.id); if (request === version.current) setData(response.data);}
    catch (err) {if (request === version.current) setError(getApiErrorMessage(err, 'Could not load report data.'));}
    finally {if (request === version.current) setBusy(false);}
  };
  const generate = async () => {
    if (!selected || !data) return; const request = ++version.current; setBusy(true); setError(''); clearPdf();
    try {const result = await generateReportPdf(selected.id, reportFileName(selected.jobNumber)); if (request === version.current) {file.current = result; setGenerated(result);} else result.dispose();}
    catch (err) {if (request === version.current) setError(getApiErrorMessage(err, 'Could not generate PDF.'));}
    finally {if (request === version.current) setBusy(false);}
  };
  const button = (label: string, action: () => void, disabled = false) => <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={action} style={{paddingHorizontal: 16, paddingVertical: 11, borderRadius: 8, backgroundColor: c.indigo, opacity: disabled ? .45 : 1}}><Text style={{color: '#fff', fontWeight: '700'}}>{label}</Text></TouchableOpacity>;
  return <ScrollView style={{flex: 1, backgroundColor: c.bg}} contentContainerStyle={{padding: 24, gap: 16, width: '100%', maxWidth: 1200, alignSelf: 'center'}}>
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap'}}>
      <View style={{flex: 1}}><Text style={{fontSize: 24, fontWeight: '800', color: c.text}}>Reports</Text><Text style={{color: c.muted, marginTop: 6}}>Project data → Preview Report → Generate PDF → Download PDF</Text></View>
      {onBack && button('Back', onBack)}{button('Refresh', () => {clearPdf(); setData(null); void load();}, loading || busy)}
    </View>
    {!!error && <Text accessibilityRole="alert" style={{color: c.critical}}>{error}</Text>}
    <TextInput accessibilityLabel="Search report projects" placeholder="Search project or job number" placeholderTextColor={c.muted} value={search} onChangeText={setSearch} style={{backgroundColor: c.card, color: c.text, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: c.border}} />
    {loading ? <ActivityIndicator color={c.indigo} /> : projects.length === 0 ? <Text style={{color: c.muted}}>No projects available for reports</Text> : projects.filter(p => `${p.projectName} ${p.jobNumber}`.toLowerCase().includes(search.toLowerCase())).map(project => <TouchableOpacity key={project.id} accessibilityRole="button" accessibilityLabel={`Select report project ${project.projectName}`} disabled={busy} onPress={() => select(project)} style={{borderWidth: 1, borderColor: selected?.id === project.id ? c.indigo : c.border, backgroundColor: c.card, borderRadius: 10, padding: 16}}>
      <Text style={{color: c.text, fontWeight: '800'}}>{project.projectName}</Text><Text style={{color: c.muted, marginTop: 5}}>Job: {project.jobNumber} · Location: {project.location}</Text>
    </TouchableOpacity>)}
    {selected && <View style={{backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 18, gap: 14}}>
      <Text style={{color: c.text, fontSize: 18, fontWeight: '800'}}>{selected.projectName}</Text>
      <View style={{flexDirection: 'row', gap: 10, flexWrap: 'wrap'}}>
        {button('Preview Report', () => {void preview();}, busy)}
        {button('Generate PDF', () => {void generate();}, busy || !data)}
        {!!generated && button('Preview PDF', () => setViewing(true), busy)}
        {!!generated && button('Download PDF', () => {void downloadReportPdf(generated).catch(err => setError(getApiErrorMessage(err, 'Could not download the PDF.')));}, busy)}
      </View>
      {busy && <View><ActivityIndicator color={c.indigo} /><Text style={{color: c.muted, marginTop: 6}}>Loading the complete report. Large projects may take a moment.</Text></View>}
      {data && <View style={{gap: 8}}>
        <Text style={{color: c.text}}>Vessel / Site: {data.siteName} · Client: {data.client}</Text>
        <Text style={{color: c.text}}>Prepared By: {data.preparedBy} · Checked By: {data.checkedBy}</Text>
        <Text style={{color: c.muted}}>Cover Page → Revision History → Contents → Introduction → Hazardous Area Plan → Equipment Register & Layout → Defect Register → IEC 60079-17 Checklists</Text>
        <Text style={{color: c.muted}}>{data.hazardousAreaPlan ? 'Uploaded Hazardous Area Plan included' : 'No Hazardous Area Plan Uploaded'}</Text>
        {data.areas.map((area, n) => <View key={`${n}-${area.name}`} style={{padding: 12, backgroundColor: c.elevated, borderRadius: 7}}><Text style={{color: c.text, fontWeight: '700'}}>{area.name}</Text><Text style={{color: c.muted, marginTop: 5}}>{area.equipment.length} equipment · {area.equipment.reduce((sum, e) => sum + e.inspections.length, 0)} inspection records · {area.layout ? 'Layout with saved pins' : 'No layout uploaded'}</Text></View>)}
        <Text style={{color: c.muted}}>The PDF uses saved inspection answers, comments, findings, recommendations, photos and QC results. Optional unavailable fields are shown as '-'.</Text>
      </View>}
    </View>}
    {viewing && generated && <ReportPdfPreview report={generated} onClose={() => setViewing(false)} />}
  </ScrollView>;
}
