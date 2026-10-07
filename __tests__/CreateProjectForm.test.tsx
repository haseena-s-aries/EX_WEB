import React from 'react';
import Renderer from 'react-test-renderer';
import { TextInput, TouchableOpacity } from 'react-native';
import NewProjectModal from '../src/components/NewProjectModal';
import { qcAssignmentLabel } from '../src/components/projectAssignmentLabels';
import { createProject } from '../src/api/projects';
import apiClient from '../src/api/client';

jest.mock('../src/components/HazardousAreaPlanUpload', () => 'PlanUpload');
jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { post: jest.fn(), put: jest.fn() },
}));
const textOf = (node: Renderer.ReactTestInstance): string =>
  node.children
    .map(child => (typeof child === 'string' ? child : textOf(child)))
    .join('');
test('QC label preserves actual names and includes role and reporting Manager', () => {
  expect(
    qcAssignmentLabel({ displayName: 'Sumeet', managerName: 'Marcus' }),
  ).toBe('Sumeet — QC — Manager: Marcus');
  expect(qcAssignmentLabel({ displayName: 'John' })).toBe(
    'John — QC — Manager: Not Assigned',
  );
});
test('create form uppercases inputs and submits without Client using selected QC id', async () => {
  const onCreate = jest.fn();
  let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {
    renderer = Renderer.create(
      <NewProjectModal
        visible
        onClose={jest.fn()}
        onCreate={onCreate}
        surveyors={[{ id: 'surveyor', displayName: 'sumedh' }]}
        qcUsers={[
          {
            id: 'qc-user',
            displayName: 'Sumeet',
            managerId: 'manager-user',
            managerName: 'Marcus',
          },
        ]}
        clients={[]}
      />,
    );
  });
  const input = (placeholder: string, value: string) =>
    renderer.root
      .findAllByType(TextInput)
      .find(node => node.props.placeholder === placeholder)!
      .props.onChangeText(value);
  const press = (text: string) =>
    renderer.root
      .findAllByType(TouchableOpacity)
      .find(node => textOf(node).includes(text))!
      .props.onPress();
  await Renderer.act(async () => {
    input(
      'e.g. MV Resolute Annual Inspection',
      'mv resolute annual inspection',
    );
    input('JOB-2026-0453', 'd343h');
    input('e.g. Rotterdam, Netherlands', 'Australia');
    input('e.g. MV Resolute', 'rig34323');
    input('e.g. Pipe Rack Deck', 'Deck');
    press('Select surveyor');
    press('Select QC');
  });
  expect(textOf(renderer.root)).toContain('Sumeet — QC — Manager: Marcus');
  expect(textOf(renderer.root)).toContain('Assign Client (Optional)');
  await Renderer.act(async () => {
    press('Create Project');
  });
  expect(onCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      projectName: 'MV RESOLUTE ANNUAL INSPECTION',
      jobNumber: 'D343H',
      location: 'AUSTRALIA',
      vesselName: 'RIG34323',
      surveyorId: 'surveyor',
      qcId: 'qc-user',
      clientId: '',
    }),
  );
  expect(onCreate.mock.calls[0][0].qcId).not.toBe('manager-user');
  await Renderer.act(async () => {
    renderer.unmount();
  });
});
test('API sends null Client without uppercasing user IDs or filenames', () => {
  createProject({
    projectName: 'site',
    sector: 'Oil & Gas',
    jobNo: 'a1',
    location: 'Dubai',
    vesselOrSiteName: 'rig',
    assignedSurveyorId: 'SurveyorId',
    assignedQcId: 'QcId',
    assignedClientId: '',
  });
  expect(apiClient.post).toHaveBeenCalledWith(
    '/projects',
    expect.objectContaining({
      assignedClientId: null,
      projectName: 'SITE',
      sector: 'Oil & Gas',
      assignedSurveyorId: 'SurveyorId',
      assignedQcId: 'QcId',
    }),
  );
});
