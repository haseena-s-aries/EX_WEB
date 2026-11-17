import React from 'react';
import Renderer,{act} from 'react-test-renderer';
import {TextInput,TouchableOpacity} from 'react-native';
import ClientDefects from '../src/components/ClientDefects';
import {clientDefectRows} from '../src/components/clientDefectRows';
import type {ClientProject} from '../src/api/clientDashboard';
import SearchableOptionPicker from '../src/components/SearchableOptionPicker';
import Sidebar from '../src/components/Sidebar';
jest.mock('../src/components/AuthenticatedImage',()=> 'AuthenticatedImage');
jest.mock('../src/components/HazardousAreaPlanViewer',()=> 'HazardousAreaPlanViewer');
const projects=[{projectId:'p1',projectName:'Ocean',jobNumber:'JOB1'},{projectId:'p2',projectName:'Harbour',jobNumber:'JOB2'}] as ClientProject[];
const legacy=[{id:'f1',projectId:'p1',equipmentCode:'ITEM1',tagNumber:'TAG1',areaName:'Deck',faultCategory:'B',faultCode:'FC1',observation:'Saved manual defect',status:'Open',remarks:'First note',additionalRemarks:'Second note',beforePhotos:[{id:'ph1',url:'/auth/one',fileName:'one.png'},{id:'ph2',url:'/auth/two',fileName:'two.png'}]},
  {id:'f2',projectId:'p2',areaName:'Engine',status:'Closed',observation:'Closed record'}];
const activity=[{id:'a1',projectId:'p1',areaName:'Deck',statusCode:'Open',actionStatus:'Verified',observation:'Awaiting client closure',dueAt:'2020-01-01'},
  {id:'a2',projectId:'foreign',observation:'PRIVATE',actionStatus:'InProgress'}];
const text=(n:Renderer.ReactTestInstance):string=>n.children.map(c=>typeof c==='string'?c:text(c)).join('');
let ui:Renderer.ReactTestRenderer;
afterEach(async()=>{await act(async()=>ui?.unmount());});
const press=async(label:string)=>{await act(async()=>ui.root.findAllByType(TouchableOpacity).find(n=>n.props.accessibilityLabel===label)!.props.onPress());};
function Page({error=''}:{error?:string}) {return <ClientDefects projects={projects} legacy={legacy} activities={activity} activityError={error} onRefresh={jest.fn()} refreshing={false} renderLegacy={()=>null} renderActivity={()=>null}/>;}
test('normalizes actual records without foreign leakage, duplicates, or premature client closure',()=>{
 const rows=clientDefectRows(projects,[...legacy,legacy[0]],activity);
 expect(rows).toHaveLength(3);expect(rows.some(r=>r.observation==='PRIVATE')).toBe(false);
 expect(rows.find(r=>r.id==='a1')).toMatchObject({closed:false,inProgress:true,overdue:true});
 expect(rows.find(r=>r.id==='f2')!.closed).toBe(true);
 expect(rows.find(r=>r.id==='f1')!.category).toBe('B');
});
test('combines project, category, search and overdue filters and distinguishes no matches',async()=>{
 await act(async()=>{ui=Renderer.create(<Page/>);});
 expect(text(ui.root)).toContain('Defect Records (3)');
 await act(async()=>ui.root.findAllByType(SearchableOptionPicker).find(n=>n.props.label==='Defect project')!.props.onChange('p1'));
 expect(text(ui.root)).toContain('Defect Records (2)');
 await act(async()=>ui.root.findAllByType(SearchableOptionPicker).find(n=>n.props.label==='Fault Categories')!.props.onChange('B'));
 expect(text(ui.root)).toContain('Defect Records (1)');
 await press('Overdue Only');expect(text(ui.root)).toContain('No matching defects');
 await press('Clear Filters');expect(text(ui.root)).toContain('Defect Records (2)');
 await act(async()=>ui.root.findByType(TextInput).props.onChangeText('FC1'));
 expect(text(ui.root)).toContain('Defect Records (1)');
 await press('View Defect');expect(text(ui.root)).toContain('First note');expect(text(ui.root)).toContain('Second note');
 expect(ui.root.findAllByType('AuthenticatedImage' as any)).toHaveLength(2);
});
test('failed inspection source reports incomplete data instead of an empty register',async()=>{
 await act(async()=>{ui=Renderer.create(<ClientDefects projects={projects} legacy={[]} activities={[]} activityError="Unable to load inspection-linked defects" onRefresh={jest.fn()} refreshing={false} renderLegacy={()=>null} renderActivity={()=>null}/>);});
 expect(text(ui.root)).toContain('Unable to load all defects');expect(text(ui.root)).not.toContain('No defects recorded');
});
test('Client desktop sidebar no longer offers Inspection Progress',async()=>{
 await act(async()=>{ui=Renderer.create(<Sidebar active="Defects" userRole="Client" onSettings={jest.fn()} onNavigate={jest.fn()} onLogout={jest.fn()}/>);});
 expect(ui.root.findAllByType(TouchableOpacity).some(n=>n.props.accessibilityLabel==='Inspection Progress')).toBe(false);
 expect(ui.root.findAllByType(TouchableOpacity).some(n=>n.props.accessibilityLabel==='Defects')).toBe(true);
});
