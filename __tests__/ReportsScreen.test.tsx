import React from 'react';
import Renderer from 'react-test-renderer';
import {TextInput, TouchableOpacity} from 'react-native';
import ReportsScreen from '../src/screens/ReportsScreen';
import {getDefectRegisterReport, downloadDefectCsv, downloadDefectPdf, downloadDefectExcel, getReportDocumentDetails, downloadHaerCsv, downloadHaerExcel, downloadHaerPdf, downloadCampaignHandover, downloadInspectionRecord, downloadReportArtifact, getDailyProgressReport, getDefectReport, getInspectionActivityReports, getReportExportHistory, getHaer, getProjectReport, getReportProjects, updateHaerMetadata} from '../src/api/reports';
import {downloadReportPdf, generateReportPdf, previewReportPdf} from '../src/reports/pdfFile';

jest.mock('../src/api/reports', () => ({getDefectRegisterReport: jest.fn(), downloadDefectCsv:jest.fn(), downloadDefectPdf:jest.fn(), downloadDefectExcel:jest.fn(), getReportDocumentDetails: jest.fn(), downloadHaerCsv: jest.fn(), downloadHaerExcel: jest.fn(), downloadHaerPdf: jest.fn(), downloadCampaignHandover: jest.fn(), downloadInspectionRecord: jest.fn(), downloadReportArtifact: jest.fn(), getDailyProgressReport: jest.fn(), getDefectReport: jest.fn(), getInspectionActivityReports: jest.fn(), getReportExportHistory: jest.fn(), getHaer: jest.fn(), getProjectReport: jest.fn(), getReportProjects: jest.fn(), updateHaerMetadata: jest.fn()}));
jest.mock('../src/reports/pdfFile', () => ({generateReportPdf: jest.fn(), previewReportPdf: jest.fn(), downloadReportPdf: jest.fn()}));
jest.mock('../src/components/DefectReportRegisterPreview', () => 'DefectReportRegisterPreview');
jest.mock('../src/components/ReportWorkflowPanel', () => 'ReportWorkflowPanel');
jest.mock('../src/components/ReportPdfPreview', () => 'ReportPdfPreview');
jest.mock('../src/components/HazardousAreaPlanViewer', () => ({default: 'ArchivedPdfViewer'}));
jest.mock('../src/theme/useThemeMode', () => ({useThemeMode: () => 'light'}));
const textOf = (node: Renderer.ReactTestInstance): string => node.children.map(child => typeof child === 'string' ? child : textOf(child)).join('');
let renderer: Renderer.ReactTestRenderer;
const dispose = jest.fn();
const projects = [{id: 'p1', projectName: 'PROJECT ONE', jobNumber: 'JOB-1', location: 'Dubai'}, {id: 'p2', projectName: 'PROJECT TWO', jobNumber: 'JOB-2', location: 'Dubai'}];
const data = {projectId: 'p1', projectName: 'PROJECT ONE', jobNumber: 'JOB-1', siteName: 'VESSEL', client: 'Client', preparedBy: 'Surveyor', checkedBy: 'Manager', hazardousAreaPlan: {url: '/plan'}, areas: [{name: 'MAIN DECK', layout: {url: '/layout'}, equipment: [{sequenceNo: 1, tagNumber: 'TAG', type: 'Motor', inspections: [{status: 'PendingReview', inspector: 'Surveyor', answers: [], photos: [], findings: []}]}]}]};
beforeEach(() => {
  jest.clearAllMocks(); (getReportProjects as jest.Mock).mockResolvedValue({data: projects});
  (getProjectReport as jest.Mock).mockResolvedValue({data});
  (getReportExportHistory as jest.Mock).mockResolvedValue({data:{artifacts:[],events:[]}});
  (getHaer as jest.Mock).mockResolvedValue({data:{projectId:'p1',projectName:'PROJECT ONE',jobNumber:'JOB-1',siteName:'VESSEL',generatedAt:new Date().toISOString(),equipment:[{equipmentRecordId:'equipment-guid',sequenceNo:1,equipmentId:'EQ-1',tagNumber:'TAG',area:'MAIN DECK',equipmentType:'Motor',inspectionStatus:'QcApproved',outstandingDefects:0,outstandingDefectStatuses:[],inspectionHistory:[],reconciliationStatus:'Unreviewed',metadataAvailability:{exProtectionType:'Unknown'}}]}});
  (generateReportPdf as jest.Mock).mockResolvedValue({uri: 'blob:report', fileName: 'JOB-1_Explosion_Proof_Survey_Report.pdf', dispose});
  (downloadReportPdf as jest.Mock).mockResolvedValue(undefined);
  (previewReportPdf as jest.Mock).mockResolvedValue({uri:'blob:preview', fileName:'preview.pdf', dispose:jest.fn()});
});
afterEach(async () => {await Renderer.act(async () => {renderer?.unmount();});});
async function press(label: string) {await Renderer.act(async () => {renderer.root.findAllByType(TouchableOpacity).find(node => textOf(node) === label)!.props.onPress();});}
async function open() {await Renderer.act(async () => {renderer = Renderer.create(<ReportsScreen />);});}
async function pressControl(label: string) {
  await Renderer.act(async () => {
    renderer.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === label)!.props.onPress();
  });
}
async function select(id = 'p1') {
  const project = projects.find(item => item.id === id)!;
  await pressControl('Report project');
  await press(`${project.projectName} (${project.jobNumber})`);
}
test('Opens a PDF preview and generates, views and downloads the final PDF', async () => {
  await open(); await select(); await press('Preview Report');
  expect(previewReportPdf).toHaveBeenCalledTimes(1);
  expect(previewReportPdf).toHaveBeenCalledWith('p1', 'JOB-1_Explosion_Proof_Survey_Report.pdf');
  expect(getProjectReport).not.toHaveBeenCalled();
  const preview = renderer.root.findByType('ReportPdfPreview' as any);
  expect(preview.props.report.uri).toBe('blob:preview');
  expect(textOf(renderer.root)).not.toContain('MAIN DECK');
  await Renderer.act(async () => preview.props.onGenerate());
  expect(generateReportPdf).toHaveBeenCalledWith('p1', 'JOB-1_Explosion_Proof_Survey_Report.pdf');
  await press('Preview PDF'); expect(renderer.root.findByType('ReportPdfPreview' as any).props.report.uri).toBe('blob:report');
  await press('Download PDF'); expect(downloadReportPdf).toHaveBeenCalledTimes(1);
  await select('p2'); expect(dispose).toHaveBeenCalledTimes(1); expect(renderer.root.findAllByType('ReportPdfPreview' as any)).toHaveLength(0);
});
test('Generation requires selecting and previewing a project', async () => {
  await open(); await select();
  expect(renderer.root.findAllByType(TouchableOpacity).find(node => textOf(node) === 'Generate PDF')!.props.disabled).toBe(true);
  expect(getProjectReport).not.toHaveBeenCalled(); expect(generateReportPdf).not.toHaveBeenCalled();
});
test('Offers scoped HAER export for a selected project and shows the register after preview', async () => {
  await open(); await select();
  await pressControl('HAER Reports');
  await press('Download CSV'); expect(downloadHaerCsv).toHaveBeenCalledWith('p1','JOB-1',undefined);
  await press('Download HAER PDF'); expect(downloadHaerPdf).toHaveBeenCalledWith('p1','JOB-1',undefined);
  await press('Download Excel'); expect(downloadHaerExcel).toHaveBeenCalledWith('p1','JOB-1',undefined);

  await press('Load HAER register'); expect(getHaer).toHaveBeenCalledWith('p1',undefined);
  expect(textOf(renderer.root)).toContain('Item 1 · TAG · Motor');
  expect(textOf(renderer.root)).toContain('Not Applicable appears only when explicitly confirmed.');
});
test('Admin can edit HAER metadata through the authenticated update API', async () => {
  await Renderer.act(async () => {renderer = Renderer.create(<ReportsScreen role="Admin"/>);}); await select(); await pressControl('HAER Reports'); await press('Load HAER register'); await press('Edit HAER metadata');
  await Renderer.act(async () => {renderer.root.findAllByType(require('react-native').TextInput).find(input => input.props.accessibilityLabel === 'HAER manufacturer')!.props.onChangeText('Recorded OEM');});
  await press('Save HAER metadata');
  expect(updateHaerMetadata).toHaveBeenCalledWith('equipment-guid',expect.objectContaining({manufacturer:'Recorded OEM',notApplicableFields:[],reconciliationStatus:'Unreviewed'}));
});
test('Empty projects have a clear empty state', async () => {
  (getReportProjects as jest.Mock).mockResolvedValue({data: []}); await open();
  expect(textOf(renderer.root)).toContain('No projects available for reports');
});
test('Offers daily progress, defect, inspection record, handover and export-history workflows',async()=>{
  (downloadInspectionRecord as jest.Mock).mockResolvedValue(undefined);(downloadCampaignHandover as jest.Mock).mockResolvedValue(undefined);
  (getDailyProgressReport as jest.Mock).mockResolvedValue({data:{planned:5,completed:3,closeCompleted:2,detailedCompleted:1,qcApproved:2,outstanding:2,inaccessible:0,openDefects:1}});
  (getDefectRegisterReport as jest.Mock).mockResolvedValue({data:{items:[{id:'f1'}]}});
  (getInspectionActivityReports as jest.Mock).mockResolvedValue({data:[{id:'a1',grade:'Close',startedAt:new Date().toISOString(),reviewStatus:'Accepted',tagNumber:'EQ-1'}]});
  (getReportExportHistory as jest.Mock).mockResolvedValue({data:{artifacts:[{id:'h1',reportNumber:'JOB-1-HANDOVER',revision:1,fileName:'handover.zip',sha256:'abc',approvalState:'Draft',generatedAt:new Date().toISOString()}],events:[{id:'e1',action:'Campaign Handover Generated',occurredAt:new Date().toISOString(),comments:'Prepared'}]}});
  await open();await select();await pressControl('Progress Reports');await press('Today progress');expect(getDailyProgressReport).toHaveBeenCalledWith('p1',expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));expect(textOf(renderer.root)).toContain('Completed 3');
  await pressControl('Defect Reports'); await press('Load Defect register');expect(getDefectRegisterReport).toHaveBeenCalledWith('p1');
  await pressControl('Inspection Reports'); await press('Inspection activity reports');expect(getInspectionActivityReports).toHaveBeenCalledWith('p1');await press('Download ITR PDF');expect(downloadInspectionRecord).toHaveBeenCalledWith('a1');
  await pressControl('Handover & Export'); await press('Campaign handover ZIP');expect(downloadCampaignHandover).toHaveBeenCalledWith('p1','JOB-1');
  await press('View All'); await press('Export history');expect(getReportExportHistory).toHaveBeenCalledWith('p1');expect(textOf(renderer.root)).toContain('Campaign Handover Generated');expect(textOf(renderer.root)).toContain('JOB-1-HANDOVER');
  (downloadReportArtifact as jest.Mock).mockResolvedValue(undefined);await press('Download archived version');expect(downloadReportArtifact).toHaveBeenCalledWith('p1','h1','handover.zip');
});
test('Failed generation shows an error and offers no invalid download', async () => {
  (generateReportPdf as jest.Mock).mockRejectedValue(new Error('Unavailable'));
  await open(); await select(); await press('Preview Report'); await press('Generate PDF');
  expect(textOf(renderer.root)).toContain('Unavailable');
  expect(renderer.root.findByType('ReportPdfPreview' as any).props.report.uri).toBe('blob:preview');
});

test('Surveyor can cancel, validate, and generate with saved draft document details', async () => {
  const saved = {uidNumber: 'UID-1', documentNumber: 'DOC-1', revision: 'A'};
  (getReportDocumentDetails as jest.Mock).mockResolvedValue({data: saved});
  await Renderer.act(async () => {renderer = Renderer.create(<ReportsScreen role="Surveyor" />);});
  await select();
  await press('Preview Report');
  await press('Generate Report');
  expect(textOf(renderer.root)).toContain('Report Document Details');
  await press('Cancel');
  expect(generateReportPdf).not.toHaveBeenCalled();
  await press('Generate Report');
  const revisionInput = () => renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === 'Revision')!;
  expect(revisionInput().props.value).toBe('A');
  await Renderer.act(async () => {revisionInput().props.onChangeText('   ');});
  await press('Save & Generate Report');
  expect(textOf(renderer.root)).toContain('Required fields: Revision');
  expect(generateReportPdf).not.toHaveBeenCalled();
  await Renderer.act(async () => {revisionInput().props.onChangeText('B');});
  await press('Save & Generate Report');
  expect(generateReportPdf).toHaveBeenCalledWith('p1', 'JOB-1_Explosion_Proof_Survey_Report.pdf', {...saved, revision: 'B'});
  expect(textOf(renderer.root)).toContain('Report generated successfully.');
});

test('Search finds report types and a supported area filter is passed to HAER exports', async () => {
  (getProjectReport as jest.Mock).mockResolvedValue({data: {...data, areas: [{...data.areas[0], id: 'area-1'}]}});
  await open(); await select();
  await Renderer.act(async () => {
    renderer.root.findAllByType(TextInput).find(node => node.props.accessibilityLabel === 'Search reports')!.props.onChangeText('HAER CSV');
  });
  expect(textOf(renderer.root)).toContain('Search results');
  await press('Download CSV');
  await pressControl('HAER area'); await press('MAIN DECK'); await press('Download Excel');
  expect(downloadHaerExcel).toHaveBeenCalledWith('p1', 'JOB-1', 'area-1');
  await press('Reset Filters'); await press('Download Excel');
  expect(downloadHaerExcel).toHaveBeenLastCalledWith('p1', 'JOB-1', undefined);
});

test('Switching projects never shows an archive from a late history response', async () => {
  let finishFirst: (value: unknown) => void = () => {};
  (getReportExportHistory as jest.Mock).mockImplementation((id: string) => id === 'p1'
    ? new Promise(resolve => {finishFirst = resolve;})
    : Promise.resolve({data: {artifacts: [], events: []}}));
  await open(); await select(); await select('p2');
  await Renderer.act(async () => {
    finishFirst({data: {artifacts: [{id: 'old', fileName: 'old-project.pdf', generatedAt: new Date().toISOString()}], events: []}});
  });
  expect(textOf(renderer.root)).not.toContain('old-project.pdf');
  expect(textOf(renderer.root)).toContain('No reports generated for this project yet.');
});

test('Recent reports open the stored PDF without regenerating it', async () => {
  const downloadUrl = '/api/reports/projects/p1/artifacts/pdf1';
  (getReportExportHistory as jest.Mock).mockResolvedValue({data: {events: [], artifacts: [
    {id: 'pdf1', fileName: 'saved-inspection.pdf', generatedAt: '2026-11-10T10:00:00Z', downloadUrl},
  ]}});
  await open(); await select();
  await press('Preview archived PDF');
  expect(renderer.root.findByType('ArchivedPdfViewer' as any).props.path).toBe(downloadUrl);
  expect(generateReportPdf).not.toHaveBeenCalled();
});


test('Offers all four scoped defect actions and refreshes history after export', async () => {
  await open(); await select(); await pressControl('Defect Reports');
  expect(textOf(renderer.root)).toContain('Defect Register');
  await press('Download CSV'); expect(downloadDefectCsv).toHaveBeenCalledWith('p1','JOB-1');
  await press('Download Defect PDF'); expect(downloadDefectPdf).toHaveBeenCalledWith('p1','JOB-1');
  await press('Download Excel'); expect(downloadDefectExcel).toHaveBeenCalledWith('p1','JOB-1');
  expect(getReportExportHistory).toHaveBeenCalledTimes(4);
});

test('Locks defect exports while generating and displays server errors', async () => {
  let finish: (value?:unknown)=>void = ()=>undefined;
  (downloadDefectPdf as jest.Mock).mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  await open(); await select(); await pressControl('Defect Reports');
  await press('Download Defect PDF');
  expect(renderer.root.findAllByType(TouchableOpacity).find(n=>textOf(n)==='Download Excel')!.props.disabled).toBe(true);
  await Renderer.act(async()=>finish());
  (downloadDefectPdf as jest.Mock).mockRejectedValue(new Error('Photo export unavailable'));
  await press('Download Defect PDF'); expect(textOf(renderer.root)).toContain('Could not export the defect register.');
});


test('Submitted Report Status disables generation while preserving archived and other exports', async()=>{
  await open();await select();await press('Preview Report');
  const panel=renderer.root.findByType('ReportWorkflowPanel' as any);
  await Renderer.act(async()=>panel.props.onStatus('Submitted'));
  expect(renderer.root.findAllByType(TouchableOpacity).find(n=>textOf(n)==='Generate PDF')!.props.disabled).toBe(true);
  await pressControl('HAER Reports');await press('Download CSV');expect(downloadHaerCsv).toHaveBeenCalledWith('p1','JOB-1',undefined);
});
