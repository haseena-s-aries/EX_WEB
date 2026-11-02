import React from 'react';
import Renderer from 'react-test-renderer';
import {TouchableOpacity} from 'react-native';
import DefectRegisterScreen from '../src/screens/DefectRegisterScreen';
import * as api from '../src/api/projects';

jest.mock('../src/api/projects', () => ({getInspectionDefects: jest.fn(), reportCorrectiveActionRectification: jest.fn(), submitCorrectiveActionVerification: jest.fn(), uploadCorrectiveActionPhoto: jest.fn(), verifyCorrectiveAction: jest.fn()}));
jest.mock('../src/components/InspectionPhotoPicker', () => 'InspectionPhotoPicker');
jest.mock('../src/components/AuthenticatedImage', () => 'AuthenticatedImage');
const content = (node: Renderer.ReactTestInstance): string => node.children.map(x => typeof x === 'string' ? x : content(x)).join('');
let renderer: Renderer.ReactTestRenderer;

afterEach(async () => {await Renderer.act(async () => renderer?.unmount());});
test('QC reviews a submitted rectification from the defect register', async () => {
  jest.clearAllMocks();
  (api.getInspectionDefects as jest.Mock).mockResolvedValue({data: [{id: 'f1', actionId: 'a1', actionStatus: 'SubmittedForVerification', equipmentTag: 'PUMP-1', faultCode: 'FC-1', observation: 'Seal damaged', project: 'Synthetic', checkpoint: 'Seal intact', reportedAt: new Date().toISOString(), history: [], evidence: []}]});
  (api.verifyCorrectiveAction as jest.Mock).mockResolvedValue({data: {}});
  await Renderer.act(async () => {renderer = Renderer.create(<DefectRegisterScreen role="Qc"/>); await Promise.resolve(); await Promise.resolve();});
  expect(content(renderer.root)).toContain('Seal damaged');
  await Renderer.act(async () => {renderer.root.findAllByType(TouchableOpacity).find(x => content(x) === 'Verify correction')!.props.onPress(); await Promise.resolve(); await Promise.resolve();});
  expect(api.verifyCorrectiveAction).toHaveBeenCalledWith('a1', true, '');
});

