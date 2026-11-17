import React from 'react';
import Renderer from 'react-test-renderer';
import {Pressable,TextInput} from 'react-native';
import ReportWorkflowPanel from '../src/components/ReportWorkflowPanel';
import {changeReportStatus,getReportWorkflow,reopenReportRevision,ReportWorkflow} from '../src/api/reportWorkflow';
jest.mock('../src/api/reportWorkflow',()=>({changeReportStatus:jest.fn(),getReportWorkflow:jest.fn(),reopenReportRevision:jest.fn()}));
jest.mock('../src/components/SearchableOptionPicker',()=> 'StatusPicker');
jest.mock('../src/theme/useThemeMode',()=>({useThemeMode:()=> 'dark'}));
const base:ReportWorkflow={projectId:'p1',status:'Ongoing',revision:1,version:0,canEdit:true,canReopen:false,history:[],draftArtifact:{id:'draft-1',fileName:'Report.pdf',revision:2,generatedAt:'2026-11-11T00:00:00Z'}};
let view:Renderer.ReactTestRenderer;
const text=(n:Renderer.ReactTestInstance):string=>n.children.map(x=>typeof x==='string'?x:text(x)).join('');
async function press(label:string){await Renderer.act(async()=>(()=>{const button=view.root.findAll(n=>n.props.accessibilityRole==='button' && typeof n.props.onPress==='function').find(n=>text(n)===label);if(!button)throw new Error('Missing '+label+'; content: '+text(view.root));button.props.onPress();})());}
async function choose(value:string){await Renderer.act(async()=>view.root.findByType('StatusPicker' as any).props.onChange(value));}
beforeEach(()=>{jest.clearAllMocks();(getReportWorkflow as jest.Mock).mockResolvedValue({data:base});});
afterEach(async()=>{await Renderer.act(async()=>view?.unmount());});
test('Hold requires a reason, can be cancelled, and resumes with the saved version',async()=>{
  await Renderer.act(async()=>{view=Renderer.create(<ReportWorkflowPanel projectId="p1"/>);});
  expect(text(view.root)).toContain('Ongoing'); await choose('Hold');await press('Save Hold');
  expect(text(view.root)).toContain('Hold Reason is required');expect(changeReportStatus).not.toHaveBeenCalled();
  await press('Cancel');expect(changeReportStatus).not.toHaveBeenCalled();
  await choose('Hold');await Renderer.act(async()=>view.root.findByType(TextInput).props.onChangeText('Awaiting client drawings'));
  (changeReportStatus as jest.Mock).mockResolvedValue({data:{...base,status:'Hold',version:1,holdReason:'Awaiting client drawings'}});
  await press('Save Hold');expect(changeReportStatus).toHaveBeenCalledWith('p1',expect.objectContaining({status:'Hold',reason:'Awaiting client drawings',expectedVersion:0}));
  expect(text(view.root)).toContain('Hold Reason: Awaiting client drawings');
  (changeReportStatus as jest.Mock).mockResolvedValue({data:{...base,version:2}});await choose('Ongoing');
  expect(changeReportStatus).toHaveBeenLastCalledWith('p1',expect.objectContaining({status:'Ongoing',expectedVersion:1}));
});
test('Submitted requires final confirmation, reports prerequisite errors, and locks editing after success',async()=>{
  const saved=jest.fn();const busy=jest.fn();await Renderer.act(async()=>{view=Renderer.create(<ReportWorkflowPanel projectId="p1" onSaved={saved} onBusy={busy}/>);});
  await choose('Submitted');expect(changeReportStatus).not.toHaveBeenCalled();await press('Cancel');expect(changeReportStatus).not.toHaveBeenCalled();
  await choose('Submitted');(changeReportStatus as jest.Mock).mockRejectedValue({response:{status:400,data:{message:'QC approval is pending.'}}});
  await press('Confirm Submission');expect(text(view.root)).toContain('QC approval is pending.');
  (changeReportStatus as jest.Mock).mockResolvedValue({data:{...base,status:'Submitted',canEdit:false,version:1,submittedAt:'2026-11-11T10:00:00Z',submittedByName:'Inspector'}});
  await press('Confirm Submission');expect(changeReportStatus).toHaveBeenLastCalledWith('p1',expect.objectContaining({status:'Submitted',confirmSubmission:true,draftArtifactId:'draft-1',expectedVersion:0}));
  expect(view.root.findAllByType('StatusPicker' as any)).toHaveLength(0);expect(text(view.root)).toContain('Inspector');expect(text(view.root)).toContain('locked');expect(saved).toHaveBeenCalledTimes(1);expect(busy).toHaveBeenLastCalledWith(false);
});
test('Only server-authorized managers can reopen, and a revision reason is mandatory',async()=>{
  (getReportWorkflow as jest.Mock).mockResolvedValue({data:{...base,status:'Submitted',version:4,canEdit:false,canReopen:true}});
  await Renderer.act(async()=>{view=Renderer.create(<ReportWorkflowPanel projectId="p1"/>);});await press('Open New Report Revision');await press('Open Revision');
  expect(reopenReportRevision).not.toHaveBeenCalled();expect(text(view.root)).toContain('A revision reason is required');
  await Renderer.act(async()=>view.root.findByType(TextInput).props.onChangeText('Client requested a change'));
  (reopenReportRevision as jest.Mock).mockResolvedValue({data:{...base,revision:2,version:5}});await press('Open Revision');
  expect(reopenReportRevision).toHaveBeenCalledWith('p1',{expectedVersion:4,reason:'Client requested a change'});expect(text(view.root)).toContain('Revision 2');
});
test('Project Details displays status read-only and cannot change it',async()=>{
  (getReportWorkflow as jest.Mock).mockResolvedValue({data:{...base,status:'Hold',holdReason:'Awaiting access'}});
  await Renderer.act(async()=>{view=Renderer.create(<ReportWorkflowPanel projectId="p1" readOnly compact/>);});
  expect(text(view.root)).toContain('Hold');expect(text(view.root)).toContain('Awaiting access');expect(view.root.findAllByType('StatusPicker' as any)).toHaveLength(0);expect(view.root.findAll(n=>n.props.accessibilityRole==='button')).toHaveLength(0);
});
test('Switching projects discards a stale response instead of showing another project status',async()=>{
  let finish:(value:any)=>void=()=>undefined;(getReportWorkflow as jest.Mock).mockImplementation((id:string)=>id==='p1'?new Promise(resolve=>{finish=resolve;}):Promise.resolve({data:{...base,projectId:'p2',status:'Hold',holdReason:'Project two only'}}));
  await Renderer.act(async()=>{view=Renderer.create(<ReportWorkflowPanel projectId="p1"/>);});await Renderer.act(async()=>view.update(<ReportWorkflowPanel projectId="p2"/>));
  await Renderer.act(async()=>finish({data:{...base,status:'Submitted'}}));expect(text(view.root)).toContain('Project two only');expect(text(view.root)).not.toContain('This submitted PDF is locked');
});
