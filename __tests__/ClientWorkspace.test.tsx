import AppearanceSettings from '../src/components/AppearanceSettings';
import ClientMobileDrawer from '../src/components/ClientMobileDrawer';
import React from 'react';
import Renderer from 'react-test-renderer';
import {TextInput, TouchableOpacity} from 'react-native';
import ClientWorkspace, {ClientRemarks} from '../src/screens/ClientWorkspace';
import SearchableOptionPicker from '../src/components/SearchableOptionPicker';
import * as api from '../src/api/clientDashboard';
import * as activityApi from '../src/api/projects';
import {generateReportPdf, downloadReportPdf} from '../src/reports/pdfFile';

jest.mock('../src/api/clientDashboard', () => ({getClientDashboard: jest.fn(), getClientDefects: jest.fn(), getClientReports: jest.fn(), getClientNotifications: jest.fn(), getClientProject: jest.fn(), getClientArea: jest.fn(), getClientEquipment: jest.fn(), getClientRemarks: jest.fn(), addClientRemark: jest.fn()}));
jest.mock('../src/api/projects', () => ({getInspectionDefects: jest.fn(), decideDefectClosure: jest.fn()}));
jest.mock('../src/components/OurCompanySection', () => 'OurCompanySection');
jest.mock('../src/components/ClientDetailsSection', () => 'ClientDetailsSection');
jest.mock('../src/components/HazardousAreaPlanViewer', () => 'HazardousAreaPlanViewer');
jest.mock('../src/components/HazardousAreaPlanSection', () => 'HazardousAreaPlanSection');
jest.mock('../src/components/AuthenticatedImage', () => 'AuthenticatedImage');
jest.mock('../src/components/ZoomableImageViewer', () => 'ZoomableImageViewer');
jest.mock('../src/components/ReportPdfPreview', () => 'ReportPdfPreview');
jest.mock('../src/components/NotificationBell', () => 'NotificationBell');
jest.mock('../src/components/AppearanceSettings', () => 'AppearanceSettings');
jest.mock('../src/reports/pdfFile', () => ({generateReportPdf: jest.fn(), downloadReportPdf: jest.fn()}));
const text = (node: Renderer.ReactTestInstance): string => node.children.map(c => typeof c === 'string' ? c : text(c)).join('');
let renderer: Renderer.ReactTestRenderer;
const project = {projectId: 'p', projectName: 'Assigned Project', sector: 'Shipping', jobNumber: 'JOB-1', location: 'Dubai', vesselOrSiteName: 'Vessel', projectStatus: 'Active', surveyorName: 'Surveyor', assignedQcName: 'QC', qcStatus: 'PendingReview', progress: {totalAreas: 1, areasCompleted: 0, totalEquipment: 2, equipmentInspected: 1, totalSubmitted: 1, awaitingQc: 1, inReview: 0, changesRequested: 0, qcApproved: 0, openDefects: 1, closedDefects: 0, surveyProgress: 50}};
const pin = {id: 'e', sequenceNo: 1, tagNumber: 'TAG-1', type: 'Motor', inspectionStatus: 'Completed', inspections: [{id: 's', status: 'PendingReview', answers: [{number: 1, question: 'Enclosure intact?', value: 'False', comment: 'Damaged seal'}], photos: [], inspector: 'Surveyor', comments: 'Inspection remark'}]};
const area = {id: 'a', name: 'Deck', equipment: [pin]};
beforeEach(() => {jest.clearAllMocks(); (api.getClientDashboard as jest.Mock).mockResolvedValue({data: {counts: {activeProjects: 7, surveysInProgress: 5, awaitingQc: 11, qcApproved: 19, completedProjects: 2, openDefects: 3, closedDefects: 4, reportsAvailable: 9}, projects: [project], recentActivity: []}}); (api.getClientDefects as jest.Mock).mockResolvedValue({data: []}); (api.getClientReports as jest.Mock).mockResolvedValue({data: [{projectId: 'p', projectName: 'Assigned Project', reportStatus: 'Available on demand'}]}); (api.getClientNotifications as jest.Mock).mockResolvedValue({data: []}); (api.getClientProject as jest.Mock).mockResolvedValue({data: {project, report: {areas: [area]}}}); (api.getClientArea as jest.Mock).mockResolvedValue({data: area}); (api.getClientEquipment as jest.Mock).mockResolvedValue({data: {equipment: pin, history: []}}); (api.getClientRemarks as jest.Mock).mockResolvedValue({data: []}); (activityApi.getInspectionDefects as jest.Mock).mockResolvedValue({data: []}); (activityApi.decideDefectClosure as jest.Mock).mockResolvedValue({data: {}});});
afterEach(async () => {await Renderer.act(async () => renderer?.unmount());});
async function press(label: string) {await Renderer.act(async () => {renderer.root.findAllByType(TouchableOpacity).find(n => n.props.accessibilityLabel === label || text(n) === label)!.props.onPress();});}
test('uses backend KPI counts and existing read-only drill-down without technical edit actions', async () => {
 await Renderer.act(async () => {renderer = Renderer.create(<ClientWorkspace userName="Client" userKey="Client:1" />);});
 expect(text(renderer.root)).toContain('Awaiting QC11'); expect(text(renderer.root)).toContain('QC Approved19'); expect(text(renderer.root)).toContain('Active Projects7');
 await press('View Project'); await press('View Area'); await press('View Equipment / Inspection');
 expect(api.getClientArea).toHaveBeenCalledWith('a'); expect(api.getClientEquipment).toHaveBeenCalledWith('e');
 expect(text(renderer.root)).toContain('Enclosure intact?'); expect(text(renderer.root)).toContain('Damaged seal');
 const actions = renderer.root.findAllByType(TouchableOpacity).map(text); for (const name of ['Start Review', 'Approve', 'Request Changes', 'Edit Project', 'Add Equipment', 'Delete Equipment']) expect(actions).not.toContain(name);
});
test('report view/download reuses existing PDF helper', async () => {
 const dispose = jest.fn(); (generateReportPdf as jest.Mock).mockResolvedValue({uri: 'pdf', fileName: 'report.pdf', dispose}); (downloadReportPdf as jest.Mock).mockResolvedValue(undefined);
 await Renderer.act(async () => {renderer = Renderer.create(<ClientWorkspace userName="Client" userKey="Client:1" section="Reports" />);});
 await press('View PDF'); expect(generateReportPdf).toHaveBeenCalledWith('p', expect.any(String)); expect(renderer.root.findByType('ReportPdfPreview' as any).props.report.uri).toBe('pdf');
 await press('Download PDF'); expect(downloadReportPdf).toHaveBeenCalledWith(expect.objectContaining({uri:'pdf'})); expect(dispose).toHaveBeenCalled();
});
test('remarks send separate context without editing inspection or QC fields', async () => {
 (api.addClientRemark as jest.Mock).mockResolvedValue({data: {id: 'r', equipmentId: 'e', remark: 'Please clarify', createdAt: new Date().toISOString()}});
 await Renderer.act(async () => {renderer = Renderer.create(<ClientRemarks context={{projectId:'p', equipmentId:'e'}} onClose={jest.fn()} />);});
 expect(renderer.root.findAllByType(TouchableOpacity).find(n => text(n) === 'Add Remark')!.props.disabled).toBe(true);
 await Renderer.act(async () => {renderer.root.findByType(TextInput).props.onChangeText('Please clarify');}); await press('Add Remark');
 expect(api.addClientRemark).toHaveBeenCalledWith({projectId:'p', equipmentId:'e'}, 'Please clarify'); expect(text(renderer.root)).toContain('Please clarify');
});
test('failed assigned-project request shows error without displaying private detail', async () => {
 (api.getClientProject as jest.Mock).mockRejectedValue(new Error('Forbidden'));
 await Renderer.act(async () => {renderer = Renderer.create(<ClientWorkspace userName="Client" userKey="Client:1" />);}); await press('View Project');
 expect(text(renderer.root)).toContain('Could not open this project.'); expect(text(renderer.root)).not.toContain('Enclosure intact?');
});

test('client sees an assigned activity defect and can accept its verified closure', async () => {
 (activityApi.getInspectionDefects as jest.Mock).mockResolvedValue({data: [{id: 'f1', projectId:'p', actionId: 'ca1', project: 'Assigned Project', equipmentId: 'e1', checkpoint: 'Seal intact', faultCode: 'FC-1', observation: 'Seal damaged', severityCode: 'Proposed', actionStatus: 'Verified', reportedAt: new Date().toISOString()}]});
 await Renderer.act(async () => {renderer = Renderer.create(<ClientWorkspace userName="Client" userKey="Client:1" section="Defects" />); await Promise.resolve(); await Promise.resolve();});
 expect(text(renderer.root)).toContain('Seal damaged');
 await press('View Defect');
 await press('Approve Closure');
 expect(activityApi.decideDefectClosure).toHaveBeenCalledWith('ca1', true, '');
});

 test('Client mobile drawer replaces tabs, navigates all modules, and uses existing logout', async () => {
 const logout = jest.fn();
 await Renderer.act(async () => {renderer = Renderer.create(<ClientWorkspace userName="Client Name" userKey="Client:1" showNavigation profile={{email: 'client@example.test', companyName: 'Client Company'}} onLogout={logout} />);});
 expect(renderer.root.findAll(n => n.props.accessibilityRole === 'tab')).toHaveLength(0);
 await press('Open client navigation');
 expect(renderer.root.findByType(ClientMobileDrawer).props.open).toBe(true);
 expect(renderer.root.findByType(ClientMobileDrawer).props.counts).toEqual({Defects: 3, Reports: 9, Notifications: 0});
 expect(renderer.root.findAllByType(TouchableOpacity).some(n=>n.props.accessibilityLabel==='Inspection Progress')).toBe(false);
 for (const label of ['QC Status', 'Reports & Certificates', 'Notifications', 'Profile', 'My Projects', 'Dashboard']) {
   await press(label);
   expect(renderer.root.findByType(ClientMobileDrawer).props.open).toBe(false);
   await press('Open client navigation');
 }
 await press('Close client navigation');
 expect(renderer.root.findByType(ClientMobileDrawer).props.open).toBe(false);
 await press('Open client navigation'); await press('Logout'); expect(logout).toHaveBeenCalledTimes(1);
 });
 test('Client drawer does not render for a technical role', async () => {
 await Renderer.act(async () => {renderer = Renderer.create(<ClientMobileDrawer role="Manager" open active="Dashboard" counts={{}} onNavigate={jest.fn()} onClose={jest.fn()} onSettings={jest.fn()} />);});
 expect(renderer.toJSON()).toBeNull();
 });

test('overview filters real project statuses and keeps shortcuts connected to existing sections', async () => {
 await Renderer.act(async () => {renderer = Renderer.create(<ClientWorkspace userName="Client" userKey="Client:overview" />);});
 expect(text(renderer.root)).toContain('Confidence at every stage.');
 await Renderer.act(async () => {renderer.root.findAllByType(TextInput).find(n => n.props.accessibilityLabel === 'Search my projects')!.props.onChangeText('not-a-project');});
 expect(text(renderer.root)).toContain('No matching projects');
 await Renderer.act(async () => {renderer.root.findAllByType(TextInput).find(n => n.props.accessibilityLabel === 'Search my projects')!.props.onChangeText('JOB-1');});
 expect(text(renderer.root)).toContain('Assigned Project');
 const picker = renderer.root.findAllByType(SearchableOptionPicker).find(n => n.props.label === 'Project status')!;
 expect(picker.props.options).toEqual([{label: 'All statuses', value: ''}, {label: 'Active', value: 'Active'}]);
 await press('Track inspection progress'); expect(text(renderer.root)).toContain('Equipment Inspected');
});

test('unassigned overview has honest empty states and disables unavailable reports', async () => {
 (api.getClientDashboard as jest.Mock).mockResolvedValue({data: {counts: {activeProjects: 0, surveysInProgress: 0, awaitingQc: 0, qcApproved: 0, openDefects: 0, reportsAvailable: 0}, projects: [], recentActivity: []}});
 (api.getClientReports as jest.Mock).mockResolvedValue({data: []});
 await Renderer.act(async () => {renderer = Renderer.create(<ClientWorkspace userName="Client" userKey="Client:empty" />);});
 expect(text(renderer.root)).toContain('Your workspace is ready');
 expect(text(renderer.root)).toContain('You are all caught up');
 expect(text(renderer.root)).toContain('No project activity yet.');
 expect(renderer.root.findAllByType(TouchableOpacity).find(n => n.props.accessibilityLabel === 'View reports')!.props.disabled).toBe(true);
});

test('attention uses actual unread notices and verified client decisions without triggering mutations', async () => {
 (api.getClientNotifications as jest.Mock).mockResolvedValue({data: [{id: 'n1', projectId: 'p', title: 'Project update', message: 'Saved update', time: '2026-11-11T12:00:00Z'}]});
 (activityApi.getInspectionDefects as jest.Mock).mockResolvedValue({data: [{id: 'f1', actionId: 'a1', actionStatus: 'Verified'}, {id: 'f2', actionId: 'a2', actionStatus: 'Proposed'}]});
 await Renderer.act(async () => {renderer = Renderer.create(<ClientWorkspace userName="Client" userKey="Client:attention" />);});
 expect(text(renderer.root)).toContain('1 verified defect awaiting your decision');
 expect(text(renderer.root)).toContain('Saved update');
 expect(activityApi.decideDefectClosure).not.toHaveBeenCalled();
});

test('redesigned project details refresh saved personal remarks without changing project or inspection data', async () => {
 let saved = [{id:'old',remark:'Existing client remark',createdAt:'2026-11-10T12:00:00Z',equipmentId:null,againstReport:false}];
 (api.getClientRemarks as jest.Mock).mockImplementation(async () => ({data:[...saved]}));
 (api.addClientRemark as jest.Mock).mockImplementation(async (_context, remark) => {
   const created = {id:'new',remark,createdAt:'2026-11-12T12:00:00Z',equipmentId:null,againstReport:false}; saved = [created,...saved]; return {data:created};
 });
 await Renderer.act(async () => {renderer = Renderer.create(<ClientWorkspace userName="Client" userKey="Client:details" section="Projects"/>);});
 await press('View Project →');
 expect(api.getClientProject).toHaveBeenCalledWith('p');
 expect(text(renderer.root)).toContain('Existing client remark');
 expect(text(renderer.root)).toContain('QC & Defect Status Overview');
 expect(text(renderer.root)).toContain('No defects recorded for this project.');
 await press('Add Project Remark');
 await Renderer.act(async () => {renderer.root.findAllByType(TextInput).find(n => n.props.accessibilityLabel === 'Client remark')!.props.onChangeText('New private project note');});
 await press('Add Remark');
 expect(api.addClientRemark).toHaveBeenCalledWith({projectId:'p'},'New private project note');
 await press('Close');
 expect(text(renderer.root)).toContain('New private project note');
 expect(text(renderer.root)).toContain('Existing client remark');
 await press('View Area'); expect(api.getClientArea).toHaveBeenCalledWith('a');
});

test('inspection progress uses shared modern cards and preserves independent QC values and drill-down', async () => {
 await Renderer.act(async () => {renderer = Renderer.create(<ClientWorkspace userName="Client" userKey="Client:progress" section="Progress" />);});
 expect(text(renderer.root)).toContain('Inspection Progress');
 expect(text(renderer.root)).toContain('Survey completion and QC approval are tracked separately.');
 expect(text(renderer.root)).toContain('Survey Progress: 50%');
 const qcBar = renderer.root.findAll(n => n.props.accessibilityRole === 'progressbar').find(n => n.props.accessibilityLabel === 'Assigned Project: QC Approved')!;
 expect(qcBar.props.accessibilityValue.now).toBe(0);
 await press('View Project →'); expect(api.getClientProject).toHaveBeenCalledWith('p');
});


test('client mobile settings forwards own profile updates and security sign-out', async () => {
 const onProfileUpdated = jest.fn(); const onLogout = jest.fn();
 await Renderer.act(async () => {renderer = Renderer.create(<ClientWorkspace userName="Client" userKey="Client:settings" showNavigation onProfileUpdated={onProfileUpdated} onLogout={onLogout} />);});
 await Renderer.act(async () => {renderer.root.findByType(ClientMobileDrawer).props.onSettings();});
 const settings = renderer.root.findByType(AppearanceSettings);
 expect(settings.props.onProfileUpdated).toBe(onProfileUpdated);
 expect(settings.props.onSessionEnd).toBe(onLogout);
 await Renderer.act(async () => {settings.props.onClose();});
 expect(renderer.root.findAllByType(AppearanceSettings)).toHaveLength(0);
});
