import React from 'react';
import Renderer from 'react-test-renderer';
import InspectionActivityScreen from '../src/screens/InspectionActivityScreen';
import {getInspectionActivity} from '../src/api/projects';

jest.mock('../src/api/projects', () => ({
  addInspectionFinding: jest.fn(), createFindingCorrectiveAction: jest.fn(), getInspectionActivity: jest.fn(),
  getInspectionActivityHistory: jest.fn().mockResolvedValue({data: []}), reportCorrectiveActionRectification: jest.fn(),
  reviewActivityCheckpoint: jest.fn(), reviewInspectionActivity: jest.fn(), saveActivityCheckpoint: jest.fn(),
  startInspectionActivity: jest.fn(), submitCorrectiveActionVerification: jest.fn(), submitInspectionActivity: jest.fn(),
  uploadActivityPhoto: jest.fn(), uploadCorrectiveActionPhoto: jest.fn(), verifyCorrectiveAction: jest.fn(),
}));
jest.mock('../src/components/InspectionPhotoPicker', () => 'InspectionPhotoPicker');
jest.mock('../src/components/AuthenticatedImage', () => 'AuthenticatedImage');
const textOf = (node: Renderer.ReactTestInstance): string => node.children.map(child => typeof child === 'string' ? child : textOf(child)).join(' ');
test('shows the immutable approved checklist snapshot and controlled source', async () => {
  (getInspectionActivity as jest.Mock).mockResolvedValue({data: {id: 'a1', grade: 'Close', startedAt: new Date().toISOString(), reviewStatus: 'Accepted', checklist: {standardReference: 'IEC 60079-17', standardEdition: '2023', controlledSourceReference: 'Controlled IEC/client checklist edition approved for this project', protectionTypeSnapshot: 'Ex d'}, checkpoints: [], responses: [], findings: [], evidence: [], reviewHistory: []}});
  let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {renderer = Renderer.create(<InspectionActivityScreen activityId="a1" role="Client" onBack={jest.fn()} />);});
  expect(textOf(renderer.root)).toContain('IEC 60079-17');
  expect(textOf(renderer.root)).toContain('2023');
  expect(textOf(renderer.root)).toContain('Close inspection');
  expect(textOf(renderer.root)).toContain('Controlled source: Controlled IEC/client checklist edition approved for this project');
  expect(textOf(renderer.root)).toContain('Ex protection type: Ex d');
  await Renderer.act(async () => renderer.unmount());
});
