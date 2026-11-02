import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {downloadHaerCsv, downloadHaerExcel, downloadHaerPdf, downloadCampaignHandover, downloadInspectionRecord, downloadReportArtifact, getDailyProgressReport, getDefectReport, getInspectionActivityReports, getReportExportHistory, getHaer, getProjectReport, getReportProjects, HaerEquipment, HaerMetadataUpdate, HaerReportData, ReportData, ReportProject, updateHaerMetadata} from '../api/reports';
import {getApiErrorMessage} from '../api/errors';
import {GeneratedReport, reportFileName} from '../reports/types';
import {downloadReportPdf, generateReportPdf} from '../reports/pdfFile';
import ReportPdfPreview from '../components/ReportPdfPreview';
import {useThemeMode} from '../theme/useThemeMode';
import {DARK, LIGHT} from '../theme/palette';

export default function ReportsScreen({onBack, role}: {onBack?: () => void; role?: string}) {
  const c = useThemeMode() === 'dark' ? DARK : LIGHT;
  const [projects, setProjects] = useState<ReportProject[]>([]);
  const [selected, setSelected] = useState<ReportProject | null>(null);
  const [data, setData] = useState<ReportData | null>(null);
  const [search, setSearch] = useState('');
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
  const [activityReports,setActivityReports]=useState<Array<{id:string;grade:string;startedAt:string;completedAt?:string|null;reviewStatus:string;tagNumber:string}>>([]);
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
  const select = (project: ReportProject) => {version.current++; clearPdf(); setSelected(project); setData(null); setHaer(null); setHaerAreaId(''); setError('');};
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
  const refreshHaer = async (areaId = haerAreaId) => {if (!selected) return; setBusy(true); setError(''); try {setHaer((await getHaer(selected.id, areaId || undefined)).data); setHaerAreaId(areaId);} catch (err) {setError(getApiErrorMessage(err, 'Could not load the equipment register.'));} finally {setBusy(false);}};
  const beginHaerEdit = (equipment: HaerEquipment) => {setEditingHaerId(equipment.equipmentRecordId); setHaerForm({...equipment, notApplicableFields:Object.entries(equipment.metadataAvailability).filter(([,state])=>state==='NotApplicable').map(([key])=>key), reconciliationStatus:equipment.reconciliationStatus});};
  const saveHaerEdit = async (equipmentId: string) => {if (!selected || !haerForm) return; setBusy(true); setError(''); let saved=false; try {await updateHaerMetadata(equipmentId,haerForm); await refreshHaer(haerAreaId); saved=true;} catch (err) {setError(getApiErrorMessage(err,'Could not save HAER metadata.'));} finally {setBusy(false);if(saved){setEditingHaerId('');setHaerForm(null);}}};
  const exportHaer = async (format: 'csv'|'pdf'|'excel') => {if (!selected) return; setBusy(true); setError(''); try {if (format === 'csv') await downloadHaerCsv(selected.id, selected.jobNumber, haerAreaId || undefined); else if (format === 'pdf') await downloadHaerPdf(selected.id, selected.jobNumber, haerAreaId || undefined); else await downloadHaerExcel(selected.id, selected.jobNumber, haerAreaId || undefined);} catch (err) {setError(getApiErrorMessage(err, 'Could not export the equipment register.'));} finally {setBusy(false);}};
  const operationalAction=async(kind:'progress'|'defects'|'history')=>{if(!selected)return;setBusy(true);setError('');try{const response=kind==='progress'?await getDailyProgressReport(selected.id,new Date().toISOString().slice(0,10)):kind==='defects'?await getDefectReport(selected.id):await getReportExportHistory(selected.id);setOperational({kind,data:response.data});if(kind==='history')return; }catch(err){setError(getApiErrorMessage(err,'Could not load this report.'));}finally{setBusy(false);}};
  const loadActivityReports=async()=>{if(!selected)return;setBusy(true);setError('');try{setActivityReports((await getInspectionActivityReports(selected.id)).data);}catch(err){setError(getApiErrorMessage(err,'Could not load inspection activity reports.'));}finally{setBusy(false);}};
  const exportHandover=async()=>{if(!selected)return;setBusy(true);setError('');try{await downloadCampaignHandover(selected.id,selected.jobNumber);}catch(err){setError(getApiErrorMessage(err,'Could not create the campaign handover package.'));}finally{setBusy(false);}};
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
        {button('Load HAER register', () => {void refreshHaer('');}, busy)}
        {button('HAER CSV', () => {void exportHaer('csv');}, busy)}
        {button('HAER PDF', () => {void exportHaer('pdf');}, busy)}
        {button('HAER Excel', () => {void exportHaer('excel');}, busy)}
        {button('Preview Report', () => {void preview();}, busy)}
        {button('Generate PDF', () => {void generate();}, busy || !data)}
        {button('Today progress',()=>{void operationalAction('progress');},busy)}
        {button('Defect report',()=>{void operationalAction('defects');},busy)}
        {button('Inspection activity reports',()=>{void loadActivityReports();},busy)}
        {button('Campaign handover ZIP',()=>{void exportHandover();},busy)}
        {button('Export history',()=>{void operationalAction('history');},busy)}
        {!!generated && button('Preview PDF', () => setViewing(true), busy)}
        {!!generated && button('Download PDF', () => {void downloadReportPdf(generated).catch(err => setError(getApiErrorMessage(err, 'Could not download the PDF.')));}, busy)}
      </View>
      {busy && <View><ActivityIndicator color={c.indigo} /><Text style={{color: c.muted, marginTop: 6}}>Loading the complete report. Large projects may take a moment.</Text></View>}
      {operational&&<View style={{padding:12,backgroundColor:c.elevated,borderRadius:8,gap:6}}><Text style={{color:c.text,fontWeight:'800'}}>{operational.kind==='progress'?'Daily inspection progress':operational.kind==='defects'?'Defect status report':'Export history'}</Text>{operational.kind==='progress'&&<><Text style={{color:c.muted}}>Planned {operational.data.planned} · Completed {operational.data.completed} · Close {operational.data.closeCompleted} · Detailed {operational.data.detailedCompleted} · QC approved {operational.data.qcApproved} · Outstanding {operational.data.outstanding} · Inaccessible {operational.data.inaccessible} · Delayed {operational.data.delays?.length||0} · Carry-forward {operational.data.carryForward}. QC approval is not a compliance determination.</Text>{(operational.data.areas||[]).map((x:any,i:number)=><Text key={`area-${i}`} style={{color:c.muted}}>Area {x.area}: {x.completed}/{x.planned}</Text>)}{(operational.data.inspectors||[]).map((x:any,i:number)=><Text key={`insp-${i}`} style={{color:c.muted}}>Inspector {x.inspector}: {x.completed}/{x.planned}</Text>)}</>}{operational.kind==='defects'&&<><Text style={{color:c.muted}}>Total {operational.data.summary?.total??operational.data.items?.length??0} · Open {operational.data.summary?.open??0} · Overdue {operational.data.summary?.overdue??0} · Awaiting Aries verification {operational.data.summary?.awaitingAriesVerification??0} · Awaiting client closure {operational.data.summary?.awaitingClientClosure??0} · Client closed {operational.data.summary?.clientClosed??0}</Text>{(operational.data.items||[]).slice(0,50).map((x:any)=><Text key={x.id} style={{color:c.muted}}>{x.equipmentTag} · {x.area} · {x.severityCode||'Unclassified'} · {x.statusCode} · {x.observation}</Text>)}</>}{operational.kind==='history'&&<>{(operational.data.artifacts||[]).map((x:any)=><View key={x.id} style={{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'}}><Text style={{color:c.muted,flex:1}}>{x.reportNumber} · Rev {x.revision} · {x.approvalState} · {new Date(x.generatedAt).toLocaleString()} · SHA-256 {x.sha256}</Text>{button('Download archived version',()=>{void downloadReportArtifact(selected!.id,x.id,x.fileName).catch(err=>setError(getApiErrorMessage(err,'Could not retrieve the archived report.')));},busy)}</View>)}{(operational.data.events||[]).map((x:any)=><Text key={x.id} style={{color:c.muted}}>{x.action} · {new Date(x.occurredAt).toLocaleString()} · {x.comments||''}</Text>)}</>}</View>}
      {activityReports.length>0&&<View style={{padding:12,backgroundColor:c.elevated,borderRadius:8,gap:8}}><Text style={{color:c.text,fontWeight:'800'}}>Inspection test records</Text>{activityReports.map(item=><View key={item.id} style={{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'}}><Text style={{color:c.muted,flex:1}}>{item.tagNumber} · {item.grade} · {item.reviewStatus} · {new Date(item.startedAt).toLocaleDateString()}</Text>{button('Download ITR PDF',()=>{void downloadInspectionRecord(item.id).catch(err=>setError(getApiErrorMessage(err,'Could not download the inspection record.')));},busy)}</View>)}</View>}
      {data && <View style={{gap: 8}}>
        <Text style={{color: c.text}}>Vessel / Site: {data.siteName} · Client: {data.client}</Text>
        <Text style={{color: c.text}}>Prepared By: {data.preparedBy} · Checked By: {data.checkedBy}</Text>
        <Text style={{color: c.muted}}>Cover Page → Revision History → Contents → Introduction → Hazardous Area Plan → Equipment Register & Layout → Defect Register → IEC 60079-17 inspection records</Text>
        <Text style={{color: c.muted}}>{data.hazardousAreaPlan ? 'Uploaded Hazardous Area Plan included' : 'No Hazardous Area Plan Uploaded'}</Text>
        {data.areas.map((area, n) => <View key={`${n}-${area.name}`} style={{padding: 12, backgroundColor: c.elevated, borderRadius: 7}}><Text style={{color: c.text, fontWeight: '700'}}>{area.name}</Text><Text style={{color: c.muted, marginTop: 5}}>{area.equipment.length} equipment · {area.equipment.reduce((sum, e) => sum + e.inspections.length, 0)} inspection records · {area.layout ? 'Layout with saved pins' : 'No layout uploaded'}</Text></View>)}
        <Text style={{color: c.text, fontWeight: '800', marginTop: 8}}>Hazardous Area Equipment Register</Text>
        <View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>{button('All areas',()=>{void refreshHaer('');},busy)}{data.areas.map((area,index)=>button(area.name,()=>{const id=area.id||''; void refreshHaer(id);},busy))}</View>
        {haer?.equipment.map((equipment,index)=><View key={`${equipment.tagNumber}-${index}`} style={{padding:11,backgroundColor:c.elevated,borderRadius:7,gap:3}}><Text style={{color:c.text,fontWeight:'800'}}>Item {equipment.sequenceNo} · {equipment.tagNumber} · {equipment.equipmentType}</Text><Text style={{color:c.muted}}>{equipment.description||'Description: unknown'} · {equipment.area} · {equipment.location||'Location: unknown'}</Text><Text style={{color:c.muted}}>Manufacturer/model/serial: {[equipment.manufacturer,equipment.model,equipment.serialNumber].map((x,n)=>{const key=['manufacturer','model','serialNumber'][n]; return x||((equipment.metadataAvailability[key]==='NotApplicable')?'Not applicable':'Unknown');}).join(' / ')}</Text><Text style={{color:c.muted}}>Ex: {equipment.exProtectionType||'Unknown'} · Gas {equipment.gasGroup||'Unknown'} · Temp {equipment.temperatureClass||'Unknown'} · Zone {equipment.hazardousAreaZone||'Unknown'} · Ambient {equipment.ambientTemperatureRange||'Unknown'} · IP {equipment.ipRating||'Unknown'}</Text><Text style={{color:c.muted}}>Certificate: {equipment.certificateNumber||'Unknown'} · Notified body: {equipment.notifiedBody||'Unknown'} · Special conditions: {equipment.specialConditionsOfUse||'Unknown'} · Circuit: {equipment.circuitId||'Unknown'}</Text><Text style={{color:c.muted}}>RFID: {equipment.rfidTagUid||'Unknown'} ({equipment.rfidIdentificationMethod||'method unknown'})</Text><Text style={{color:c.muted}}>Latest: {equipment.lastInspectionGrade||'Unknown'} / {equipment.lastInspectionAt?new Date(equipment.lastInspectionAt).toLocaleDateString():'Unknown'} / {equipment.lastInspectionResult||'Unknown'} · Outstanding defects: {equipment.outstandingDefects} · Reconciliation: {equipment.reconciliationStatus}</Text><Text style={{color:c.muted}}>Inspection history: {equipment.inspectionHistory.length ? equipment.inspectionHistory.map(h=>`${h.grade} · ${h.inspectedAt?new Date(h.inspectedAt).toLocaleDateString():'date unknown'} · ${h.status} · ${h.result}`).join(' | ') : 'No inspection history recorded'}</Text><Text style={{color:c.muted}}>Outstanding defect states: {equipment.outstandingDefectStatuses.length?equipment.outstandingDefectStatuses.join(' · '):'None'}</Text><Text style={{color:c.muted}}>Unknown means no value is recorded; Not Applicable appears only when explicitly confirmed.</Text>{['Admin','Manager'].includes(role||'')&&button(editingHaerId===equipment.equipmentRecordId?'Cancel metadata edit':'Edit HAER metadata',()=>editingHaerId===equipment.equipmentRecordId?(setEditingHaerId(''),setHaerForm(null)):beginHaerEdit(equipment),busy)}{editingHaerId===equipment.equipmentRecordId&&haerForm&&<View style={{gap:7,marginTop:5}}>{(['description','location','manufacturer','model','serialNumber','exProtectionType','gasGroup','temperatureClass','hazardousAreaZone','ambientTemperatureRange','ipRating','certificateNumber','notifiedBody','specialConditionsOfUse','circuitId','rfidTagUid','rfidIdentificationMethod'] as const).map(key=><TextInput key={key} accessibilityLabel={`HAER ${key}`} placeholder={`${key} · leave empty when unknown`} value={haerForm[key]||''} onChangeText={value=>setHaerForm(current=>current?({...current,[key]:value||null}):current)} style={{backgroundColor:c.card,color:c.text,padding:9,borderRadius:6,borderWidth:1,borderColor:c.border}}/>)}<TextInput accessibilityLabel="HAER reconciliation status" placeholder="Reconciliation status: Unreviewed, NeedsReview, Reconciled or Exception" value={haerForm.reconciliationStatus} onChangeText={value=>setHaerForm(current=>current?({...current,reconciliationStatus:value}):current)} style={{backgroundColor:c.card,color:c.text,padding:9,borderRadius:6,borderWidth:1,borderColor:c.border}}/><Text style={{color:c.muted}}>Confirmed Not Applicable fields (comma separated field names)</Text><TextInput accessibilityLabel="HAER Not Applicable fields" value={haerForm.notApplicableFields.join(', ')} onChangeText={value=>setHaerForm(current=>current?({...current,notApplicableFields:value.split(',').map(x=>x.trim()).filter(Boolean)}):current)} style={{backgroundColor:c.card,color:c.text,padding:9,borderRadius:6,borderWidth:1,borderColor:c.border}}/>{button('Save HAER metadata',()=>{void saveHaerEdit(equipment.equipmentRecordId);},busy)}</View>}</View>)}
        {haer && <Text style={{color:c.muted}}>Client: {haer.clientName||'Unknown'} · Revision: {haer.revision||'Unspecified'} · Generated: {new Date(haer.generatedAt).toLocaleString()}</Text>}
        <Text style={{color: c.muted}}>The PDF uses saved inspection answers, comments, findings, recommendations, photos and QC results. Optional unavailable fields are shown as '-'.</Text>
        <Text style={{color: c.muted}}>Checklist records are grouped by Visual, Close and Detailed inspection grade. Checkpoint content must come from approved Aries/client procedures; this app does not embed or claim to reproduce IEC 60079-17 requirements.</Text>
      </View>}
    </View>}
    {viewing && generated && <ReportPdfPreview report={generated} onClose={() => setViewing(false)} />}
  </ScrollView>;
}
