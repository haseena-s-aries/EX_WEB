import React from 'react';
import Renderer from 'react-test-renderer';
import { TextInput, TouchableOpacity } from 'react-native';
import ProjectDateField from '../src/components/ProjectDateField';
import NewProjectModal from '../src/components/NewProjectModal';
import { qcAssignmentLabel } from '../src/components/projectAssignmentLabels';
import { createProject } from '../src/api/projects';
import apiClient from '../src/api/client';

jest.mock('../src/components/HazardousAreaPlanUpload', () => 'PlanUpload');
jest.mock('../src/components/ClientLogoUpload', () => 'ClientLogoUpload');
jest.mock('../src/components/AuthenticatedImage', () => 'AuthenticatedImage');
jest.mock('../src/api/companies', () => ({getCompanies: jest.fn().mockResolvedValue({data: []})}));
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
test('create form preserves input case and submits without Client using selected QC id', async () => {
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
    input('e.g. Rotterdam, Netherlands', 'Australia');
    input('e.g. MV Resolute', 'rig34323');
    input('e.g. Pipe Rack Deck', 'Deck');
    press('Select surveyor');
    press('Select QC');
  });
  expect(textOf(renderer.root)).toContain('Sumeet — QC — Manager: Marcus');
  expect(textOf(renderer.root)).toContain('Assign Client ID');
  for (const missingJobNumber of ['', '   ']) {
    await Renderer.act(async () => {
      input('JOB-2026-0453', missingJobNumber);
      press('Create Project');
    });
    expect(textOf(renderer.root)).toContain('Job Number is required.');
    expect(onCreate).not.toHaveBeenCalled();
  }
  await Renderer.act(async () => {input('JOB-2026-0453', ' d343h ');});
  await Renderer.act(async () => {press('Create Project');});
  expect(textOf(renderer.root)).toContain('Target Date is required.');
  expect(onCreate).not.toHaveBeenCalled();
  await Renderer.act(async () => {renderer.root.findByType(ProjectDateField).props.onChange('2026-12-15');});


  await Renderer.act(async () => {
    press('Create Project');
  });
  expect(onCreate).not.toHaveBeenCalled();
  expect(textOf(renderer.root)).toContain('Client Company Name is required.');
  await Renderer.act(async () => {input('Enter Client Company Name / Details', 'Example Client Company');});
  await Renderer.act(async () => {press('Create Project');});
  expect(onCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      projectName: 'mv resolute annual inspection',
      jobNumber: 'd343h',
      targetDate: '2026-12-15',
      location: 'Australia',
      vesselName: 'rig34323',
      surveyorId: 'surveyor',
      qcId: 'qc-user',
      clientId: '',
      clientName: 'Example Client Company',
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
      projectName: 'site',
      sector: 'Oil & Gas',
      assignedSurveyorId: 'SurveyorId',
      assignedQcId: 'QcId',
    }),
  );
});
