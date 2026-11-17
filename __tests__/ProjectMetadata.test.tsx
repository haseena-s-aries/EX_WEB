import React from 'react';
import Renderer from 'react-test-renderer';
import {Platform, TextInput} from 'react-native';
import ProjectMetadataFields, {emptyProjectMetadata} from '../src/components/ProjectMetadataFields';
import {validateClientLogo} from '../src/components/clientLogo';
import {createProject, updateProject} from '../src/api/projects';
import apiClient from '../src/api/client';
jest.mock('../src/api/client', () => ({__esModule: true, default: {post: jest.fn(), put: jest.fn()}}));
const request = {projectName: ' project ', sector: 'Shipping', jobNo: ' job ', location: ' location ', vesselOrSiteName: ' vessel ', assignedSurveyorId: 'surveyor-id', assignedQcId: 'qc-id'};
test('metadata fields are optional and input handlers store actual uppercase values', async () => {
  const change = jest.fn(); let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {renderer = Renderer.create(<ProjectMetadataFields value={emptyProjectMetadata()} onChange={change} />);});
  const fields = renderer.root.findAllByType(TextInput);
  expect(fields).toHaveLength(4);
  await Renderer.act(async () => {fields[1].props.onChangeText('kd2259/5001');});
  expect(change.mock.calls[0][0].documentNumber).toBe('KD2259/5001');
  expect(fields[3].props.multiline).toBe(true);
  await Renderer.act(async () => renderer.unmount());
});
test('JSON creates trim optional metadata without changing case and keep assignment identifiers unchanged', () => {
  createProject({...request, uidNumber: ' uid ', documentNumber: ' doc/1 ', revision: ' rev a ', description: ' initial issue ', clientName: ' client '});
  expect((apiClient.post as jest.Mock).mock.calls.at(-1)[1]).toMatchObject({projectName: 'project', jobNo: 'job', uidNumber: 'uid', documentNumber: 'doc/1', revision: 'rev a', description: 'initial issue', clientName: 'client', assignedSurveyorId: 'surveyor-id', assignedQcId: 'qc-id', assignedClientId: null});
  updateProject('project', {...request, status: 'Active', removeClientLogo: true});
  expect((apiClient.put as jest.Mock).mock.calls.at(-1)[1]).toMatchObject({removeClientLogo: true, clientName: null, revision: null});
});
test('logo allows only JPG JPEG PNG with matching MIME type', () => {
  for (const name of ['Logo.jpg', 'Logo.JPEG', 'Logo.PNG']) expect(validateClientLogo({name})).toBe('');
  for (const file of [{name: 'logo.webp', type: 'image/webp'}, {name: 'logo.pdf', type: 'application/pdf'}, {name: 'logo.jpg', type: 'image/png'}]) expect(validateClientLogo(file)).toBe('Only JPG, JPEG and PNG images are allowed.');
});
test('logo and hazardous plan share one multipart write without uppercasing original filename', () => {
  const originalFormData = (globalThis as any).FormData;
  class CapturedFormData {parts: Record<string, any> = {}; append(key: string, value: any) {this.parts[key] = value;}}
  (globalThis as any).FormData = CapturedFormData;
  const original = Platform.OS; Object.defineProperty(Platform, 'OS', {configurable: true, value: 'android'});
  try {
    createProject({...request, clientName: ' client ', clientLogo: {uri: 'file://logo.png', name: 'OriginalCase.png', type: 'image/png'}, hazardousAreaPlan: {uri: 'file://plan.pdf', name: 'PlanCase.pdf', type: 'application/pdf'}});
    const parts = (apiClient.post as jest.Mock).mock.calls.at(-1)[1].parts;
    expect(parts.clientLogo.name).toBe('OriginalCase.png');
    expect(parts.hazardousAreaPlan.name).toBe('PlanCase.pdf');
    expect(parts.clientName).toBe('client');
  } finally {(globalThis as any).FormData = originalFormData; Object.defineProperty(Platform, 'OS', {configurable: true, value: original});}
});
