import React from 'react';
import Renderer from 'react-test-renderer';
import {Pressable, ScrollView, TextInput, TouchableOpacity} from 'react-native';
import SurveyorAreaDetailsScreen from '../src/screens/SurveyorAreaDetailsScreen';
import {createSurveyorEquipment, getSurveyorArea, getSurveyorEquipment, getProjectAreaPhotos} from '../src/api/projects';

jest.mock('../src/api/projects', () => ({getCommonLayouts: jest.fn().mockResolvedValue({data: []}),createSurveyorEquipment: jest.fn(), getSurveyorArea: jest.fn(), getSurveyorEquipment: jest.fn(), getSurveyorEquipmentPhotos: jest.fn().mockResolvedValue({data: []}), getProjectAreaPhotos: jest.fn()}));
jest.mock('../src/components/AuthenticatedImage', () => 'AuthenticatedImage');
jest.mock('../src/components/InspectionPhotoPicker', () => 'InspectionPhotoPicker');
jest.mock('../src/components/ZoomableImageViewer', () => 'LayoutViewer');
const textOf = (node: Renderer.ReactTestInstance): string => node.children.map(child => typeof child === 'string' ? child : textOf(child)).join('');
test('View Layout reuses zoom viewer with original path and equipment pins', async () => {
  const equipment = {id: 'equipment-1', sequenceNo: 1, tagNumber: 'MOTOR-1', type: 'Motor', xPercent: 25, yPercent: 50, status: 'PendingReview'};
  (getSurveyorArea as jest.Mock).mockResolvedValue({data: {areaId: 'area', areaName: 'Deck', layoutImagePath: '/api/projects/p/areas/a/photos/image', equipment: [equipment]}});
  (getSurveyorEquipment as jest.Mock).mockResolvedValue({data: [equipment]});
  (getProjectAreaPhotos as jest.Mock).mockResolvedValue({data: []});
  let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {renderer = Renderer.create(<SurveyorAreaDetailsScreen projectId="project" areaId="area" onBack={jest.fn()} onEquipmentPress={jest.fn()} />);});
  expect(textOf(renderer.root)).toContain('Deck');
  const pin = renderer.root.find(node => node.props.accessibilityLabel === 'Equipment 1: MOTOR-1');
  expect(pin).toBeDefined();
  expect(pin.props.style).toEqual(expect.arrayContaining([expect.objectContaining({left: '25%', top: '50%'})]));
  await Renderer.act(async () => {renderer.root.findAllByType(TouchableOpacity).find(node => textOf(node) === 'View Layout')!.props.onPress();});
  const viewer = renderer.root.findByType('LayoutViewer' as any);
  expect(viewer.props.images).toEqual(['/api/projects/p/areas/a/photos/image']);
  expect(viewer.props.pins).toEqual([expect.objectContaining({id: 'equipment-1', label: '1', xPercent: 25, yPercent: 50})]);
  await Renderer.act(async () => {viewer.props.onClose(); pin.props.onPress();});
  expect(renderer.root.findAllByType('LayoutViewer' as any)).toHaveLength(0);
  expect(renderer.root.findAll(node => node.props.accessibilityLabel === 'Equipment 1: MOTOR-1').length).toBeGreaterThan(0);
  await Renderer.act(async () => {renderer.unmount();});
});

test('multiple area images require a deliberate selection and show only their own saved markers', async () => {
  const sectionA = {id:'image-a',fileName:'Engine Room Section A',filePath:'/stored/a.jpg',downloadUrl:'/api/projects/p/areas/a/photos/image-a',uploadedAt:'2026-11-10T10:00:00Z'};
  const sectionB = {id:'image-b',fileName:'Engine Room Section B',filePath:'/stored/b.jpg',downloadUrl:'/api/projects/p/areas/a/photos/image-b',uploadedAt:'2026-11-11T10:00:00Z'};
  (getSurveyorArea as jest.Mock).mockResolvedValue({data:{areaId:'area',areaName:'Engine Room',layoutImagePath:sectionA.filePath}});
  (getSurveyorEquipment as jest.Mock).mockResolvedValue({data:[
    {id:'pin-a',sequenceNo:1,tagNumber:'A',type:'Motor',xPercent:10,yPercent:20,status:'NotStarted',isPlacedOnLayout:true,layoutImageKey:'area:image-a'},
    {id:'pin-b',sequenceNo:2,tagNumber:'B',type:'Pump',xPercent:70,yPercent:80,status:'NotStarted',isPlacedOnLayout:true,layoutImageKey:'area:image-b'},
  ]});
  (getProjectAreaPhotos as jest.Mock).mockResolvedValue({data:[sectionA,sectionB]});
  let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async()=>{renderer=Renderer.create(<SurveyorAreaDetailsScreen projectId="project" areaId="area" onBack={jest.fn()} onEquipmentPress={jest.fn()}/>);});
  const layoutPins = (label:string,left:string) => renderer.root.findAll(node=>node.props.accessibilityLabel===label&&Array.isArray(node.props.style)&&node.props.style.some((style:any)=>style?.left===left));
  expect(layoutPins('Equipment 1: A','10%')).toHaveLength(0);
  expect(layoutPins('Equipment 2: B','70%')).toHaveLength(0);
  await Renderer.act(async()=>{renderer.root.findAllByType(TouchableOpacity).filter(node=>textOf(node)==='Select for Marking')[1].props.onPress();});
  expect(layoutPins('Equipment 1: A','10%')).toHaveLength(0);
  expect(layoutPins('Equipment 2: B','70%').length).toBeGreaterThan(0);
  (createSurveyorEquipment as jest.Mock).mockResolvedValue({data:{id:'pin-c',sequenceNo:3}});
  await Renderer.act(async()=>{renderer.root.findAllByType(TouchableOpacity).find(node=>textOf(node)==='+ Add Equipment')!.props.onPress();});
  const canvas=renderer.root.find(node=>typeof node.props.onLayout==='function'&&Array.isArray(node.props.style)&&node.props.style.some((style:any)=>style?.aspectRatio));
  await Renderer.act(async()=>{canvas.props.onLayout({nativeEvent:{layout:{width:200,height:100}}});});
  await Renderer.act(async()=>{canvas.props.onPress({nativeEvent:{locationX:50,locationY:25}});});
  await Renderer.act(async()=>{renderer.root.findAllByType(TextInput).find(node=>node.props.placeholder==='Enter value')!.props.onChangeText('C');});
  await Renderer.act(async()=>{renderer.root.findAllByType(TouchableOpacity).find(node=>textOf(node)==='Select equipment type ▾')!.props.onPress();});
  await Renderer.act(async()=>{renderer.root.findAllByType(TouchableOpacity).find(node=>textOf(node)==='Motor')!.props.onPress();});
  await Renderer.act(async()=>{renderer.root.findAllByType(TouchableOpacity).find(node=>textOf(node)==='Add Equipment')!.props.onPress();});
  expect(createSurveyorEquipment).toHaveBeenCalledWith('project','area',expect.objectContaining({tagNumber:'C',layoutImageKey:'area:image-b',xPercent:25,yPercent:25}));
  await Renderer.act(async()=>renderer.unmount());
});

test('Save & start inspection registers equipment then opens its activity workflow', async () => {
  (getSurveyorArea as jest.Mock).mockResolvedValue({data: {areaId: 'area', areaName: 'Deck'}});
  (getSurveyorEquipment as jest.Mock).mockResolvedValue({data: []});
  (getProjectAreaPhotos as jest.Mock).mockResolvedValue({data: []});
  (createSurveyorEquipment as jest.Mock).mockResolvedValue({data: {id: 'new-equipment', sequenceNo: 1}});
  const onStartInspection = jest.fn();
  let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {renderer = Renderer.create(<SurveyorAreaDetailsScreen projectId="project" areaId="area" onBack={jest.fn()} onEquipmentPress={jest.fn()} onStartInspection={onStartInspection} />);});
  const addButton = renderer.root.findAllByType(TouchableOpacity).find(node => textOf(node).includes('+ Register Equipment'))!;
  await Renderer.act(async () => {addButton.props.onPress();});
  expect(renderer.root.findAllByType(ScrollView).some(node => node.props.nativeID === 'ex-area-equipment-form')).toBe(true);
  expect(renderer.root.findAllByType(ScrollView).some(node => node.props.nativeID === 'ex-surveyor-area')).toBe(false);
  const tagField = renderer.root.findAllByType(TextInput).find(node => node.props.placeholder === 'Enter value')!;
  await Renderer.act(async () => {tagField.props.onChangeText('MOTOR-NEW');});
  const typeSelect = renderer.root.findAllByType(TouchableOpacity).find(node => textOf(node).includes('Select equipment type'))!;
  await Renderer.act(async () => {typeSelect.props.onPress();});
  const motor = renderer.root.findAllByType(TouchableOpacity).find(node => textOf(node) === 'Motor')!;
  await Renderer.act(async () => {motor.props.onPress();});
  const saveStart = renderer.root.findAllByType(TouchableOpacity).find(node => textOf(node).includes('Save & start inspection'))!;
  await Renderer.act(async () => {await saveStart.props.onPress();});
  expect(createSurveyorEquipment).toHaveBeenCalledWith('project', 'area', expect.objectContaining({tagNumber: 'MOTOR-NEW', type: 'Motor'}));
  expect(onStartInspection).toHaveBeenCalledWith('new-equipment');
  await Renderer.act(async () => {renderer.unmount();});
});

test('equipment form uses renamed labels and previews selected evidence before saving',async()=>{
 (getSurveyorArea as jest.Mock).mockResolvedValue({data:{areaId:'area',areaName:'Deck'}});(getSurveyorEquipment as jest.Mock).mockResolvedValue({data:[]});(getProjectAreaPhotos as jest.Mock).mockResolvedValue({data:[]});
 let ui!:Renderer.ReactTestRenderer;await Renderer.act(async()=>{ui=Renderer.create(<SurveyorAreaDetailsScreen projectId="project" areaId="area" onBack={jest.fn()} onEquipmentPress={jest.fn()}/>);});
 await Renderer.act(async()=>{ui.root.findAllByType(TouchableOpacity).find(n=>textOf(n).includes('+ Register Equipment'))!.props.onPress();});
 expect(textOf(ui.root)).toContain('Item Tag');expect(textOf(ui.root)).toContain('Equipment ID / Ex-Tag');expect(textOf(ui.root)).toContain('Location / Area');expect(textOf(ui.root)).toContain('Zone / Division');expect(textOf(ui.root)).not.toContain('Protection Details');expect(textOf(ui.root)).toContain('Assigned automatically when saved');
 await Renderer.act(async()=>{ui.root.findByType('InspectionPhotoPicker' as any).props.onSelected([{uri:'file:///equipment.png',fileName:'equipment.png',type:'image/png'}]);});
 await Renderer.act(async()=>{ui.root.findAllByType(TouchableOpacity).find(n=>textOf(n)==='View Photo')!.props.onPress();});
 expect(ui.root.findByType('LayoutViewer' as any).props.images).toEqual(['file:///equipment.png']);
 await Renderer.act(async()=>{ui.root.findByType('LayoutViewer' as any).props.onClose();ui.root.findAllByType(TouchableOpacity).find(n=>textOf(n)==='Remove Selected Photo')!.props.onPress();});expect(textOf(ui.root)).not.toContain('equipment.png');await Renderer.act(async()=>ui.unmount());
});
