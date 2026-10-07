import React from 'react';
import Renderer from 'react-test-renderer';
import {TouchableOpacity} from 'react-native';
import ReportsScreen from '../src/screens/ReportsScreen';
import {getProjectReport, getReportProjects} from '../src/api/reports';
import {downloadReportPdf, generateReportPdf} from '../src/reports/pdfFile';

jest.mock('../src/api/reports', () => ({getProjectReport: jest.fn(), getReportProjects: jest.fn()}));
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
test('Empty projects have a clear empty state', async () => {
  (getReportProjects as jest.Mock).mockResolvedValue({data: []}); await open();
  expect(textOf(renderer.root)).toContain('No projects available for reports');
});
test('Failed generation shows an error and offers no invalid download', async () => {
  (generateReportPdf as jest.Mock).mockRejectedValue(new Error('Unavailable'));
  await open(); await select(); await press('Preview Report'); await press('Generate PDF');
  expect(textOf(renderer.root)).toContain('Could not generate PDF.');
  expect(renderer.root.findAllByType(TouchableOpacity).some(node => textOf(node) === 'Download PDF')).toBe(false);
});
