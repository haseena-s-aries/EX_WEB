import React from 'react';
import Renderer,{act} from 'react-test-renderer';
import {TextInput,TouchableOpacity} from 'react-native';
import {ClientReportsContent,ClientNotificationsContent} from '../src/components/ClientReportsAndNotifications';
import type {ClientProject} from '../src/api/clientDashboard';
import SearchableOptionPicker from '../src/components/SearchableOptionPicker';
const projects=[{projectId:'p1',projectName:'Ocean',jobNumber:'J1'},{projectId:'p2',projectName:'Harbour',jobNumber:'J2'}] as ClientProject[];
const reports=[{projectId:'p1',projectName:'Ocean',documentNumber:'DOC1',revision:'R2',reportStatus:'Ongoing',generatedDate:'2026-11-11T12:00:00Z'},
  {projectId:'p2',projectName:'Harbour',reportStatus:'Hold'}, {projectId:'foreign',projectName:'Private report'}];
const notices=[{id:'n1',projectId:'p1',title:'QC Approved',message:'Inspection approved',time:'2026-11-11T12:00:00Z'},
  {id:'n2',projectId:'p2',title:'Report Generated',message:'Report available',time:'2026-11-10T12:00:00Z'},
  {id:'n3',projectId:'foreign',title:'PRIVATE',message:'Do not display',time:'2026-11-10T12:00:00Z'}];
const text=(n:Renderer.ReactTestInstance):string=>n.children.map(c=>typeof c==='string'?c:text(c)).join('');
let ui:Renderer.ReactTestRenderer;
afterEach(async()=>{await act(async()=>ui?.unmount());});
const press=async(label:string)=>{await act(async()=>ui.root.findAllByType(TouchableOpacity).find(n=>n.props.accessibilityLabel===label)!.props.onPress());};
test('report search and filters preserve PDF and remark context without inventing generated dates',async()=>{
 const pdf=jest.fn(),remark=jest.fn();
 await act(async()=>{ui=Renderer.create(<ClientReportsContent reports={reports} projects={projects} pdfBusy="" onPdf={pdf} onRemark={remark} onRefresh={jest.fn()} refreshing={false}/>);});
 expect(text(ui.root)).not.toContain('Private report');expect(text(ui.root)).toContain('Not generated yet');
 await act(async()=>ui.root.findByType(TextInput).props.onChangeText('DOC1'));
 expect(text(ui.root)).not.toContain('Harbour');
 await press('View PDF');expect(pdf).toHaveBeenCalledWith('p1',false);
 await press('Download PDF');expect(pdf).toHaveBeenCalledWith('p1',true);
 await press('Add Report Remark');expect(remark).toHaveBeenCalledWith('p1');
 await act(async()=>ui.root.findAllByType(SearchableOptionPicker).find(n=>n.props.label==='Report status filter')!.props.onChange('Hold'));
 expect(text(ui.root)).toContain('No matching reports');
 await press('Clear Filters');expect(text(ui.root)).toContain('Harbour');
});
test('PDF controls are disabled while generating',async()=>{
 await act(async()=>{ui=Renderer.create(<ClientReportsContent reports={reports} projects={projects} pdfBusy="p1" onPdf={jest.fn()} onRemark={jest.fn()} onRefresh={jest.fn()} refreshing={false}/>);});
 const buttons=ui.root.findAllByType(TouchableOpacity).filter(n=>['Loading PDF…','View PDF','Download PDF'].includes(n.props.accessibilityLabel));
 expect(buttons.length).toBeGreaterThan(0);expect(buttons.every(n=>n.props.disabled)).toBe(true);
});
test('notification read controls, search and project filters keep the correct event and project',async()=>{
 const open=jest.fn(),mark=jest.fn(),all=jest.fn();
 function Page(){const [ids,setIds]=React.useState(new Set(['n2']));return <ClientNotificationsContent projects={projects} notices={notices} readIds={ids} onNotice={open} onMarkRead={id=>{mark(id);setIds(new Set([...ids,id]));}} onReadAll={()=>{all();setIds(new Set(['n1','n2']));}} onRefresh={jest.fn()} refreshing={false}/>;}
 await act(async()=>{ui=Renderer.create(<Page/>);});
 expect(text(ui.root)).not.toContain('PRIVATE');
 await press('Unread notifications');expect(text(ui.root)).toContain('Inspection approved');expect(text(ui.root)).not.toContain('Report available');
 await press('Open Project');expect(open).toHaveBeenCalledWith(notices[0]);
 await press('Mark as read');expect(mark).toHaveBeenCalledWith('n1');expect(text(ui.root)).toContain('No matching notifications');
 await press('Clear Filters');
 await act(async()=>ui.root.findByType(TextInput).props.onChangeText('Harbour'));
 expect(text(ui.root)).toContain('Report available');expect(text(ui.root)).not.toContain('Inspection approved');
});
