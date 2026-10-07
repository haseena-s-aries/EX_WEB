import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {TouchableOpacity} from 'react-native';
import ManagerQcReviewScreen from '../src/screens/ManagerQcReviewScreen';
import Sidebar from '../src/components/Sidebar';
import * as api from '../src/api/managerQc';

jest.mock('../src/api/managerQc', () => ({
  getManagerQcDashboard: jest.fn(), getManagerQcProjects: jest.fn(), getManagerQcProject: jest.fn(),
  getManagerQcArea: jest.fn(), getManagerQcEquipment: jest.fn(),
}));
jest.mock('../src/components/AuthenticatedImage', () => 'AuthenticatedImage');
jest.mock('../src/components/QcReportingManagers', () => 'QcReportingManagers');
jest.mock('../src/theme/useThemeMode', () => ({useThemeMode: () => 'light'}));
jest.mock('../src/api/projects', () => ({projectStatusLabel: (value: string) => value}));

const textOf = (node: ReactTestRenderer.ReactTestInstance): string => node.children.map(child => typeof child === 'string' ? child : textOf(child)).join('');
const click = async (renderer: ReactTestRenderer.ReactTestRenderer, label: string) => {
  const button = renderer.root.findAllByType(TouchableOpacity).find(node => textOf(node) === label || node.props.accessibilityLabel === label);
  expect(button).toBeDefined();
  await ReactTestRenderer.act(async () => {button!.props.onPress();});
};
beforeEach(() => jest.clearAllMocks());

test('manager drills through backend counts, areas, equipment, inspection and preserved history', async () => {
  const counts = {awaitingQcReview: 7, inReview: 4, changesRequested: 2, approved: 3, overdue: 1};
  const project = {projectId: 'p1', projectName: 'Vessel One', jobNo: 'JOB-1', location: 'Dubai', surveyorName: 'Alex',
    assignedQc: 'Sumeet', managerName: 'Sandra', projectStatus: 'Active', qcReviewStatus: 'InReview', totalEquipment: 21, counts};
  const equipment = {equipmentId: 'e1', inspectionId: 'i1', sequenceNo: 1, tagNumber: 'TAG-1', type: 'Motor',
    inspectionStatus: 'QcApproved', qcReviewStatus: 'Approved', qcComments: 'Retest passed', severity: 'High', reviewedBy: 'Sumeet'};
  (api.getManagerQcDashboard as jest.Mock).mockResolvedValue({data: counts});
  (api.getManagerQcProjects as jest.Mock).mockResolvedValue({data: [project]});
  (api.getManagerQcProject as jest.Mock).mockResolvedValue({data: {project, areas: [{areaId: 'a1', areaName: 'Deck', totalEquipment: 1, counts}]}});
  (api.getManagerQcArea as jest.Mock).mockResolvedValue({data: {areaId: 'a1', areaName: 'Deck', counts, equipment: [equipment]}});
  (api.getManagerQcEquipment as jest.Mock).mockResolvedValue({data: {equipment, inspection: {inspectionId: 'i1',
    checklistAnswers: [{answerId: 'answer1', question: 'Seal intact?', value: 'True', comment: 'Replaced'}],
    inspectionPhotos: [{fileId: 'photo1', fileName: 'seal.png'}], findings: []}, history: [
      {id: 'h1', action: 'QC Requested Changes', comments: 'Replace damaged seal', severity: 'High', actorName: 'Sumeet'},
      {id: 'h2', action: 'Surveyor Resubmitted', comments: 'Seal replaced'},
      {id: 'h3', action: 'QC Approved', comments: 'Retest passed'},
    ]}});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<ManagerQcReviewScreen userRole="Manager" />);});
  expect(textOf(renderer.root)).toContain('7Awaiting QC Review');
  expect(textOf(renderer.root)).toContain('Sandra');
  await click(renderer, 'View Project'); expect(api.getManagerQcProject).toHaveBeenCalledWith('p1');
  await click(renderer, 'View Area'); expect(api.getManagerQcArea).toHaveBeenCalledWith('p1', 'a1');
  await click(renderer, 'View Inspection'); expect(api.getManagerQcEquipment).toHaveBeenCalledWith('e1');
  const text = textOf(renderer.root);
  expect(text).toContain('Seal intact?'); expect(text).toContain('Replace damaged seal');
  expect(text).toContain('Surveyor Resubmitted'); expect(text).toContain('QC Approved');
  expect(renderer.root.findAllByType('AuthenticatedImage' as any)[0].props.path).toBe('/api/manager/qc-review/inspections/i1/photos/photo1');
  expect(renderer.root.findAllByType(TouchableOpacity).map(textOf)).toEqual(['Back', 'Refresh']);
  await click(renderer, 'Back'); expect(textOf(renderer.root)).toContain('Deck');
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test.each(['Surveyor', 'Qc', 'Client'])('hides monitoring menu and prevents API loads for %s', async role => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<Sidebar active="Dashboard" userRole={role} userName="User" onNavigate={jest.fn()} onLogout={jest.fn()} />);});
  expect(textOf(renderer.root)).not.toContain('QC Review');
  if (role === 'Qc') expect(textOf(renderer.root)).toContain('QC Pending');
  else expect(textOf(renderer.root)).not.toContain('QC Pending');
  await ReactTestRenderer.act(async () => {renderer.update(<ManagerQcReviewScreen userRole={role} />);});
  expect(api.getManagerQcDashboard).not.toHaveBeenCalled();
  expect(api.getManagerQcProjects).not.toHaveBeenCalled();
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test.each(['Manager', 'Admin'])('shows QC Review sidebar option for %s', async role => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<Sidebar active="ManagerQcReview" userRole={role} userName="User" onNavigate={jest.fn()} onLogout={jest.fn()} />);});
  expect(textOf(renderer.root)).toContain('QC Review');
  expect(textOf(renderer.root)).toContain('QC Pending');
  await ReactTestRenderer.act(async () => renderer.unmount());
});
