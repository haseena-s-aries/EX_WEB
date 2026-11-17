import {visual} from '../theme/visual';
import {OPERATIONS_DARK} from '../theme/operationsPalette';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {downloadDefectCsv, downloadDefectPdf, downloadDefectExcel, getDefectRegisterReport, getReportDocumentDetails, ReportDocumentDetails, ReportArtifact, ReportExportHistory, downloadHaerCsv, downloadHaerExcel, downloadHaerPdf, downloadCampaignHandover, downloadInspectionRecord, downloadReportArtifact, getDailyProgressReport, getDefectReport, getInspectionActivityReports, getReportExportHistory, getHaer, getProjectReport, getReportProjects, HaerEquipment, HaerMetadataUpdate, HaerReportData, ReportData, ReportProject, updateHaerMetadata} from '../api/reports';
import {getApiErrorMessage} from '../api/errors';
import {GeneratedReport, reportFileName} from '../reports/types';
import {downloadReportPdf, generateReportPdf, previewReportPdf} from '../reports/pdfFile';
import DefectReportRegisterPreview from '../components/DefectReportRegisterPreview';
import ReportWorkflowPanel from '../components/ReportWorkflowPanel';
import ReportPdfPreview from '../components/ReportPdfPreview';
import {useThemeMode} from '../theme/useThemeMode';
import {LIGHT} from '../theme/palette';
import SearchableOptionPicker from '../components/SearchableOptionPicker';
import ProjectDateField from '../components/ProjectDateField';
import {projectDisplay} from '../utils/projectDisplay';

const OFFSHORE_ART = require('../assets/landing/industry-3.jpg');
const categories = [
  {id: 'inspection', title: 'Inspection Reports', icon: '▣', description: 'Preview, generate and download inspection records.'},
  {id: 'haer', title: 'HAER Reports', icon: '▱', description: 'Equipment register and CSV, PDF or Excel exports.'},
  {id: 'defects', title: 'Defect Reports', icon: '△', description: 'Inspection findings and rectification status.'},
  {id: 'progress', title: 'Progress Reports', icon: '▥', description: 'Daily inspection progress by area and inspector.'},
  {id: 'handover', title: 'Handover & Export', icon: '⬡', description: 'Campaign handover package.'},
  {id: 'history', title: 'Report History', icon: '↶', description: 'Archived report files and export activity.'},
] as const;
type CategoryId = typeof categories[number]['id'];
type ReportAction = {name: string; description: string; label: string; icon: string; disabled?: boolean; run: () => void};

function today() {
  return new Date().toISOString().slice(0, 10);
}

const documentFields = [
  {key: 'uidNumber', label: 'UID Number', maxLength: 100},
  {key: 'documentNumber', label: 'Document Number', maxLength: 200},
  {key: 'revision', label: 'Revision', maxLength: 100},
] as const;

export default function ReportsScreen({onBack, role}: {onBack?: () => void; role?: string}) {
  const dark = useThemeMode() === 'dark';
  const c = dark ? OPERATIONS_DARK : LIGHT;
  const [projects, setProjects] = useState<ReportProject[]>([]);
  const [selected, setSelected] = useState<ReportProject | null>(null);
  const [workflowStatus,setWorkflowStatus]=useState('Ongoing');
  const [pdfMode, setPdfMode] = useState<'preview' | 'generated'>();
  const isSurveyor = role?.toLowerCase() === 'surveyor';
  const [details, setDetails] = useState<ReportDocumentDetails | null>(null);
  const [detailsError, setDetailsError] = useState('');
  const pdfRequest = useRef(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryId>('inspection');
  const [progressDate, setProgressDate] = useState(today);
  const [areas, setAreas] = useState<ReportData['areas']>();
  const [areaError, setAreaError] = useState('');
  const [history, setHistory] = useState<ReportExportHistory>();
  const [historyError, setHistoryError] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [archivePreview, setArchivePreview] = useState<ReportArtifact>();
  const exportLock = useRef(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [haer, setHaer] = useState<HaerReportData | null>(null);
  const [haerAreaId, setHaerAreaId] = useState('');
  const [editingHaerId, setEditingHaerId] = useState('');
  const [haerForm, setHaerForm] = useState<HaerMetadataUpdate | null>(null);
  const [generated, setGenerated] = useState<GeneratedReport | null>(null);
  const [viewing, setViewing] = useState(false);
  const [operational,setOperational]=useState<any>(null);
  const [activityReports, setActivityReports] = useState<Array<{id:string;grade:string;startedAt:string;completedAt?:string|null;reviewStatus:string;tagNumber:string}>>();
  const version = useRef(0);
  const file = useRef<GeneratedReport | null>(null);
  const clearPdf = () => {file.current?.dispose(); file.current = null; setGenerated(null); setPdfMode(undefined); setViewing(false);};
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {const {data: result} = await getReportProjects(); setProjects(result); return result;}
    catch (err) {setError(getApiErrorMessage(err, 'Could not load reports.'));}
    finally {setLoading(false);}
  }, []);
  useEffect(() => {void load(); return () => {version.current++; file.current?.dispose();};}, [load]);
  const select = (project?: ReportProject) => {
    if (project?.id === selected?.id) return;
    version.current++;
    clearPdf();
    setWorkflowStatus("Ongoing");
    setSelected(project ?? null);

    setHaer(null);
    setHaerAreaId('');
    setEditingHaerId('');
    setHaerForm(null);
    setAreas(undefined);
    setAreaError('');
    setActivityReports(undefined);
    setOperational(null);
    setDetails(null);
    setHistory(undefined);
    setHistoryError('');
    setArchivePreview(undefined);
    setProgressDate(today());
    setError('');
  };
  const projectId = selected?.id;
  useEffect(() => {
    if (!projectId) return;
    let active = true;
    setHistoryLoading(true);
    setHistoryError('');
    getReportExportHistory(projectId).then(({data: result}) => {
      if (active) setHistory(result);
    }).catch(err => {
      if (active) setHistoryError(getApiErrorMessage(err, 'Could not load report history.'));
    }).finally(() => {if (active) setHistoryLoading(false);});
    return () => {active = false;};
  }, [projectId, historyRefresh]);

  useEffect(() => {
    if (!projectId || category !== 'haer' || areas) return;
    let active = true;
    setAreaError('');
    getProjectReport(projectId).then(({data: result}) => {
      if (active) setAreas(result.areas);
    }).catch(err => {
      if (active) setAreaError(getApiErrorMessage(err, 'Could not load project areas.'));
    });
    return () => {active = false;};
  }, [category, projectId, areas]);
  const refreshHistory = () => setHistoryRefresh(value => value + 1);
  const preview = async () => {
    if (!selected || busy || pdfRequest.current) return;
    if (file.current) {setViewing(true); return;}
    pdfRequest.current = true;
    const request = ++version.current;
    setBusy(true);
    setError('');
    try {
      const result = await previewReportPdf(selected.id, reportFileName(selected.jobNumber));
      if (request !== version.current) {result.dispose(); return;}
      file.current = result;
      setGenerated(result);
      setPdfMode('preview');
      setViewing(true);
    } catch (err) {
      if (request === version.current) setError(err instanceof Error ? err.message : 'Could not prepare the PDF preview.');
    } finally {
      pdfRequest.current = false;
      if (request === version.current) setBusy(false);
    }
  };
  const openReportDetails = async () => {
    if (!selected || busy || pdfRequest.current) return;
    pdfRequest.current = true;
    const request = version.current;
    setBusy(true);
    setError('');
    setDetailsError('');
    try {
      const response = await getReportDocumentDetails(selected.id);
      if (request === version.current) setDetails(response.data);
    } catch (err) {
      if (request === version.current) setError(getApiErrorMessage(err, 'Could not load report document details.'));
    } finally {
      pdfRequest.current = false;
      if (request === version.current) setBusy(false);
    }
  };
  const generate = async (documentDetails?: ReportDocumentDetails) => {
    if (!selected || busy || pdfRequest.current || (isSurveyor && !documentDetails)) return;
    pdfRequest.current = true;
    const request = ++version.current;
    setBusy(true);
    setError('');
    try {
      const name = reportFileName(selected.jobNumber);
      const result = documentDetails ? await generateReportPdf(selected.id, name, documentDetails) : await generateReportPdf(selected.id, name);
      if (request !== version.current) {result.dispose(); return;}
      file.current?.dispose();
      file.current = result;
      setGenerated(result);
      setPdfMode('generated');
      setDetails(null);
      setViewing(true);
      refreshHistory();
    } catch (err) {
      if (request === version.current) (documentDetails ? setDetailsError : setError)(
        err instanceof Error ? err.message : 'Could not generate PDF.');
    } finally {
      pdfRequest.current = false;
      if (request === version.current) setBusy(false);
    }
  };
  const submitDetails = () => {
    if (!details) return;
    const missing = documentFields.filter(({key}) => !details[key].trim());
    if (missing.length) {
      setDetailsError(`Required fields: ${missing.map(field => field.label).join(', ')}.`);
      return;
    }
    setDetailsError('');
    void generate(details);
  };
  const refreshHaer = async (areaId = haerAreaId) => {if (!selected) return; setBusy(true); setError(''); try {setHaer((await getHaer(selected.id, areaId || undefined)).data); setHaerAreaId(areaId);} catch (err) {setError(getApiErrorMessage(err, 'Could not load the equipment register.'));} finally {setBusy(false);}};
  const beginHaerEdit = (equipment: HaerEquipment) => {setEditingHaerId(equipment.equipmentRecordId); setHaerForm({...equipment, notApplicableFields:Object.entries(equipment.metadataAvailability).filter(([,state])=>state==='NotApplicable').map(([key])=>key), reconciliationStatus:equipment.reconciliationStatus});};
  const saveHaerEdit = async (equipmentId: string) => {if (!selected || !haerForm) return; setBusy(true); setError(''); let saved=false; try {await updateHaerMetadata(equipmentId,haerForm); await refreshHaer(haerAreaId); saved=true;} catch (err) {setError(getApiErrorMessage(err,'Could not save HAER metadata.'));} finally {setBusy(false);if(saved){setEditingHaerId('');setHaerForm(null);}}};
  const runExport = async (action: () => Promise<unknown>, fallback: string, refresh = false) => {
    if (exportLock.current || busy) return;
    exportLock.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
      if (refresh) refreshHistory();
    } catch (err) {setError(getApiErrorMessage(err, fallback));}
    finally {exportLock.current = false; setBusy(false);}
  };
  const exportHaer = (format: 'csv' | 'pdf' | 'excel') => {
    if (!selected) return;
    const download = {csv: downloadHaerCsv, pdf: downloadHaerPdf, excel: downloadHaerExcel}[format];
    return runExport(() => download(selected.id, selected.jobNumber, haerAreaId || undefined), 'Could not export the equipment register.', true);
  };
  const exportDefects = (format: 'csv' | 'pdf' | 'excel') => {
    if (!selected) return;
    const download = {csv:downloadDefectCsv,pdf:downloadDefectPdf,excel:downloadDefectExcel}[format];
    return runExport(() => download(selected.id, selected.jobNumber), 'Could not export the defect register.', true);
  };
  const operationalAction = async (kind: 'progress' | 'defects', date = today()) => {
    if (!selected) return;
    const request = version.current;
    setBusy(true); setError(''); setOperational(null);
    try {
      const response = kind === 'progress' ? await getDailyProgressReport(selected.id, date) : await getDefectRegisterReport(selected.id);
      if (request === version.current) setOperational({kind, date, data: response.data});
    } catch (err) {if (request === version.current) setError(getApiErrorMessage(err, 'Could not load this report.'));}
    finally {if (request === version.current) setBusy(false);}
  };
  const loadActivityReports = async () => {
    if (!selected) return;
    setBusy(true); setError('');
    try {setActivityReports((await getInspectionActivityReports(selected.id)).data);}
    catch (err) {setError(getApiErrorMessage(err, 'Could not load inspection activity reports.'));}
    finally {setBusy(false);}
  };
  const exportHandover = () => selected && runExport(
    () => downloadCampaignHandover(selected.id, selected.jobNumber), 'Could not create the campaign handover package.', true);
  const downloadArchive = (artifact: ReportArtifact) => selected && runExport(
    () => downloadReportArtifact(selected.id, artifact.id, artifact.fileName), 'Could not retrieve the archived report.');
  const button = (label: string, action: () => void, disabled = false) => (
    <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={action}
      style={[styles.button, {backgroundColor: c.elevated, borderColor: c.border, opacity: disabled ? .45 : 1}]}>
      <Text style={{color: dark ? c.cyan : c.indigo, fontWeight: '800'}}>{label}</Text>
    </TouchableOpacity>
  );
  const actions: Record<CategoryId, ReportAction[]> = {
    inspection: [
      {name: 'Preview Report', description: 'Open the inspection report in the PDF viewer.', label: 'Preview Report', icon: '▤', run: () => void preview()},
      {name: 'Generate PDF', description: generated ? 'Generate and save the project inspection report.' : 'Preview the PDF before generating the report.', label: isSurveyor ? 'Generate Report' : 'Generate PDF', icon: 'PDF', disabled: !generated || workflowStatus === 'Submitted', run: () => void (isSurveyor ? openReportDetails() : generate())},
      {name: 'Inspection Activity Reports', description: 'Find individual inspection test records.', label: 'Inspection activity reports', icon: '▣', run: () => void loadActivityReports()},
    ],
    haer: [
      {name: 'HAER Register', description: 'Preview the project equipment register.', label: 'Load HAER register', icon: '▤', run: () => void refreshHaer()},
      {name: 'HAER CSV', description: 'Download equipment data in CSV format.', label: 'Download CSV', icon: 'CSV', run: () => void exportHaer('csv')},
      {name: 'HAER PDF', description: 'Download the equipment register PDF.', label: 'Download HAER PDF', icon: 'PDF', run: () => void exportHaer('pdf')},
      {name: 'HAER Excel', description: 'Download the formatted Excel workbook.', label: 'Download Excel', icon: 'XLSX', run: () => void exportHaer('excel')},
    ],
    defects: [
      {name:'Defect Register',description:'Preview the complete project defect register.',label:'Load Defect register',icon:'▤',run:()=>void operationalAction('defects')},
      {name:'Defect CSV',description:'Download all 16 register columns as CSV.',label:'Download CSV',icon:'CSV',run:()=>void exportDefects('csv')},
      {name:'Defect PDF',description:'Download the landscape register with photos and logos.',label:'Download Defect PDF',icon:'PDF',run:()=>void exportDefects('pdf')},
      {name:'Defect Excel',description:'Download the formatted workbook with embedded photos.',label:'Download Excel',icon:'XLSX',run:()=>void exportDefects('excel')},
    ],
    progress: [
      {name: 'Today Progress', description: 'View progress for the current date.', label: 'Today progress', icon: '▥', run: () => void operationalAction('progress')},
      {name: 'Daily Inspection Progress', description: 'View progress for the date selected below.', label: 'Load daily progress', icon: '▦', run: () => void operationalAction('progress', progressDate), disabled: !progressDate},
    ],
    handover: [{name: 'Campaign Handover ZIP', description: 'Download the existing campaign handover package.', label: 'Campaign handover ZIP', icon: 'ZIP', run: () => void exportHandover()}],
    history: [{name: 'Export History', description: 'Refresh archived files and the project export log.', label: 'Export history', icon: '↶', run: refreshHistory}],
  };
  const activeCategory = categories.find(item => item.id === category)!;
  const query = search.trim().toLowerCase();
  const reportRows = categories.flatMap(item => {
    if (!query && item.id !== category) return [];
    return actions[item.id].filter(action => !query || `${item.title} ${action.name} ${action.description}`.toLowerCase().includes(query))
      .map(action => ({...action, categoryId: item.id}));
  });
  const artifacts = history?.artifacts ?? [];
  const reportCard = [styles.panel, {backgroundColor: c.card, borderColor: c.border}];
  const reportIcon = (text: string) => <View style={[styles.reportIcon, {backgroundColor: c.elevated, borderColor: c.border}]}>
    <Text style={{color: dark ? c.cyan : c.indigo, fontWeight: '900'}}>{text}</Text>
  </View>;
  const archivedRow = (artifact: ReportArtifact, full: boolean) => {
    const format = artifact.fileName.split('.').pop()?.toUpperCase() || 'FILE';
    return <View key={artifact.id} style={[styles.reportRow, {backgroundColor: c.elevated, borderColor: c.border}]}>
      {reportIcon(format)}
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, {color: c.text}]}>{artifact.fileName}</Text>
        <Text style={{color: c.secondary}}>{projectDisplay(selected?.projectName)} · {new Date(artifact.generatedAt).toLocaleString()}</Text>
        {!!artifact.generatedByUserId && <Text style={{color: c.secondary}}>Generated by user {artifact.generatedByUserId}</Text>}
        {full && <Text style={{color: c.secondary}}>{artifact.reportType} · {artifact.reportNumber} · Rev {artifact.revision} · {artifact.approvalState}
          {artifact.documentNumber ? ` · UID ${artifact.uidNumber} · Document ${artifact.documentNumber} · Revision ${artifact.documentRevision}` : ''}
          {!!artifact.sha256 && ` · SHA-256 ${artifact.sha256}`}</Text>}
      </View>
      <View style={styles.toolbar}>
        {format === 'PDF' && button('Preview archived PDF', () => setArchivePreview(artifact), busy)}
        {button(full ? 'Download archived version' : 'Download', () => void downloadArchive(artifact), busy)}
      </View>
    </View>;
  };
  return <ScrollView nativeID="ex-reports" style={{flex: 1, backgroundColor: c.bg}}
    contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    {onBack && <View style={styles.toolbar}>{button('Back', onBack)}</View>}
    <View nativeID="ex-reports-hero" style={styles.hero}>
      <Image source={OFFSHORE_ART} resizeMode="cover" style={styles.heroPhoto} accessible={false} />
      <View nativeID="ex-operations-hero-overlay" pointerEvents="none"
        style={[StyleSheet.absoluteFill, Platform.OS !== 'web' && styles.nativeOverlay]} />
      <Text style={styles.eyebrow}>DOCUMENTS  /  REPORTS</Text>
      <Text accessibilityRole="header" style={styles.heroTitle}>Report <Text style={styles.accent}>Center</Text></Text>
      <Text style={styles.heroDescription}>Generate, preview and download project reports, registers, and exports.</Text>
    </View>
    <View nativeID="ex-report-controls" style={styles.reportControls}>
      <View style={styles.projectPicker}>
        <Text style={{color: c.text, fontWeight: '800', marginBottom: 4}}>Project</Text>
        <SearchableOptionPicker label="Report project" placeholder={loading ? 'Loading projects…' : 'Select a project'}
          value={projectId || ''} options={projects.map(project => ({value: project.id, label: project.jobNumber
            ? `${projectDisplay(project.projectName)} (${projectDisplay(project.jobNumber)})` : projectDisplay(project.projectName)}))}
          onChange={id => select(projects.find(project => project.id === id))} dark={dark} disabled={busy || loading} />
      </View>
      <View style={styles.reportSearchField}>
        <Text style={{color: c.text, fontWeight: '800'}}>Search reports</Text>
        <View style={[styles.searchBox, {backgroundColor: c.card, borderColor: c.border}]}>
        <Text accessible={false} style={{color: dark ? c.cyan : c.indigo, fontSize: 23}}>⌕</Text>
        <TextInput accessibilityLabel="Search reports" placeholder="Search reports…" placeholderTextColor={c.muted}
          value={search} onChangeText={setSearch} style={[styles.searchInput, {color: c.text}]} />
        </View>
      </View>
      <View style={{alignSelf: 'flex-end', flexShrink: 0}}>{button('Refresh', () => void load().then(result => {
        if (result && selected && !result.some(project => project.id === selected.id)) select();
        else refreshHistory();
      }), loading || busy)}</View>
    </View>
    {projectId&&<ReportWorkflowPanel projectId={projectId} refreshKey={historyRefresh} onSaved={refreshHistory} onBusy={setBusy} onStatus={status=>{setWorkflowStatus(status);if(status==='Submitted'){clearPdf();setDetails(null);}}}/>}
    {!loading && !projects.length && <Text style={{color: c.secondary}}>No projects available for reports</Text>}
    {!!details && <Modal transparent visible animationType="fade" onRequestClose={() => {if (!busy) setDetails(null);}}>
      <View style={{flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 16}}>
        <ScrollView keyboardShouldPersistTaps="handled" style={{flexGrow: 0, width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: c.card, borderRadius: 12}} contentContainerStyle={{padding: 20, gap: 14}}>
          <Text accessibilityRole="header" style={{color: c.text, fontWeight: '800', fontSize: 20}}>Report Document Details</Text>
          <Text style={{color: c.muted}}>Please fill in the following details before proceeding to generate the report.</Text>
          {documentFields.map(({key, label, maxLength}) => <View key={key} style={{gap: 6}}>
            <Text style={{color: c.text, fontWeight: '700'}}>{label} *</Text>
            <TextInput accessibilityLabel={label} autoFocus={key === 'uidNumber'} editable={!busy} value={details[key]} maxLength={maxLength} onChangeText={value => setDetails({...details, [key]: value})} style={{color: c.text, borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 12}} />
          </View>)}
          {!!detailsError && <Text accessibilityRole="alert" style={{color: c.critical}}>{detailsError}</Text>}
          <View style={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8}}>
            {button('Cancel', () => setDetails(null), busy)}
            {button(busy ? 'Generating…' : 'Save & Generate Report', submitDetails, busy)}
          </View>
        </ScrollView>
      </View>
    </Modal>}
    {pdfMode === 'generated' && <Text accessibilityLiveRegion="polite" style={{color: c.text}}>Report generated successfully.</Text>}
    {!!error && <Text accessibilityRole="alert" style={{color: c.critical}}>{error}</Text>}
    <View nativeID="ex-report-categories" style={styles.categoryGrid}>
      {categories.map(item => {
        const selectedCategory = category === item.id;
        return <TouchableOpacity key={item.id} accessibilityRole="button" accessibilityLabel={item.title}
          accessibilityState={{selected: selectedCategory, disabled: busy}} disabled={busy}
          onPress={() => {
            setCategory(item.id);
            setSearch('');
            setError('');
            if (item.id === 'history' && selected) refreshHistory();
          }}
          style={[styles.categoryCard, {backgroundColor: selectedCategory ? c.elevated : c.card,
            borderColor: selectedCategory ? (dark ? c.cyan : c.indigo) : c.border}]}>
          <View style={styles.categoryTop}>{reportIcon(item.icon)}{selectedCategory && <Text style={{color: dark ? c.cyan : c.indigo, fontWeight: '900'}}>✓</Text>}</View>
          <Text style={[styles.categoryTitle, {color: c.text}]}>{item.title}</Text>
          <Text style={[styles.categoryDescription, {color: c.secondary}]}>{item.description}</Text>
          <Text style={[styles.count, {color: dark ? c.cyan : c.indigo, borderColor: c.border}]}>
            {item.id === 'history' ? 'View History' : `${actions[item.id].length} ${actions[item.id].length === 1 ? 'report' : 'reports'}`}
          </Text>
        </TouchableOpacity>;
      })}
    </View>
    <View nativeID="ex-report-content" style={styles.contentLayout}>
      <View testID="report-center-panel" style={reportCard}>
        <View style={styles.panelHeader}>
          {reportIcon(query ? '⌕' : activeCategory.icon)}
          <View style={styles.rowCopy}>
            <Text accessibilityRole="header" style={[styles.panelTitle, {color: c.text}]}>{query ? 'Search results' : activeCategory.title}</Text>
            <Text style={{color: c.secondary}}>{query ? 'Matching report types across all categories.' : activeCategory.description}</Text>
          </View>
        </View>
        {!selected && <Text style={{color: c.secondary}}>Select a project to preview or export reports.</Text>}
        {!reportRows.length && <Text style={{color: c.secondary}}>No report types match your search.</Text>}
        {reportRows.map(row => <View key={row.name} style={[styles.reportRow, {backgroundColor: c.elevated, borderColor: c.border}]}>
          {reportIcon(row.icon)}
          <View style={styles.rowCopy}>
            <Text style={[styles.rowTitle, {color: c.text}]}>{row.name}</Text>
            <Text style={{color: c.secondary}}>{row.description}</Text>
          </View>
          {button(row.label, () => {setCategory(row.categoryId); setSearch(''); row.run();}, busy || !selected || row.disabled)}
        </View>)}
        {busy && <View accessibilityLiveRegion="polite" style={styles.toolbar}><ActivityIndicator color={c.indigo} />
          <Text style={{color: c.secondary}}>Working on your report…</Text></View>}
        {selected && !query && (category === 'haer' || category === 'progress') && <View style={[styles.filters, {borderColor: c.border}]}>
          <Text accessibilityRole="header" style={[styles.rowTitle, {color: c.text}]}>Report Filters (Optional)</Text>
          <View style={styles.toolbar}>
            <View style={styles.filterField}>
              {category === 'haer' ? <>
                <Text style={{color: c.secondary, marginBottom: 5}}>Area</Text>
                <SearchableOptionPicker label="HAER area" placeholder="All areas" value={haerAreaId}
                  options={[{label: 'All areas', value: ''}, ...(areas ?? []).flatMap(area => area.id ? [{label: area.name, value: area.id}] : [])]}
                  onChange={value => {setHaerAreaId(value); setHaer(null); setEditingHaerId(''); setHaerForm(null);}} dark={dark} disabled={busy} />
              </> : <ProjectDateField label="Report date" value={progressDate} onChange={setProgressDate} disabled={busy} />}
            </View>
            {button('Reset Filters', () => {
              if (category === 'haer') {setHaerAreaId(''); setHaer(null); setEditingHaerId(''); setHaerForm(null);}
              else {setProgressDate(today()); setOperational(null);}
            }, busy)}
          </View>
          {category === 'haer' && !!areaError && <Text accessibilityRole="alert" style={{color: c.critical}}>{areaError}</Text>}
        </View>}
        {!query && category === 'inspection' && !!generated && <View style={styles.toolbar}>
          {button('Preview PDF', () => setViewing(true), busy)}
          {button('Download PDF', () => void runExport(() => downloadReportPdf(generated), 'Could not download the PDF.'), busy)}
        </View>}
      {!query && operational?.kind === category &&<View style={{padding:12,backgroundColor:c.elevated,borderRadius:8,gap:6}}><Text style={{color:c.text,fontWeight:'800'}}>{operational.kind==='progress'?'Daily inspection progress · ' + operational.date:'Defect status report'}</Text>{operational.kind==='progress'&&<><Text style={{color:c.muted}}>Planned {operational.data.planned} · Completed {operational.data.completed} · Close {operational.data.closeCompleted} · Detailed {operational.data.detailedCompleted} · QC approved {operational.data.qcApproved} · Outstanding {operational.data.outstanding} · Inaccessible {operational.data.inaccessible} · Delayed {operational.data.delays?.length||0} · Carry-forward {operational.data.carryForward}. QC approval is not a compliance determination.</Text>{(operational.data.areas||[]).map((x:any,i:number)=><Text key={`area-${i}`} style={{color:c.muted}}>Area {x.area}: {x.completed}/{x.planned}</Text>)}{(operational.data.inspectors||[]).map((x:any,i:number)=><Text key={`insp-${i}`} style={{color:c.muted}}>Inspector {x.inspector}: {x.completed}/{x.planned}</Text>)}</>}{operational.kind==='defects'&&<DefectReportRegisterPreview report={operational.data} colors={c}/>}</View>}
      {!query && category === 'inspection' && activityReports &&<View style={{padding:12,backgroundColor:c.elevated,borderRadius:8,gap:8}}><Text style={{color:c.text,fontWeight:'800'}}>Inspection test records</Text>{!activityReports.length && <Text style={{color:c.secondary}}>No inspection test records for this project.</Text>}{activityReports.map(item=><View key={item.id} style={{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'}}><Text style={{color:c.muted,flex:1}}>{item.tagNumber} · {item.grade} · {item.reviewStatus} · {new Date(item.startedAt).toLocaleDateString()}</Text>{button('Download ITR PDF',()=>{void runExport(() => downloadInspectionRecord(item.id), 'Could not download the inspection record.', true);},busy)}</View>)}</View>}
        {!query && category === 'haer' && haer && <View style={{gap: 8}}>
          <Text accessibilityRole="header" style={[styles.panelTitle, {color: c.text}]}>Hazardous Area Equipment Register</Text>
          {!haer.equipment.length && <Text style={{color: c.secondary}}>No equipment in this area.</Text>}
        {haer?.equipment.map((equipment,index)=><View key={`${equipment.tagNumber}-${index}`} style={{padding:11,backgroundColor:c.elevated,borderRadius:7,gap:3}}><Text style={{color:c.text,fontWeight:'800'}}>Item {equipment.sequenceNo} · {equipment.tagNumber} · {equipment.equipmentType}</Text><Text style={{color:c.muted}}>{equipment.description||'Description: unknown'} · {equipment.area} · {equipment.location||'Location: unknown'}</Text><Text style={{color:c.muted}}>Manufacturer/model/serial: {[equipment.manufacturer,equipment.model,equipment.serialNumber].map((x,n)=>{const key=['manufacturer','model','serialNumber'][n]; return x||((equipment.metadataAvailability[key]==='NotApplicable')?'Not applicable':'Unknown');}).join(' / ')}</Text><Text style={{color:c.muted}}>Ex: {equipment.exProtectionType||'Unknown'} · Gas {equipment.gasGroup||'Unknown'} · Temp {equipment.temperatureClass||'Unknown'} · Zone {equipment.hazardousAreaZone||'Unknown'} · Ambient {equipment.ambientTemperatureRange||'Unknown'} · IP {equipment.ipRating||'Unknown'}</Text><Text style={{color:c.muted}}>Certificate: {equipment.certificateNumber||'Unknown'} · Notified body: {equipment.notifiedBody||'Unknown'} · Special conditions: {equipment.specialConditionsOfUse||'Unknown'} · Circuit: {equipment.circuitId||'Unknown'}</Text><Text style={{color:c.muted}}>RFID: {equipment.rfidTagUid||'Unknown'} ({equipment.rfidIdentificationMethod||'method unknown'})</Text><Text style={{color:c.muted}}>Latest: {equipment.lastInspectionGrade||'Unknown'} / {equipment.lastInspectionAt?new Date(equipment.lastInspectionAt).toLocaleDateString():'Unknown'} / {equipment.lastInspectionResult||'Unknown'} · Outstanding defects: {equipment.outstandingDefects} · Reconciliation: {equipment.reconciliationStatus}</Text><Text style={{color:c.muted}}>Inspection history: {equipment.inspectionHistory.length ? equipment.inspectionHistory.map(h=>`${h.grade} · ${h.inspectedAt?new Date(h.inspectedAt).toLocaleDateString():'date unknown'} · ${h.status} · ${h.result}`).join(' | ') : 'No inspection history recorded'}</Text><Text style={{color:c.muted}}>Outstanding defect states: {equipment.outstandingDefectStatuses.length?equipment.outstandingDefectStatuses.join(' · '):'None'}</Text><Text style={{color:c.muted}}>Unknown means no value is recorded; Not Applicable appears only when explicitly confirmed.</Text>{['Admin','Manager'].includes(role||'')&&button(editingHaerId===equipment.equipmentRecordId?'Cancel metadata edit':'Edit HAER metadata',()=>editingHaerId===equipment.equipmentRecordId?(setEditingHaerId(''),setHaerForm(null)):beginHaerEdit(equipment),busy)}{editingHaerId===equipment.equipmentRecordId&&haerForm&&<View style={{gap:7,marginTop:5}}>{(['description','location','manufacturer','model','serialNumber','exProtectionType','gasGroup','temperatureClass','hazardousAreaZone','ambientTemperatureRange','ipRating','certificateNumber','notifiedBody','specialConditionsOfUse','circuitId','rfidTagUid','rfidIdentificationMethod'] as const).map(key=><TextInput key={key} accessibilityLabel={`HAER ${key}`} placeholder={`${key} · leave empty when unknown`} value={haerForm[key]||''} onChangeText={value=>setHaerForm(current=>current?({...current,[key]:value||null}):current)} style={{backgroundColor:c.card,color:c.text,padding:9,borderRadius:6,borderWidth:1,borderColor:c.border}}/>)}<TextInput accessibilityLabel="HAER reconciliation status" placeholder="Reconciliation status: Unreviewed, NeedsReview, Reconciled or Exception" value={haerForm.reconciliationStatus} onChangeText={value=>setHaerForm(current=>current?({...current,reconciliationStatus:value}):current)} style={{backgroundColor:c.card,color:c.text,padding:9,borderRadius:6,borderWidth:1,borderColor:c.border}}/><Text style={{color:c.muted}}>Confirmed Not Applicable fields (comma separated field names)</Text><TextInput accessibilityLabel="HAER Not Applicable fields" value={haerForm.notApplicableFields.join(', ')} onChangeText={value=>setHaerForm(current=>current?({...current,notApplicableFields:value.split(',').map(x=>x.trim()).filter(Boolean)}):current)} style={{backgroundColor:c.card,color:c.text,padding:9,borderRadius:6,borderWidth:1,borderColor:c.border}}/>{button('Save HAER metadata',()=>{void saveHaerEdit(equipment.equipmentRecordId);},busy)}</View>}</View>)}
        {haer && <Text style={{color:c.muted}}>Client Company Name: {haer.clientName||'Unknown'} · Revision: {haer.revision||'Unspecified'} · Generated: {new Date(haer.generatedAt).toLocaleString()}</Text>}
        </View>}
        {!query && category === 'history' && selected && <>
          {artifacts.map(artifact => archivedRow(artifact, true))}
          {!!history?.events.length && <Text style={[styles.rowTitle, {color: c.text}]}>Export activity</Text>}
          {history?.events.map(event => <Text key={event.id} style={{color: c.secondary}}>
            {event.action} · {new Date(event.occurredAt).toLocaleString()}{event.comments ? ` · ${event.comments}` : ''}
          </Text>)}
        </>}
      </View>
      <View testID="report-center-panel" style={reportCard}>
        <View style={styles.panelHeader}>
          {reportIcon('◷')}
          <Text accessibilityRole="header" style={[styles.panelTitle, styles.rowCopy, {color: c.text}]}>Recent Reports</Text>
          {button('View All', () => {setCategory('history'); setSearch(''); refreshHistory();}, !selected || busy)}
        </View>
        {!selected ? <Text style={{color: c.secondary}}>Select a project to see recent reports.</Text> :
          historyLoading ? <ActivityIndicator color={c.cyan} /> :
          historyError ? <View style={{gap: 8}}>
            <Text accessibilityRole="alert" style={{color: c.critical}}>{historyError}</Text>
            {button('Retry history', refreshHistory)}
          </View> :
          artifacts.length ? artifacts.slice(0, 5).map(artifact => archivedRow(artifact, false)) :
          <Text style={{color: c.secondary}}>No reports generated for this project yet.</Text>}
      </View>
    </View>
    {archivePreview && selected && (() => {
      const Viewer = require('../components/HazardousAreaPlanViewer').default;
      return <Viewer title={archivePreview.fileName}
        path={archivePreview.downloadUrl || `/api/reports/projects/${selected.id}/artifacts/${archivePreview.id}`}
        contentType="application/pdf" onClose={() => setArchivePreview(undefined)}
        onDownload={() => {setArchivePreview(undefined); void downloadArchive(archivePreview);}} />;
    })()}
    {viewing && generated && !details && <ReportPdfPreview key={generated.uri} report={generated}
      projectName={projectDisplay(selected?.projectName)} busy={busy} error={error}
      onClose={() => setViewing(false)}
      onGenerate={pdfMode === 'preview' && workflowStatus !== 'Submitted' ? () => void (isSurveyor ? openReportDetails() : generate()) : undefined}
      onDownload={() => void runExport(() => downloadReportPdf(generated), 'Could not download the PDF.')} />}
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: {padding: 16, paddingBottom: 32, gap: 16, width: '100%', alignSelf: 'center'},
  hero: {minHeight: 160, padding: 22, justifyContent: 'center', gap: 6, borderRadius: 17, borderWidth: 1,
    borderColor: '#126078', backgroundColor: '#03192C', overflow: 'hidden'},
  heroPhoto: {position: 'absolute', right: 0, width: '74%', height: '100%'},
  nativeOverlay: {backgroundColor: '#03192C88'},
  eyebrow: {color: '#00D9EE', fontFamily: visual.mono, fontSize: 11, fontWeight: '800', letterSpacing: 1.8},
  heroTitle: {color: '#F5FAFF', fontFamily: visual.display, fontSize: 42, fontStyle: 'italic', fontWeight: '900'},
  accent: {color: '#00D9EE'},
  heroDescription: {color: '#F5FAFF', fontSize: 14, lineHeight: 20},
  toolbar: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center'},
  button: {minHeight: 42, justifyContent: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, borderWidth: 1},
  reportControls: {flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', minWidth: 0},
  reportSearchField: {flexGrow: 1, flexShrink: 1, flexBasis: 260, minWidth: 0, maxWidth: '100%', gap: 4},
  searchBox: {width: '100%', minWidth: 0, minHeight: 45, flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1},
  searchInput: {flexGrow: 1, flexShrink: 1, flexBasis: 0, width: '100%', minWidth: 0, minHeight: 42, paddingVertical: 10, fontSize: 14},
  projectPicker: {flexBasis: 340, flexGrow: 1, flexShrink: 1, minWidth: 0, maxWidth: '100%'},
  categoryGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  categoryCard: {flexBasis: 145, flexGrow: 1, minWidth: 0, borderWidth: 1, borderRadius: 14, padding: 15, gap: 8},
  categoryTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  categoryTitle: {fontSize: 16, fontWeight: '900'},
  categoryDescription: {fontSize: 13, lineHeight: 18, flexGrow: 1},
  count: {alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, borderWidth: 1, fontSize: 12, fontWeight: '700'},
  contentLayout: {gap: 14, minWidth: 0},
  panel: {padding: 14, gap: 10, minWidth: 0, borderWidth: 1, borderRadius: 14},
  panelHeader: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingBottom: 4},
  panelTitle: {fontSize: 20, fontWeight: '900'},
  reportRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', borderWidth: 1, borderRadius: 9, padding: 10},
  rowCopy: {flexGrow: 1, flexShrink: 1, flexBasis: 135, minWidth: 0, gap: 3},
  rowTitle: {fontSize: 14, fontWeight: '800'},
  reportIcon: {minWidth: 37, minHeight: 37, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 8},
  filters: {borderTopWidth: 1, paddingTop: 12, gap: 8},
  filterField: {flexGrow: 1, flexBasis: 210, maxWidth: 360},
});
