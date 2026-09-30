import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {TouchableOpacity} from 'react-native';
import SurveyorDashboardScreen from '../src/screens/SurveyorDashboardScreen';
import {
  getSurveyorDashboard,
  getSurveyorProjects,
} from '../src/api/projects';

jest.mock('../src/api/projects', () => ({
  getSurveyorDashboard: jest.fn(),
  getSurveyorProjects: jest.fn(),
}));

const textOf = (node: ReactTestRenderer.ReactTestInstance): string =>
  node.children.map(child => typeof child === 'string' ? child : textOf(child)).join('');

const buttonNamed = (root: ReactTestRenderer.ReactTestInstance, name: string) =>
  root.findAllByType(TouchableOpacity).find(button => textOf(button).includes(name));

test('shows assigned Surveyor counts and opens QC feedback equipment', async () => {
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
  expect(content).toContain('My Projects');
  expect(content).toContain('Action Required');
  expect(content).toContain('Correct certificate details');
  expect(content).toContain('High');

  await ReactTestRenderer.act(async () => {
    buttonNamed(renderer.root, 'EQ-003')?.props.onPress();
  });
  expect(onFeedbackPress).toHaveBeenCalledWith(feedback);
});
