import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {addClientRemark, ClientDashboard, ClientNotice, ClientProject, ClientRemarkContext, ClientSection, getClientArea, getClientDashboard, getClientDefects, getClientEquipment, getClientNotifications, getClientProject, getClientRemarks, getClientReports} from '../api/clientDashboard';
import {getApiErrorMessage} from '../api/errors';
import {DashboardLayout, DashboardProjectCard as QcProjectCard, DashboardMetadata as QcProjectMetadata, DashboardButton as Button, DashboardSection as Card, DashboardStatusBadge, DashboardEmptyState, useDashboardPresentation} from '../components/DashboardPresentation';
import {projectDetailStyles} from '../theme/projectDetailStyles';
import ClientMobileDrawer, {CLIENT_DRAWER_MENU} from '../components/ClientMobileDrawer';
import ClientMobilePage from '../components/ClientMobilePage';
import ThemeToggle from '../components/ThemeToggle';
import {Colors} from '../theme/palette';
import OurCompanySection from '../components/OurCompanySection';
import ClientDetailsSection from '../components/ClientDetailsSection';
import HazardousAreaPlanViewer from '../components/HazardousAreaPlanViewer';
import HazardousAreaPlanSection from '../components/HazardousAreaPlanSection';
import AuthenticatedImage from '../components/AuthenticatedImage';
import ZoomableImageViewer, {ViewerPin} from '../components/ZoomableImageViewer';
import ReportPdfPreview from '../components/ReportPdfPreview';
import NotificationBell from '../components/NotificationBell';
import {downloadReportPdf, generateReportPdf} from '../reports/pdfFile';
import {GeneratedReport} from '../reports/types';
import {loadDismissedIds, loadReadIds, saveReadIds} from '../notifications/notifications';

export const CLIENT_MENU: Array<[ClientSection, string]> = [['Dashboard', 'Dashboard'], ['Projects', 'My Projects'], ['Defects', 'Defects'], ['Reports', 'Reports'], ['Notifications', 'Notifications']];
const display = (value: unknown) => value === undefined || value === null || value === '' ? '-' : String(value);
const date = (value?: string) => value ? new Date(value).toLocaleString() : '-';
const status = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2');
function Progress({label, count, total}: {label: string; count: number; total: number}) {
  const {styles, shared} = useClientStyles();
  const percent = total ? Math.min(100, count / total * 100) : 0;
  return <View style={{marginTop: 12}}><Text style={shared.meta}>{label}: {count} / {total}</Text><View style={styles.track}><View style={[styles.fill, {width: `${percent}%`}]} /></View></View>;
}
function ProgressSummary({project}: {project: ClientProject}) {
  const p = project.progress;
  return <><Progress label="Areas completed" count={p.areasCompleted} total={p.totalAreas} /><Progress label="Equipment inspected" count={p.equipmentInspected} total={p.totalEquipment} /><Progress label="QC approved" count={p.qcApproved} total={p.totalSubmitted} />
    <QcProjectMetadata fields={[["Survey progress", `${p.surveyProgress}%`], ['Open defects', p.openDefects], ['Closed defects', p.closedDefects], ['Pending review', p.awaitingQc], ['In review', p.inReview], ['Changes requested', p.changesRequested]]} /></>;
}

export default function ClientWorkspace({userName, userKey, section = 'Dashboard', onNavigate, showNavigation = false, showNotificationBell = true, requestedProjectId, accessory, onLogout, profile}: {
  userName: string; userKey: string; section?: ClientSection; onNavigate?: (section: ClientSection) => void; showNavigation?: boolean; showNotificationBell?: boolean; requestedProjectId?: string; accessory?: React.ReactNode; onLogout?: () => void; profile?: {email?: string; companyName?: string};
}) {
  const {styles, shared, c} = useClientStyles();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [localSection, setLocalSection] = useState<ClientSection>(section);
  const activeSection = onNavigate ? section : localSection;
  const [dashboard, setDashboard] = useState<ClientDashboard | null>(null);
  const [defects, setDefects] = useState<any[]>([]); const [reports, setReports] = useState<any[]>([]); const [notices, setNotices] = useState<ClientNotice[]>([]);
  const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState('');
  const [detail, setDetail] = useState<any>(null); const [area, setArea] = useState<any>(null); const [equipment, setEquipment] = useState<any>(null);
  const [opening, setOpening] = useState(false); const [query, setQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState(''); const [statusFilter, setStatusFilter] = useState(''); const [severityFilter, setSeverityFilter] = useState('');
  const [viewer, setViewer] = useState<{title: string; images: string[]; pins?: ViewerPin[]} | null>(null);
  const [certificate, setCertificate] = useState<any>(null);
  const [remarkContext, setRemarkContext] = useState<ClientRemarkContext | null>(null);
  const [generated, setGenerated] = useState<GeneratedReport | null>(null); const [viewingPdf, setViewingPdf] = useState(false); const [pdfBusy, setPdfBusy] = useState('');
  const pdfRef = useRef<GeneratedReport | null>(null); const request = useRef(0); const alive = useRef(true);
  const [readIds, setReadIds] = useState(() => loadReadIds(userKey));
  const reload = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true); setError('');
    try {
      const [d, f, r, n] = await Promise.all([getClientDashboard(), getClientDefects(), getClientReports(), getClientNotifications()]);
      if (!alive.current) return; setDashboard(d.data); setDefects(f.data); setReports(r.data); setNotices(n.data);
    } catch (err) {if (alive.current) setError(getApiErrorMessage(err, 'Could not load your client workspace.'));}
    finally {if (alive.current) {setLoading(false); setRefreshing(false);}}
  }, []);
  useEffect(() => {alive.current = true; void reload(); const timer = setInterval(() => {void reload(true);}, 60000); return () => {alive.current = false; request.current++; clearInterval(timer); pdfRef.current?.dispose?.();};}, [reload]);
  const openProject = useCallback(async (id: string) => {
    const version = ++request.current; setOpening(true); setError(''); setDetail(null); setArea(null); setEquipment(null);
    try {const res = await getClientProject(id); if (alive.current && version === request.current) setDetail(res.data);}
    catch (err) {if (alive.current && version === request.current) setError(getApiErrorMessage(err, 'Could not open this project.'));}
    finally {if (alive.current && version === request.current) setOpening(false);}
  }, []);
  useEffect(() => {if (requestedProjectId) void openProject(requestedProjectId);}, [requestedProjectId, openProject]);
  const navigate = (next: ClientSection) => {request.current++; setOpening(false); setDetail(null); setArea(null); setEquipment(null); setError(''); onNavigate ? onNavigate(next) : setLocalSection(next);};
  useEffect(() => {request.current++; setOpening(false); setDetail(null); setArea(null); setEquipment(null);}, [section]);
  const openArea = async (id: string) => {const version = ++request.current; setOpening(true); setError(''); try {const res = await getClientArea(id); if (alive.current && version === request.current) {setArea(res.data); setEquipment(null);}} catch(err) {setError(getApiErrorMessage(err, 'Could not open area.'));} finally {if (alive.current && version === request.current) setOpening(false);}};
  const openEquipment = async (id: string) => {const version = ++request.current; setOpening(true); setError(''); try {const res = await getClientEquipment(id); if (alive.current && version === request.current) setEquipment(res.data);} catch(err) {setError(getApiErrorMessage(err, 'Could not open equipment.'));} finally {if (alive.current && version === request.current) setOpening(false);}};
  const openPdf = async (projectId: string, download: boolean) => {
    setPdfBusy(projectId); setError('');
    try {const report = await generateReportPdf(projectId, `Ex-Survey-${projectId}.pdf`); if (!alive.current) {report.dispose?.(); return;} pdfRef.current?.dispose?.(); pdfRef.current = report; setGenerated(report); if (download) await downloadReportPdf(report); else setViewingPdf(true); void reload(true);}
    catch(err) {setError(getApiErrorMessage(err, 'Could not load the PDF.'));} finally {if (alive.current) setPdfBusy('');}
  };
  const markRead = (id: string) => {const next = new Set([...loadReadIds(userKey), id]); setReadIds(next); saveReadIds(userKey, next);};
  const projects = dashboard?.projects || [];
  const filteredProjects = projects.filter(p => `${p.projectName} ${p.jobNumber} ${p.location} ${p.projectStatus}`.toLowerCase().includes(query.toLowerCase()));
  const selectedDefects = defects.filter(f => (!areaFilter || f.areaId === areaFilter) && (!statusFilter || f.status === statusFilter) && (!severityFilter || display(f.severity) === severityFilter));
  const counts = dashboard?.counts;
  const kpis = counts && activeSection === 'Dashboard' && !detail ? [
    {label: 'Active Projects', count: counts.activeProjects, icon: '▤', color: c.cyan, foot: 'Assigned projects'},
    {label: 'Surveys In Progress', count: counts.surveysInProgress, icon: '▤', color: c.cyan, foot: 'In progress'},
    {label: 'Awaiting QC', count: counts.awaitingQc, icon: '◷', color: c.amber, foot: 'Awaiting review'},
    {label: 'QC Approved', count: counts.qcApproved, icon: '✓', color: c.success, foot: 'Approved inspections'},
    {label: 'Open Defects', count: counts.openDefects, icon: '⚠', color: c.critical, foot: 'Open findings'},
    {label: 'Reports Available', count: counts.reportsAvailable, icon: '↗', color: c.indigo, foot: 'View or download'},
  ] : undefined;
  const refresh = () => {void reload(true); if (detail) void openProject(detail.project.projectId);};
  useEffect(() => {setReadIds(loadReadIds(userKey));}, [activeSection, userKey]);
  const shownNotices = notices.filter(n => !loadDismissedIds(userKey).has(n.id));
  const WorkspaceLayout = showNavigation ? ClientMobilePage : DashboardLayout;
  const pageLabel = (!showNavigation && CLIENT_MENU.find(([key]) => key === activeSection)?.[1]) || CLIENT_DRAWER_MENU.find(entry => entry.key === activeSection)?.label || 'Dashboard';
  const renderDefect = (f: any) => <Card key={f.id} title={`${display(f.equipmentCode || f.tagNumber)} · ${f.areaName}`}>
    <DashboardStatusBadge status={status(f.status)} /><QcProjectMetadata fields={[["Project", f.projectName], ['Tag Number', f.tagNumber], ['Type', f.type], ['Severity / fault category', display(f.severity)], ['Status', status(f.status)], ['Observation', display(f.observation)], ['Recommendation', display(f.recommendation)], ['Surveyor remarks', display(f.surveyorRemarks)], ['QC remarks', display(f.qcRemarks)]]} />
    <View style={styles.actions}>{[...(f.beforePhotos || []).map((p: any) => ({...p, kind: 'Before'})), ...(f.afterPhotos || []).map((p: any) => ({...p, kind: 'After'}))].map((photo: any) => <TouchableOpacity key={photo.id} accessibilityLabel={`View ${photo.kind.toLowerCase()} photo`} onPress={() => setViewer({title: `${photo.kind} photo`, images: [photo.url]})}><Text style={shared.meta}>{photo.kind}</Text><AuthenticatedImage path={photo.url} style={styles.photo} resizeMode="contain" /></TouchableOpacity>)}</View>
    <Button title="Add Client Remark" onPress={() => setRemarkContext({projectId: f.projectId, equipmentId: f.equipmentId, findingId: f.id})} />
  </Card>;
  const projectCard = (p: ClientProject) => <QcProjectCard key={p.projectId} name={p.projectName} jobNo={p.jobNumber} location={p.location} status={status(p.projectStatus)} actionLabel="View Project" onPress={() => {void openProject(p.projectId);}}>
    <QcProjectMetadata fields={[["Vessel / Site", p.vesselOrSiteName], ['Surveyor', p.surveyorName], ['Assigned QC', p.assignedQcName], ['QC Status', status(p.qcStatus)]]} /><ProgressSummary project={p} />
  </QcProjectCard>;
  return <View style={{flex: 1}}>
    {showNavigation && <View style={{minHeight: 58, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.bar}}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Open client navigation" onPress={() => {setReadIds(loadReadIds(userKey)); setDrawerOpen(true);}} style={{width: 44, height: 44, alignItems: 'center', justifyContent: 'center'}}><Text style={{color: c.text, fontSize: 24}}>☰</Text></TouchableOpacity><View style={{flex: 1, minWidth: 0}}><Text style={{color: c.text, fontWeight: '800', fontSize: 15}}>EX-SURVEY</Text><Text numberOfLines={1} style={{color: c.secondary, fontSize: 11}}>{detail ? equipment ? 'Inspection View' : area ? area.name : detail.project.projectName : pageLabel}</Text></View>{accessory || (showNotificationBell && <NotificationBell role="Client" userKey={userKey} refreshKey={activeSection} onSelect={n => {if (n.target?.kind === 'clientProject') void openProject(n.target.projectId);}} />)}</View>}
    <WorkspaceLayout title={detail ? detail.project.projectName : activeSection === 'Dashboard' ? userName : pageLabel}
      showBrand={false} accessory={accessory || (showNavigation && showNotificationBell ? <NotificationBell role="Client" userKey={userKey} refreshKey={activeSection} compact onSelect={n => {if (n.target?.kind === 'clientProject') void openProject(n.target.projectId);}} /> : undefined)}
      kpis={kpis} heading={detail ? equipment ? 'Equipment / Inspection' : area ? 'Area / Equipment' : 'Project Details' : activeSection === 'Dashboard' || activeSection === 'Projects' ? 'My Projects' : pageLabel}
      loading={loading && !dashboard || opening} refreshing={refreshing} error={error} onRefresh={refresh}
      actions={detail ? <View style={styles.actions}><Button title={equipment ? 'Back to Area' : area ? 'Back to Project' : 'Back to My Projects'} onPress={() => {request.current++; if (equipment) setEquipment(null); else if (area) setArea(null); else navigate('Projects');}} /></View> : undefined}>
      {!detail && (activeSection === 'Dashboard' || activeSection === 'Projects') && <>
        <TextInput accessibilityLabel="Search my projects" placeholder="Search project, job number, location or status" value={query} onChangeText={setQuery} style={styles.input} />
        {filteredProjects.map(projectCard)}{!filteredProjects.length && <DashboardEmptyState title={projects.length ? 'No matching projects' : 'No projects assigned'} message={projects.length ? 'Try another search.' : 'Projects assigned to you will appear here.'} />}
        {activeSection === 'Dashboard' && <Card title="Recent Activity">{dashboard?.recentActivity.length ? dashboard.recentActivity.map(a => <View key={a.id} style={styles.activity}><Text style={styles.value}>{a.action} · {a.projectName}</Text><Text style={shared.meta}>{display(a.detail)} · {date(a.occurredAt)}</Text></View>) : <Text style={shared.meta}>No recorded activity yet.</Text>}</Card>}
      </>}
      {!detail && (activeSection === 'Progress' || activeSection === 'QcStatus') && <>{projects.map(p => <QcProjectCard key={p.projectId} name={p.projectName} jobNo={p.jobNumber} location={p.location} status={status(activeSection === 'QcStatus' ? p.qcStatus : p.projectStatus)} onPress={() => {void openProject(p.projectId);}} actionLabel="View Project">{activeSection === 'Progress' ? <ProgressSummary project={p} /> : <><DashboardStatusBadge status={status(p.qcStatus)} /><QcProjectMetadata fields={[["Assigned QC", p.assignedQcName], ['Pending Review', p.progress.awaitingQc], ['In Review', p.progress.inReview], ['Changes Requested', p.progress.changesRequested], ['QC Approved', p.progress.qcApproved]]} /></>}</QcProjectCard>)}{!projects.length && <DashboardEmptyState title="No projects assigned" message="Your assigned project progress and QC results will appear here." />}</>}
      {!detail && activeSection === 'Profile' && <Card title={showNavigation ? 'Account Details' : 'Profile'}><QcProjectMetadata fields={[["Client Name", userName], ['Email', profile?.email], ['Company', profile?.companyName], ['Role', 'Client']]} /><ThemeToggle floating={false} size={34} /></Card>}
      {!detail && activeSection === 'Defects' && <>
        <View style={styles.filters}><Filter label="Area" selected={areaFilter} onSelect={setAreaFilter} options={Array.from(new Map(defects.map(f => [f.areaId, f.areaName])).entries())} /><Filter label="Status" selected={statusFilter} onSelect={setStatusFilter} options={Array.from(new Set(defects.map(f => f.status))).map(v => [v, status(v)])} /><Filter label="Severity" selected={severityFilter} onSelect={setSeverityFilter} options={Array.from(new Set(defects.map(f => display(f.severity)))).map(v => [v, v])} /></View>
        {selectedDefects.map(renderDefect)}{!selectedDefects.length && <DashboardEmptyState title="No defects found" message="No defects match these filters." />}
      </>}
      {!detail && activeSection === 'Reports' && <>
        <Text style={shared.meta}>Reports reflect the latest saved project data. Generated Date appears after a PDF has been generated.</Text>
        {reports.map(r => <Card key={r.projectId} title={r.projectName}><QcProjectMetadata fields={[["Document Number", display(r.documentNumber)], ['Revision', display(r.revision)], ['Generated Date', date(r.generatedDate)], ['Report Status', r.reportStatus]]} /><View style={styles.actions}><Button title={pdfBusy === r.projectId ? 'Loading PDF…' : 'View PDF'} disabled={!!pdfBusy} onPress={() => {void openPdf(r.projectId, false);}} /><Button title="Download PDF" disabled={!!pdfBusy} onPress={() => {void openPdf(r.projectId, true);}} /><Button title="Add Report Remark" onPress={() => setRemarkContext({projectId: r.projectId, againstReport: true})} /></View></Card>)}{!reports.length && <DashboardEmptyState title="No reports available" message="Reports for your assigned projects will appear here." />}
      </>}
      {!detail && activeSection === 'Notifications' && <>
        <Button title="Mark all read" onPress={() => {const next = new Set([...loadReadIds(userKey), ...shownNotices.map(n => n.id)]); saveReadIds(userKey, next); setReadIds(next);}} />
        {shownNotices.map(n => <TouchableOpacity key={n.id} accessibilityRole="button" onPress={() => {markRead(n.id); void openProject(n.projectId);}} style={[styles.card, !readIds.has(n.id) && {borderColor: '#8fa7f8'}]}><Text style={styles.heading}>{!readIds.has(n.id) ? '● ' : ''}{n.title}</Text><Text style={styles.value}>{n.message}</Text><Text style={shared.meta}>{date(n.time)}</Text></TouchableOpacity>)}{!shownNotices.length && <DashboardEmptyState title="No notifications yet" message="Updates for your assigned projects will appear here." />}
      </>}
      {detail && !area && !equipment && <>
        <Card title="Project Information"><QcProjectMetadata fields={[["Sector", detail.project.sector], ['Job Number', detail.project.jobNumber], ['Location', detail.project.location], ['Vessel / Site Name', detail.project.vesselOrSiteName], ['UID Number', display(detail.report.uidNumber)], ['Document Number', display(detail.report.documentNumber)], ['Revision', display(detail.report.revision)], ['Description', display(detail.report.description)], ['Surveyor', detail.project.surveyorName], ['QC', detail.project.assignedQcName], ['Project Status', status(detail.project.projectStatus)], ['QC Status', status(detail.project.qcStatus)]]} /></Card>
        <Card title="Our Company Details"><OurCompanySection value={detail.report.ourCompany?.id} existing={detail.report.ourCompany} /></Card>
        <Card title="Client Details"><ClientDetailsSection name={detail.report.clientName || detail.report.client} existingPath={detail.report.clientLogo?.url} /></Card>
        <Card title="Survey Progress"><ProgressSummary project={detail.project} /><HazardousAreaPlanSection project={{hazardousAreaPlanPath: detail.report.hazardousAreaPlan?.url, hazardousAreaPlanContentType: detail.report.hazardousAreaPlan?.contentType}} /><Button title="Add Project Remark" onPress={() => setRemarkContext({projectId: detail.project.projectId})} /></Card>
        <Card title="Areas">{detail.report.areas.map((a: any) => <View key={a.id} style={styles.activity}><Text style={styles.value}>{a.name}</Text><Text style={shared.meta}>{a.equipment?.length || 0} equipment</Text><DashboardStatusBadge status={a.equipment?.length && a.equipment.every((e: any) => /completed|approved/i.test(e.inspectionStatus)) ? 'Completed' : 'In Progress'} /><Button title="View Area" onPress={() => {void openArea(a.id);}} /></View>)}{!detail.report.areas.length && <Text style={shared.meta}>No areas added yet.</Text>}</Card>
        <Card title="Project Defects">{defects.filter(f => f.projectId === detail.project.projectId).map(renderDefect)}{!defects.some(f => f.projectId === detail.project.projectId) && <Text style={shared.meta}>No defects recorded.</Text>}</Card>
      </>}
      {detail && area && !equipment && <Card title={area.name}>
        {area.layout?.url && <Button title="View Area Layout & Equipment Pins" onPress={() => setViewer({title: area.name, images: [area.layout.url], pins: area.equipment.map((e: any) => ({id: e.id, label: String(e.sequenceNo), xPercent: e.xPercent, yPercent: e.yPercent, title: e.tagNumber, lines: [e.type, e.inspectionStatus]}))})} />}
        {area.equipment.map((e: any) => <Card key={e.id} title={`${e.sequenceNo} · ${e.tagNumber}`}><DashboardStatusBadge status={status(e.inspectionStatus)} /><QcProjectMetadata fields={[["Sequence Number", e.sequenceNo], ['Tag Number', e.tagNumber], ['Equipment ID', display(e.equipmentId)], ['Type', e.type], ['Manufacturer', display(e.manufacturer)], ['Location', display(e.location)], ['Certificate Number', display(e.certificateNumber)], ['Inspection Status', status(e.inspectionStatus)]]} /><Button title="View Equipment / Inspection" onPress={() => {void openEquipment(e.id);}} /></Card>)}{!area.equipment.length && <Text style={shared.meta}>No equipment in this area.</Text>}
      </Card>}
      {detail && equipment && <>
        <Card title={`Equipment ${equipment.equipment.tagNumber}`}><QcProjectMetadata fields={[["Sequence Number", equipment.equipment.sequenceNo], ['Equipment ID', display(equipment.equipment.equipmentId)], ['Type', equipment.equipment.type], ['Manufacturer', display(equipment.equipment.manufacturer)], ['Location', display(equipment.equipment.location)], ['Certificate Number', display(equipment.equipment.certificateNumber)], ['Inspection Status', status(equipment.equipment.inspectionStatus)]]} /><Button title="Add Equipment Remark" onPress={() => setRemarkContext({projectId: detail.project.projectId, equipmentId: equipment.equipment.id})} /></Card>
        {equipment.equipment.inspections.map((i: any) => <Card key={i.id} title="Surveyor Inspection & QC Status"><QcProjectMetadata fields={[["Surveyor", i.inspector], ['Inspection Date', date(i.date)], ['Surveyor Remarks', display(i.comments)], ['QC Status', status(i.status)], ['QC Comments', display(i.qcComments)], ['QC Severity', display(i.qcSeverity)], ['Reviewed By', display(i.checkedBy)], ['Review Started At', date(i.reviewStartedAt)], ['Reviewed At', date(i.reviewedAt)], ['Approved At', i.status === 'QcApproved' ? date(i.reviewedAt) : '-']]} />
          <Text style={styles.heading}>Checklist Answers</Text>{i.answers.map((a: any, index: number) => <View key={`${a.number}-${index}`} style={styles.activity}><Text style={styles.value}>{a.number}. {a.question}</Text><Text style={shared.meta}>{display(a.value)} · {display(a.comment)}</Text></View>)}
          <Text style={styles.heading}>Inspection Photos</Text><View style={styles.actions}>{i.photos.map((p: any) => <TouchableOpacity key={p.key} accessibilityLabel="View inspection photo" onPress={() => setViewer({title: 'Inspection Photos', images: i.photos.map((photo: any) => photo.url)})}><AuthenticatedImage path={p.url} style={styles.photo} resizeMode="contain" /></TouchableOpacity>)}</View>
        </Card>)}{!equipment.equipment.inspections.length && <Text style={shared.meta}>No inspection saved yet.</Text>}
        {!!equipment.certificates?.length && <Card title="Certificates">{equipment.certificates.map((file: any) => <View key={file.id}><Text style={styles.value}>{file.fileName}</Text><Button title="View Certificate" onPress={() => setCertificate(file)} /></View>)}</Card>}
        <Card title="QC Review History">{equipment.history.map((h: any) => <View key={h.id} style={styles.activity}><Text style={styles.value}>{h.action} · {date(h.occurredAt)}</Text><Text style={shared.meta}>{display(h.comments)} · {display(h.severity)}</Text></View>)}{!equipment.history.length && <Text style={shared.meta}>No QC activity recorded yet.</Text>}</Card>
      </>}
    </WorkspaceLayout>
    {showNavigation && <ClientMobileDrawer open={drawerOpen} role="Client" name={userName} companyName={profile?.companyName} active={detail ? 'Projects' : activeSection} counts={{Defects: counts?.openDefects, Reports: counts?.reportsAvailable, Notifications: shownNotices.filter(n => !readIds.has(n.id)).length}} onClose={() => setDrawerOpen(false)} onNavigate={navigate} onLogout={onLogout} />}
    {certificate && <HazardousAreaPlanViewer title="Certificate" path={certificate.url} fileName={certificate.fileName} contentType={certificate.contentType} onClose={() => setCertificate(null)} />}
    {viewer && <ZoomableImageViewer visible title={viewer.title} images={viewer.images} pins={viewer.pins} onClose={() => setViewer(null)} />}
    {viewingPdf && generated && <ReportPdfPreview report={generated} onClose={() => setViewingPdf(false)} />}
    {remarkContext && <ClientRemarks context={remarkContext} onClose={() => setRemarkContext(null)} />}
  </View>;
}
function Filter({label, options, selected, onSelect}: {label: string; options: Array<[string, string]>; selected: string; onSelect: (value: string) => void}) {
  const {styles, c} = useClientStyles();
  return <View style={{gap: 6}}><Text style={styles.value}>{label}</Text><View style={styles.actions}>{[['', 'All'], ...options].map(([value, text]) => <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{selected: selected === value}} onPress={() => onSelect(value)} style={[styles.filter, selected === value && {borderColor: c.amber, borderWidth: 1}]}><Text style={styles.value}>{text}</Text></TouchableOpacity>)}</View></View>;
}
export function ClientRemarks({context, onClose}: {context: ClientRemarkContext; onClose: () => void}) {
  const {styles, shared} = useClientStyles();
  const [text, setText] = useState(''); const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  useEffect(() => {let active = true; getClientRemarks(context.projectId).then(res => {if (active) setItems(res.data);}).catch(err => {if (active) setError(getApiErrorMessage(err, 'Could not load remarks.'));}).finally(() => {if (active) setLoading(false);}); return () => {active = false;};}, [context.projectId]);
  const save = async () => {setSaving(true); setError(''); try {const res = await addClientRemark(context, text.trim()); setItems(prev => [res.data, ...prev]); setText('');} catch(err) {setError(getApiErrorMessage(err, 'Could not save your remark.'));} finally {setSaving(false);}};
  const shown = items.filter(r => (!context.equipmentId || r.equipmentId === context.equipmentId) && (!context.findingId || r.findingId === context.findingId) && (!context.againstReport || r.againstReport));
  return <Modal visible transparent onRequestClose={onClose}><View style={styles.backdrop}><View style={styles.remarkPanel}><Text style={styles.heading}>Client Remarks</Text><Text style={shared.meta}>Your comments are stored separately from Surveyor and QC data.</Text><TextInput accessibilityLabel="Client remark" placeholder="Enter your remark" value={text} onChangeText={setText} multiline maxLength={4000} style={[styles.input, {minHeight: 100}]} />{error ? <Text style={{color: '#bf3441'}}>{error}</Text> : null}<View style={styles.actions}><Button title={saving ? 'Saving…' : 'Add Remark'} disabled={saving || !text.trim()} onPress={() => {void save();}} /><Button title="Close" disabled={saving} onPress={onClose} /></View><ScrollView style={{maxHeight: 260}}>{loading ? <ActivityIndicator /> : shown.length ? shown.map(r => <View key={r.id} style={styles.activity}><Text style={styles.value}>{r.remark}</Text><Text style={shared.meta}>{date(r.createdAt)} · {r.isRead ? `Read ${date(r.readAt)}` : 'Awaiting read'}</Text></View>) : <Text style={shared.meta}>No remarks yet.</Text>}</ScrollView></View></View></Modal>;
}
function useClientStyles() {
  const {c, s} = useDashboardPresentation();
  return {c, shared: {meta: s.projectLoc}, styles: {...makeClientStyles(c), card: [s.projectCard, {flexDirection: 'column' as const, alignItems: 'stretch' as const, marginTop: 16}]}};
}
function makeClientStyles(c: Colors) {
  return StyleSheet.create({heading: {fontSize: 16, fontWeight: '800', color: c.text}, value: {fontSize: 14, color: c.text, lineHeight: 22, flexShrink: 1, ...Platform.select({web: {overflowWrap: 'anywhere'} as any})}, actions: {flexDirection: 'row', gap: 12, flexWrap: 'wrap'}, filters: {gap: 12, marginBottom: 16}, filter: {paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6, backgroundColor: c.elevated, minHeight: 44}, input: {...projectDetailStyles.input, backgroundColor: c.card, color: c.text, minHeight: 44, marginVertical: 12}, track: {height: 6, borderRadius: 3, backgroundColor: c.elevated, marginTop: 7, overflow: 'hidden'}, fill: {height: 6, backgroundColor: c.success}, activity: {paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border, gap: 8, minWidth: 0}, photo: {width: 130, height: 130, borderRadius: 8}, backdrop: {flex: 1, backgroundColor: 'rgba(12,14,34,.4)', justifyContent: 'center', padding: 16}, remarkPanel: {padding: 20, backgroundColor: c.card, borderRadius: 14, width: '100%', maxWidth: 640, alignSelf: 'center', gap: 12}});
}
