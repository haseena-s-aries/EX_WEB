import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Dimensions, StyleSheet, TouchableOpacity} from 'react-native';
import QcDashboardScreen from '../src/screens/QcDashboardScreen';
import {getQcDashboard, getQcProject, getQcProjects, getQcActivityQueue} from '../src/api/projects';

jest.mock('../src/api/projects', () => ({
  getQcDashboard: jest.fn(),
  getQcProjects: jest.fn(),
  getQcProject: jest.fn(),
  getQcActivityQueue: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (getQcActivityQueue as jest.Mock).mockResolvedValue({data: []});
  (getQcProject as jest.Mock).mockResolvedValue({data: {equipmentCount: 4, approvedCount: 1, changesRequestedCount: 2}});
});

const textOf = (node: ReactTestRenderer.ReactTestInstance): string =>
  node.children.map(child => typeof child === 'string' ? child : textOf(child)).join('');

test('refresh updates project metrics and keeps inspection activity navigation', async () => {
  (getQcDashboard as jest.Mock).mockResolvedValue({data: {approved: 1}});
  (getQcProjects as jest.Mock).mockResolvedValue({data: [{projectId: 'live', projectName: 'Live Vessel', qcReviewStatus: 'InReview', submissionDate: '2026-11-12T08:00:00Z'}]});
  (getQcActivityQueue as jest.Mock).mockResolvedValue({data: [{id: 'activity-1', projectName: 'Live Vessel', grade: 'Detailed', reviewStatus: 'Submitted', inspectorNameSnapshot: 'Inspector One'}]});
  const activity = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<QcDashboardScreen userName="Reviewer" onProjectPress={jest.fn()} onActivityPress={activity} />);});
  expect(textOf(renderer.root)).toContain('25%');
  expect(textOf(renderer.root)).toContain('Last Submission');
  (getQcProject as jest.Mock).mockResolvedValue({data: {equipmentCount: 4, approvedCount: 3, changesRequestedCount: 0}});
  await ReactTestRenderer.act(async () => {renderer.root.findAllByType(TouchableOpacity).find(b => b.props.accessibilityLabel === 'Refresh QC assignments')!.props.onPress();});
  expect(textOf(renderer.root)).toContain('75%');
  expect(textOf(renderer.root)).toContain('3 / 4');
  expect(getQcProjects).toHaveBeenCalledTimes(2);
  await ReactTestRenderer.act(async () => {renderer.root.findAllByType(TouchableOpacity).find(b => textOf(b).includes('Inspector One'))!.props.onPress();});
  expect(activity).toHaveBeenCalledWith('activity-1');
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('failed assignments can be retried and empty assignments remain clear', async () => {
  (getQcDashboard as jest.Mock).mockResolvedValue({data: {}});
  (getQcProjects as jest.Mock).mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValue({data: []});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<QcDashboardScreen userName="Reviewer" onProjectPress={jest.fn()} />);});
  expect(textOf(renderer.root)).toContain('Unable to load assignments');
  await ReactTestRenderer.act(async () => {renderer.root.findAllByType(TouchableOpacity).find(b => textOf(b) === 'Try again')!.props.onPress();});
  expect(textOf(renderer.root)).toContain('No projects assigned');
  expect(getQcProject).not.toHaveBeenCalled();
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test.each([390, 1600])('project cards reflow at %ipx without losing their actions', async width => {
  const originalWindow = Dimensions.get('window');
  const originalScreen = Dimensions.get('screen');
  Dimensions.set({window: {...originalWindow, width}, screen: {...originalScreen, width}});
  (getQcDashboard as jest.Mock).mockResolvedValue({data: {}});
  (getQcProjects as jest.Mock).mockResolvedValue({data: [{projectId: 'responsive', projectName: 'Responsive Vessel', qcReviewStatus: 'PendingReview'}]});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  try {
    await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<QcDashboardScreen userName="Reviewer" onProjectPress={jest.fn()} />);});
    const card = renderer.root.findAll(node => node.props.testID === 'qc-workspace-project')[0];
    expect(StyleSheet.flatten(card.props.style).flexDirection).toBe(width < 1400 ? 'column' : 'row');
    const open = renderer.root.findAllByType(TouchableOpacity).find(button => button.props.accessibilityLabel === 'Open Project: Responsive Vessel')!;
    expect(StyleSheet.flatten(open.props.style).minHeight).toBeGreaterThanOrEqual(44);
  } finally {
    await ReactTestRenderer.act(async () => {renderer?.unmount();});
    Dimensions.set({window: originalWindow, screen: originalScreen});
  }
});

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
  expect(textOf(renderer.root)).toContain('Welcome, QC One');
  expect(textOf(renderer.root)).toContain('25%');
  expect(textOf(renderer.root)).toContain('1 / 4');
  expect(textOf(renderer.root)).toContain('QC approval progress');
  expect(getQcProject).toHaveBeenCalledWith('project-1');
  const projectButton = renderer.root
    .findAllByType(TouchableOpacity)
    .find(button => button.props.accessibilityLabel === 'Open Project: MV Resolute');

  await ReactTestRenderer.act(async () => {
    projectButton?.props.onPress();
  });

  expect(onProjectPress).toHaveBeenCalledWith(
    'project-1',
    expect.objectContaining({projectName: 'MV Resolute'}),
  );
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('unavailable detail metrics remain unknown and project navigation still works', async () => {
  (getQcDashboard as jest.Mock).mockResolvedValue({data: {}});
  (getQcProjects as jest.Mock).mockResolvedValue({data: [{projectId: 'p', projectName: 'Offline details', qcReviewStatus: 'InReview'}]});
  (getQcProject as jest.Mock).mockRejectedValue(new Error('Details unavailable'));
  const open = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<QcDashboardScreen userName="Jamie" onProjectPress={open} />);});
  expect(textOf(renderer.root)).toContain('Details unavailable');
  expect(textOf(renderer.root)).not.toContain('0%');
  await ReactTestRenderer.act(async () => {renderer.root.findAllByType(TouchableOpacity).find(b => b.props.accessibilityLabel === 'Open Project: Offline details')!.props.onPress();});
  expect(open).toHaveBeenCalledWith('p', expect.objectContaining({projectName: 'Offline details'}));
  await ReactTestRenderer.act(async () => renderer.unmount());
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
  const projectButton = renderer.root.findAllByType(TouchableOpacity).find(node => node.props.testID === 'qc-operations-project');
  await ReactTestRenderer.act(async () => {projectButton!.props.onPress();});
  expect(onProjectPress).toHaveBeenCalledWith('team-project', expect.objectContaining({assignedQcName: 'Sumeet'}));
  await ReactTestRenderer.act(async () => renderer.unmount());
});
