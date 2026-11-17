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


test('history displays equipment context and opens saved results without starting another inspection', async()=>{
 const api=require('../src/api/projects');api.getInspectionActivityHistory.mockResolvedValue({data:[{id:'saved',grade:'Visual',startedAt:'2026-11-11T10:00:00Z',reviewStatus:'Accepted',inspectorNameSnapshot:'Recorded Inspector',completedAt:'2026-11-11T11:00:00Z'}]});
 api.getInspectionActivity.mockResolvedValue({data:{id:'saved',grade:'Visual',reviewStatus:'Accepted',checkpoints:[],responses:[],findings:[],evidence:[],reviewHistory:[]}});
 let renderer!:Renderer.ReactTestRenderer;const back=jest.fn();
 await Renderer.act(async()=>{renderer=Renderer.create(<InspectionActivityScreen equipmentId="eq-1" role="Admin" backLabel="Back to Equipment Identification" equipmentContext={{tagNumber:'TAG-001',rfidTagUid:'04AB1234',projectName:'Actual project',description:'Recorded motor'}} onBack={back}/>);});
 expect(textOf(renderer.root)).toContain('Equipment Inspection History');expect(textOf(renderer.root)).toContain('04AB1234');expect(textOf(renderer.root)).toContain('Recorded Inspector');
 const row=renderer.root.findAllByType(require('react-native').TouchableOpacity).find(n=>textOf(n).includes('Open saved checklist'))!;
 await Renderer.act(async()=>row.props.onPress());expect(api.getInspectionActivity).toHaveBeenCalledWith('saved');
 await Renderer.act(async()=>renderer.unmount());
});
