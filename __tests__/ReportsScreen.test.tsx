import React from 'react';
import Renderer from 'react-test-renderer';
import {TouchableOpacity} from 'react-native';
import ReportsScreen from '../src/screens/ReportsScreen';
import {downloadHaerCsv, downloadHaerExcel, downloadHaerPdf, downloadCampaignHandover, downloadInspectionRecord, downloadReportArtifact, getDailyProgressReport, getDefectReport, getInspectionActivityReports, getReportExportHistory, getHaer, getProjectReport, getReportProjects, updateHaerMetadata} from '../src/api/reports';
import {downloadReportPdf, generateReportPdf} from '../src/reports/pdfFile';

jest.mock('../src/api/reports', () => ({downloadHaerCsv: jest.fn(), downloadHaerExcel: jest.fn(), downloadHaerPdf: jest.fn(), downloadCampaignHandover: jest.fn(), downloadInspectionRecord: jest.fn(), downloadReportArtifact: jest.fn(), getDailyProgressReport: jest.fn(), getDefectReport: jest.fn(), getInspectionActivityReports: jest.fn(), getReportExportHistory: jest.fn(), getHaer: jest.fn(), getProjectReport: jest.fn(), getReportProjects: jest.fn(), updateHaerMetadata: jest.fn()}));
jest.mock('../src/reports/pdfFile', () => ({generateReportPdf: jest.fn(), downloadReportPdf: jest.fn()}));
jest.mock('../src/components/ReportPdfPreview', () => 'ReportPdfPreview');
jest.mock('../src/theme/useThemeMode', () => ({useThemeMode: () => 'light'}));
const textOf = (node: Renderer.ReactTestInstance): string => node.children.map(child => typeof child === 'string' ? child : textOf(child)).join('');
let renderer: Renderer.ReactTestRenderer;
const dispose = jest.fn();
const projects = [{id: 'p1', projectName: 'PROJECT ONE', jobNumber: 'JOB-1', location: 'Dubai'}, {id: 'p2', projectName: 'PROJECT TWO', jobNumber: 'JOB-2', location: 'Dubai'}];
const data = {projectId: 'p1', projectName: 'PROJECT ONE', jobNumber: 'JOB-1', siteName: 'VESSEL', client: 'Client', preparedBy: 'Surveyor', checkedBy: 'Manager', hazardousAreaPlan: {url: '/plan'}, areas: [{name: 'MAIN DECK', layout: {url: '/layout'}, equipment: [{sequenceNo: 1, tagNumber: 'TAG', type: 'Motor', inspections: [{status: 'PendingReview', inspector: 'Surveyor', answers: [], photos: [], findings: []}]}]}]};
beforeEach(() => {
  jest.clearAllMocks(); (getReportProjects as jest.Mock).mockResolvedValue({data: projects});
  (getProjectReport as jest.Mock).mockResolvedValue({data});
  (getHaer as jest.Mock).mockResolvedValue({data:{projectId:'p1',projectName:'PROJECT ONE',jobNumber:'JOB-1',siteName:'VESSEL',generatedAt:new Date().toISOString(),equipment:[{equipmentRecordId:'equipment-guid',sequenceNo:1,equipmentId:'EQ-1',tagNumber:'TAG',area:'MAIN DECK',equipmentType:'Motor',inspectionStatus:'QcApproved',outstandingDefects:0,outstandingDefectStatuses:[],inspectionHistory:[],reconciliationStatus:'Unreviewed',metadataAvailability:{exProtectionType:'Unknown'}}]}});
  (generateReportPdf as jest.Mock).mockResolvedValue({uri: 'blob:report', fileName: 'JOB-1_Explosion_Proof_Survey_Report.pdf', dispose});
  (downloadReportPdf as jest.Mock).mockResolvedValue(undefined);
});
afterEach(async () => {await Renderer.act(async () => {renderer?.unmount();});});
async function press(label: string) {await Renderer.act(async () => {renderer.root.findAllByType(TouchableOpacity).find(node => textOf(node) === label)!.props.onPress();});}
async function open() {await Renderer.act(async () => {renderer = Renderer.create(<ReportsScreen />);});}
async function select(id = 'p1') {await Renderer.act(async () => {renderer.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === `Select report project ${id === 'p1' ? 'PROJECT ONE' : 'PROJECT TWO'}`)!.props.onPress();});}
test('Loads aggregate project data once and generates, previews and downloads the same PDF', async () => {
  await open(); await select(); await press('Preview Report');
  expect(getProjectReport).toHaveBeenCalledTimes(1); expect(getProjectReport).toHaveBeenCalledWith('p1');
  expect(textOf(renderer.root)).toContain('MAIN DECK'); expect(textOf(renderer.root)).toContain('Layout with saved pins');
  await press('Generate PDF'); expect(generateReportPdf).toHaveBeenCalledWith('p1', 'JOB-1_Explosion_Proof_Survey_Report.pdf');
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
  await press('HAER CSV'); expect(downloadHaerCsv).toHaveBeenCalledWith('p1','JOB-1',undefined);
  await press('HAER PDF'); expect(downloadHaerPdf).toHaveBeenCalledWith('p1','JOB-1',undefined);
  await press('HAER Excel'); expect(downloadHaerExcel).toHaveBeenCalledWith('p1','JOB-1',undefined);
  await press('Preview Report');
  expect(textOf(renderer.root)).toContain('Hazardous Area Equipment Register');
  await press('Load HAER register'); expect(getHaer).toHaveBeenCalledWith('p1',undefined);
  expect(textOf(renderer.root)).toContain('Item 1 · TAG · Motor');
  expect(textOf(renderer.root)).toContain('Not Applicable appears only when explicitly confirmed.');
});
test('Admin can edit HAER metadata through the authenticated update API', async () => {
  await Renderer.act(async () => {renderer = Renderer.create(<ReportsScreen role="Admin"/>);}); await select(); await press('Preview Report'); await press('Load HAER register'); await press('Edit HAER metadata');
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
  (getDefectReport as jest.Mock).mockResolvedValue({data:{items:[{id:'f1'}]}});
  (getInspectionActivityReports as jest.Mock).mockResolvedValue({data:[{id:'a1',grade:'Close',startedAt:new Date().toISOString(),reviewStatus:'Accepted',tagNumber:'EQ-1'}]});
  (getReportExportHistory as jest.Mock).mockResolvedValue({data:{artifacts:[{id:'h1',reportNumber:'JOB-1-HANDOVER',revision:1,fileName:'handover.zip',sha256:'abc',approvalState:'Draft',generatedAt:new Date().toISOString()}],events:[{id:'e1',action:'Campaign Handover Generated',occurredAt:new Date().toISOString(),comments:'Prepared'}]}});
  await open();await select();await press('Today progress');expect(getDailyProgressReport).toHaveBeenCalledWith('p1',expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));expect(textOf(renderer.root)).toContain('Completed 3');
  await press('Defect report');expect(getDefectReport).toHaveBeenCalledWith('p1');
  await press('Inspection activity reports');expect(getInspectionActivityReports).toHaveBeenCalledWith('p1');await press('Download ITR PDF');expect(downloadInspectionRecord).toHaveBeenCalledWith('a1');
  await press('Campaign handover ZIP');expect(downloadCampaignHandover).toHaveBeenCalledWith('p1','JOB-1');
  await press('Export history');expect(getReportExportHistory).toHaveBeenCalledWith('p1');expect(textOf(renderer.root)).toContain('Campaign Handover Generated');expect(textOf(renderer.root)).toContain('JOB-1-HANDOVER');
  (downloadReportArtifact as jest.Mock).mockResolvedValue(undefined);await press('Download archived version');expect(downloadReportArtifact).toHaveBeenCalledWith('p1','h1','handover.zip');
});
test('Failed generation shows an error and offers no invalid download', async () => {
  (generateReportPdf as jest.Mock).mockRejectedValue(new Error('Unavailable'));
  await open(); await select(); await press('Preview Report'); await press('Generate PDF');
  expect(textOf(renderer.root)).toContain('Could not generate PDF.');
  expect(renderer.root.findAllByType(TouchableOpacity).some(node => textOf(node) === 'Download PDF')).toBe(false);
});
