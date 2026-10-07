import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {TouchableOpacity} from 'react-native';
import QcDashboardScreen from '../src/screens/QcDashboardScreen';
import {getQcDashboard, getQcProjects} from '../src/api/projects';

jest.mock('../src/api/projects', () => ({
  getQcDashboard: jest.fn(),
  getQcProjects: jest.fn(),
}));

const textOf = (node: ReactTestRenderer.ReactTestInstance): string =>
  node.children.map(child => typeof child === 'string' ? child : textOf(child)).join('');

test('loads assigned QC projects and opens the selected project', async () => {
  (getQcDashboard as jest.Mock).mockResolvedValue({
    data: {awaitingQcReview: 1, changesRequested: 2, approved: 3, overdue: 0},
  });
  (getQcProjects as jest.Mock).mockResolvedValue({
    data: [
      {
        projectId: 'project-1',
        projectName: 'MV Resolute',
        jobNo: 'JOB-42',
        location: 'Rotterdam',
        qcReviewStatus: 'PendingReview',
      },
    ],
  });
  const onProjectPress = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <QcDashboardScreen
        userName="QC One"
        onProjectPress={onProjectPress}
      />,
    );
  });

  expect(textOf(renderer.root)).toContain('Changes Required');
  expect(textOf(renderer.root)).toContain('2');
  const projectButton = renderer.root
    .findAllByType(TouchableOpacity)
    .find(button => textOf(button).includes('MV Resolute'));

  await ReactTestRenderer.act(async () => {
    projectButton?.props.onPress();
  });

  expect(onProjectPress).toHaveBeenCalledWith(
    'project-1',
    expect.objectContaining({projectName: 'MV Resolute'}),
  );
});

test('Manager QC Pending reuses the dashboard with backend counts and assigned QC metadata', async () => {
  (getQcDashboard as jest.Mock).mockResolvedValue({
    data: {awaitingQcReview: 0, changesRequested: 2, approved: 3, overdue: 1},
  });
  (getQcProjects as jest.Mock).mockResolvedValue({data: [{
    projectId: 'team-project', projectName: 'Team Vessel', jobNo: 'JOB-51', location: 'Dubai',
    surveyorName: 'Alex', assignedQcName: 'Sumeet', qcReviewStatus: 'PendingReview',
  }]});
  const onProjectPress = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<QcDashboardScreen userName="Marcus" pendingWorkspace onProjectPress={onProjectPress} />);
  });
  const text = textOf(renderer.root);
  expect(text).toContain('QC Pending');
  expect(getQcProjects).toHaveBeenCalledWith(true);
  expect(text).toContain('QC Projects');
  expect(text).toContain('0Awaiting QC Review');
  expect(text).toContain('2Changes Requested');
  expect(text).toContain('3Approved');
  expect(text).toContain('1Overdue');
  expect(text).not.toContain('Total Projects');
  expect(text).toContain('SurveyorAlex');
  expect(text).toContain('Assigned QCSumeet');
  const projectButton = renderer.root.findAllByType(TouchableOpacity).find(node => textOf(node).includes('Team Vessel'));
  await ReactTestRenderer.act(async () => {projectButton!.props.onPress();});
  expect(onProjectPress).toHaveBeenCalledWith('team-project', expect.objectContaining({assignedQcName: 'Sumeet'}));
  await ReactTestRenderer.act(async () => renderer.unmount());
});
