import React from 'react';
import Renderer from 'react-test-renderer';
import {TouchableOpacity} from 'react-native';
import Screen from '../src/screens/QcProjectDetailsScreen';
import * as api from '../src/api/projects';
jest.mock('../src/api/projects',()=>({getQcProject:jest.fn(),getQcArea:jest.fn(),getQcEquipmentInspection:jest.fn(),startQcReview:jest.fn(),approveQcInspection:jest.fn(),requestQcChanges:jest.fn(),updateQcComments:jest.fn()}));
jest.mock('../src/components/ReportWorkflowPanel',()=> 'ReportStatus');
jest.mock('../src/components/AuthenticatedImage',()=> 'Photo');
jest.mock('../src/components/ZoomableImageViewer',()=> 'Viewer');
const text=(n:Renderer.ReactTestInstance):string=>n.children.map(c=>typeof c==='string'?c:text(c)).join('');
let view:Renderer.ReactTestRenderer;
async function press(label:string){const b=view.root.findAllByType(TouchableOpacity).find(n=>n.props.accessibilityLabel===label||text(n)===label)!;await Renderer.act(async()=>b.props.onPress());}
beforeEach(()=>{jest.clearAllMocks();(api.getQcProject as jest.Mock).mockResolvedValue({data:{projectName:'Actual Vessel',jobNo:'JOB-1',projectStatus:'InProgress',qcStatus:'PendingReview',areas:[{areaId:'a1',areaName:'Lower Deck'}]}});(api.getQcArea as jest.Mock).mockResolvedValue({data:{equipment:[{equipmentId:'e1',tagNumber:'TAG-1',inspectionId:'i1',type:'Motor'},{equipmentId:'e2',tagNumber:'TAG-2',type:'Pump'}]}});(api.getQcEquipmentInspection as jest.Mock).mockResolvedValue({data:{inspectionId:'i1',qcReviewStatus:'PendingReview',surveyorRemarks:'Saved observation',checklistAnswers:[{question:'Original checkpoint',value:'Pass',comment:'Saved remark'}],photos:[{id:'photo-1',downloadUrl:'/actual-photo.png'}]}});});
afterEach(async()=>{await Renderer.act(async()=>view?.unmount());});
test('areas expand and collapse, report status is read-only, and unsubmitted work stays disabled',async()=>{
 await Renderer.act(async()=>{view=Renderer.create(<Screen projectId="p1" onBack={jest.fn()}/>);});
 expect(text(view.root)).toContain('Actual Vessel');expect(view.root.findByType('ReportStatus' as any).props.readOnly).toBe(true);
 expect(text(view.root)).toContain('TAG-1');expect(text(view.root)).toContain('Waiting for the surveyor');
 const buttons=view.root.findAllByType(TouchableOpacity).filter(n=>text(n)==='Review inspection');expect(buttons.filter(n=>n.props.disabled)).toHaveLength(1);
 await press('Toggle Lower Deck');expect(text(view.root)).not.toContain('TAG-1');await press('Toggle Lower Deck');expect(text(view.root)).toContain('TAG-1');expect(api.startQcReview).not.toHaveBeenCalled();
});
test('existing review opens saved checklist, remarks and photos and preserves approval calls',async()=>{
 await Renderer.act(async()=>{view=Renderer.create(<Screen projectId="p1" onBack={jest.fn()}/>);});
 const b=view.root.findAllByType(TouchableOpacity).find(n=>text(n)==='Review inspection'&&!n.props.disabled)!;
 await Renderer.act(async()=>b.props.onPress());expect(api.getQcEquipmentInspection).toHaveBeenCalledWith('e1');expect(text(view.root)).toContain('Original checkpoint');expect(text(view.root)).toContain('Saved remark');expect(text(view.root)).toContain('Saved observation');expect(view.root.findAllByType('Photo' as any).some(n=>n.props.path==='/actual-photo.png')).toBe(true);
 (api.getQcEquipmentInspection as jest.Mock).mockResolvedValue({data:{inspectionId:'i1',qcReviewStatus:'Approved'}});await press('Approve');expect(api.approveQcInspection).toHaveBeenCalledWith('i1',undefined);
});

test('correction requests retain the existing comment and severity payload',async()=>{
 await Renderer.act(async()=>{view=Renderer.create(<Screen projectId="p1" onBack={jest.fn()}/>);});
 const b=view.root.findAllByType(TouchableOpacity).find(n=>text(n)==='Review inspection'&&!n.props.disabled)!;await Renderer.act(async()=>b.props.onPress());
 const input=view.root.findAllByType(require('react-native').TextInput).find(n=>n.props.placeholder==='Add QC comments')!;await Renderer.act(async()=>input.props.onChangeText('Please verify the saved measurement'));
 (api.getQcEquipmentInspection as jest.Mock).mockResolvedValue({data:{inspectionId:'i1',qcReviewStatus:'ChangesRequested'}});
 await press('Request changes');expect(api.requestQcChanges).toHaveBeenCalledWith('i1','Please verify the saved measurement','Medium');
});
