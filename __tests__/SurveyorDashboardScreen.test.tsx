import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {TouchableOpacity} from 'react-native';
import SurveyorDashboardScreen from '../src/screens/SurveyorDashboardScreen';
import {
  getAssignedInspectionDrafts,
  getAssignedInspectionTasks,
  getSurveyorDashboard,
  getSurveyorProjects,
} from '../src/api/projects';

jest.mock('@react-navigation/native', () => ({NavigationContext: require('react').createContext(null)}));
jest.mock('../src/screens/CategoryInspectionEntryScreen', () => 'CategoryInspectionEntryScreen');
jest.mock('../src/screens/EquipmentInspectionScreen', () => 'EquipmentInspectionScreen');
jest.mock('../src/screens/InspectionActivityScreen', () => 'InspectionActivityScreen');

jest.mock('../src/api/projects', () => ({
  getAssignedInspectionDrafts: jest.fn(),
  getAssignedInspectionTasks: jest.fn(),
  getSurveyorDashboard: jest.fn(),
  getSurveyorEquipmentDetails: jest.fn().mockResolvedValue({data: {projectId: 'project-1', areaId: 'area-1'}}),
  getSurveyorProjects: jest.fn(),
  projectStatusLabel: (value: string) => value,
}));

const textOf = (node: ReactTestRenderer.ReactTestInstance): string =>
  node.children.map(child => typeof child === 'string' ? child : textOf(child)).join('');

const buttonNamed = (root: ReactTestRenderer.ReactTestInstance, name: string) =>
  root.findAllByType(TouchableOpacity).find(button => textOf(button).includes(name));

test('shows assigned Surveyor counts and opens QC feedback equipment', async () => {
  (getAssignedInspectionDrafts as jest.Mock).mockResolvedValue({data: []});
  (getAssignedInspectionTasks as jest.Mock).mockResolvedValue({data: []});
  (getSurveyorProjects as jest.Mock).mockResolvedValue({data: [{
    projectId: 'project-1',
    projectName: 'MV Resolute',
    sector: 'Marine',
    jobNo: 'JOB-1',
    location: 'Rotterdam',
    vesselOrSiteName: 'MV Resolute',
    createdDate: '2026-09-30T00:00:00Z',
    areaCount: 1,
    status: 'InProgress',
  }]});
  const feedback = {
    projectId: 'project-1',
    areaId: 'area-1',
    equipmentId: 'equipment-1',
    projectName: 'MV Resolute',
    areaName: 'PIPE',
    sequenceNo: 3,
    tagNumber: 'EQ-003',
    type: 'Motor',
    qcComments: 'Correct certificate details',
    severity: 'High' as const,
    reviewedDate: '2026-09-30T08:00:00Z',
  };
  (getSurveyorDashboard as jest.Mock).mockResolvedValue({data: {
    myProjectCount: 4,
    inProgress: 2,
    onHold: 1,
    notStarted: 1,
    awaitingQcReview: 3,
    changesRequested: 1,
    qcApproved: 5,
    qcFeedback: [feedback],
  }});
  const onFeedbackPress = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SurveyorDashboardScreen
        userName="Surveyor One"
        onProjectPress={jest.fn()}
        onFeedbackPress={onFeedbackPress}
      />,
    );
  });

  const content = textOf(renderer.root);
  expect(content).toContain('Assigned Projects');
  expect(content).toContain('Action Required');
  expect(content).toContain('Correct certificate details');
  expect(content).toContain('HIGH');

  await ReactTestRenderer.act(async () => {
    buttonNamed(renderer.root, 'EQ-003')?.props.onPress();
  });
  expect(onFeedbackPress).toHaveBeenCalledWith(feedback);
});

test('continues the same saved category draft and displays real progress', async () => {
  const draft = {id: 'draft-1', projectId: 'project-1', projectName: 'MV Resolute', equipmentId: 'equipment-1',
    tagNumber: 'EQ-003', grade: null, reviewStatus: 'Draft', updatedAt: '2026-11-09T04:30:00Z',
    startedAt: '2026-11-08T00:00:00Z', answered: 6, total: 12, lastUpdatedBy: 'Original Surveyor'};
  (getAssignedInspectionDrafts as jest.Mock).mockResolvedValue({data: [draft]});
  (getAssignedInspectionTasks as jest.Mock).mockResolvedValue({data: []});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<SurveyorDashboardScreen userName="Receiving Surveyor" onProjectPress={jest.fn()} onFeedbackPress={jest.fn()} />);});
  expect(textOf(renderer.root)).toContain('6/12 checkpoints');
  expect(textOf(renderer.root)).toContain('Original Surveyor');
  await ReactTestRenderer.act(async () => {buttonNamed(renderer.root, 'Continue Inspection')?.props.onPress();});
  expect(renderer.root.findByType('CategoryInspectionEntryScreen' as any).props.initialDraft).toEqual(draft);
});
