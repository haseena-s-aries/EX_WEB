import React from 'react';
import Renderer from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
import apiClient from '../src/api/client';
import { createProject, updateProject } from '../src/api/projects';
import {
  validateHazardousAreaPlan,
  PLAN_TYPE_ERROR,
} from '../src/components/hazardousAreaPlan';
import HazardousAreaPlanUpload from '../src/components/HazardousAreaPlanUpload.web';
import HazardousAreaPlanSection from '../src/components/HazardousAreaPlanSection';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { post: jest.fn(), put: jest.fn() },
}));
jest.mock('../src/components/HazardousAreaPlanViewer', () => 'PlanViewer');
jest.mock('../src/components/AuthenticatedImage', () => 'AuthenticatedImage');

const textOf = (node: Renderer.ReactTestInstance): string =>
  node.children
    .map(child => (typeof child === 'string' ? child : textOf(child)))
    .join('');
test('validates extensions and MIME types with the required message', () => {
  ['plan.jpg', 'plan.JPEG', 'plan.PNG', 'plan.pdf'].forEach(name =>
    expect(validateHazardousAreaPlan({ name })).toBe(''),
  );
  ['plan.gif', 'plan.exe', 'plan.pdf.exe'].forEach(name =>
    expect(validateHazardousAreaPlan({ name })).toBe(PLAN_TYPE_ERROR),
  );
  expect(
    validateHazardousAreaPlan({ name: 'plan.jpg', type: 'application/pdf' }),
  ).toBe(PLAN_TYPE_ERROR);
  expect(validateHazardousAreaPlan({name: 'plan.PNG', type: 'image/png'})).toBe('');
  expect(validateHazardousAreaPlan({name: 'plan.png', type: 'image/jpeg'})).toBe(PLAN_TYPE_ERROR);
});
test('unsupported file preserves selection and shows inline error', async () => {
  const onChange = jest.fn();
  let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {
    renderer = Renderer.create(
      <HazardousAreaPlanUpload value={null} onChange={onChange} />,
    );
  });
  await Renderer.act(async () => {
    renderer.root
      .findByType('input')
      .props.onChange({
        target: {
          files: [{ name: 'plan.gif', type: 'image/gif' }],
          value: 'plan.gif',
        },
      });
  });
  expect(onChange).not.toHaveBeenCalled();
  expect(textOf(renderer.root)).toContain(PLAN_TYPE_ERROR);
  await Renderer.act(async () => {
    renderer.root
      .findByType('input')
      .props.onChange({
        target: { files: [{ name: 'plan.pdf', type: 'application/pdf' }] },
      });
  });
  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'plan.pdf', type: 'application/pdf' }),
  );
});
test('project API keeps JSON without plan and sends multipart only for explicit upload', () => {
  const data = {
    projectName: 'Test',
    sector: 'Marine',
    jobNo: '1',
    location: 'Dubai',
    vesselOrSiteName: 'Site',
    assignedSurveyorId: '1',
    assignedQcId: '2',
    assignedClientId: '3',
  };
  createProject(data);
  expect(apiClient.post).toHaveBeenLastCalledWith('/projects', {
    ...data,
    projectName: 'Test', location: 'Dubai', vesselOrSiteName: 'Site',
    status: 'Pending',
    uidNumber: null, documentNumber: null, revision: null, description: null, clientName: null,
  });
  updateProject('project', { ...data, status: 'Active' });
  expect(apiClient.put).toHaveBeenLastCalledWith('/projects/project', {
    ...data,
    projectName: 'TEST', location: 'DUBAI', vesselOrSiteName: 'SITE',
    status: 'Active',
    uidNumber: null, documentNumber: null, revision: null, description: null, clientName: null,
  });
  createProject({
    ...data,
    hazardousAreaPlan: {
      name: 'plan.pdf',
      type: 'application/pdf',
      uri: 'file://plan.pdf',
    },
  });
  expect(apiClient.post).toHaveBeenLastCalledWith(
    '/projects',
    expect.any(FormData),
  );
  expect(() =>
    createProject({
      ...data,
      hazardousAreaPlan: { name: 'bad.gif', type: 'image/gif' },
    }),
  ).toThrow(PLAN_TYPE_ERROR);
});
test('details do not eagerly download files and open viewer only on demand', async () => {
  let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {
    renderer = Renderer.create(<HazardousAreaPlanSection project={{}} />);
  });
  expect(textOf(renderer.root)).toContain('Not Uploaded');
  expect(renderer.root.findAllByType(TouchableOpacity)).toHaveLength(0);
  await Renderer.act(async () => {
    renderer.update(
      <HazardousAreaPlanSection
        project={{
          hazardousAreaPlanPath: '/api/projects/1/hazardous-area-plan',
          hazardousAreaPlanFileName: 'plan.jpg',
          hazardousAreaPlanContentType: 'image/jpeg',
        }}
      />,
    );
  });
  expect(renderer.root.findAllByType('AuthenticatedImage' as any)).toHaveLength(
    0,
  );
  expect(renderer.root.findAllByType('PlanViewer' as any)).toHaveLength(0);
  expect(textOf(renderer.root)).not.toContain('plan.jpg');
  expect(textOf(renderer.root)).not.toContain('Load image preview');
  await Renderer.act(async () => {
    renderer.root
      .findAllByType(TouchableOpacity)
      .find(button => textOf(button).includes('View Plan'))!
      .props.onPress();
  });
  expect(renderer.root.findByType('PlanViewer' as any).props.path).toBe(
    '/api/projects/1/hazardous-area-plan',
  );
});
