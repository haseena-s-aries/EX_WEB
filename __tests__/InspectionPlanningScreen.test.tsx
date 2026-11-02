import React from 'react';
import Renderer from 'react-test-renderer';
import {TouchableOpacity} from 'react-native';
import InspectionPlanningScreen from '../src/screens/InspectionPlanningScreen';
import * as planningApi from '../src/api/inspectionPlanning';

jest.mock('../src/api/inspectionPlanning', () => ({
  getCampaigns: jest.fn().mockResolvedValue({data: []}), getPlanningProjects: jest.fn().mockResolvedValue({data: [{id:'p1',projectName:'Project One',clientName:'Client One',vesselOrSiteName:'Site One'}]}),
  getPlanningInspectors: jest.fn().mockResolvedValue({data: [{id:'s1',displayName:'Surveyor One',role:'Surveyor'}]}),
  createCampaign: jest.fn().mockResolvedValue({data:{}}), getCampaignAllocation: jest.fn().mockResolvedValue({data:{annual:[]}}), getCampaignProgress: jest.fn().mockResolvedValue({data:{}}), getWorkPackages: jest.fn().mockResolvedValue({data:[]}), getSamplingHistory: jest.fn().mockResolvedValue({data:[]}),
  editCampaign: jest.fn().mockResolvedValue({}), configureAllocation: jest.fn().mockResolvedValue({}), saveAnnualList: jest.fn().mockResolvedValue({}), approveAllocation: jest.fn().mockResolvedValue({}), previewSampling: jest.fn().mockResolvedValue({data:{id:'sample1',method:'Random',ruleVersion:1,equipmentIds:['e1','e2']}}), approveSampling: jest.fn().mockResolvedValue({}), createWorkPackage: jest.fn().mockResolvedValue({}), getRecurrences: jest.fn().mockResolvedValue({data:[]}),
}));
const textOf=(node:Renderer.ReactTestInstance):string=>node.children.map(child=>typeof child==='string'?child:textOf(child)).join(' ');
const press=(root:Renderer.ReactTestInstance,label:string)=>root.findAllByProps({accessibilityRole:'button'}).find(x=>textOf(x).includes(label))!.props.onPress();

test('Manager creates a campaign attached to an existing project and client/site record',async()=>{
  let renderer!:Renderer.ReactTestRenderer;
  await Renderer.act(async()=>{renderer=Renderer.create(<InspectionPlanningScreen role="Manager"/>);});
  await Renderer.act(async()=>press(renderer.root,'Project One'));
  const inputs=renderer.root.findAllByType(require('react-native').TextInput);
  await Renderer.act(async()=>{
    inputs.find(x=>x.props.accessibilityLabel==='Campaign name')!.props.onChangeText('Annual Campaign');
    inputs.find(x=>x.props.accessibilityLabel==='Campaign reference')!.props.onChangeText('C-2026');
  });
  await Renderer.act(async()=>press(renderer.root,'Create campaign'));
  expect(planningApi.createCampaign).toHaveBeenCalledWith(expect.objectContaining({projectId:'p1',name:'Annual Campaign',reference:'C-2026'}));
  await Renderer.act(async()=>renderer.unmount());
});

test('Surveyor planning view does not expose campaign creation controls',async()=>{
  let renderer!:Renderer.ReactTestRenderer;
  await Renderer.act(async()=>{renderer=Renderer.create(<InspectionPlanningScreen role="Surveyor"/>);});
  expect(textOf(renderer.root)).not.toContain('Create campaign');
  await Renderer.act(async()=>renderer.unmount());
});

test('Manager can see named inspector workload and planned task agenda',async()=>{
  (planningApi.getCampaigns as jest.Mock).mockResolvedValue({data:[{id:'c1',projectId:'p1',name:'Campaign A',reference:'CA-1',startsOn:'2026-01-01',endsOn:'2026-12-31',status:'InProgress'}]});
  (planningApi.getCampaignAllocation as jest.Mock).mockResolvedValue({data:{annual:[]}});
  (planningApi.getCampaignProgress as jest.Mock).mockResolvedValue({data:{}});
  (planningApi.getWorkPackages as jest.Mock).mockResolvedValue({data:[{id:'wp1',reference:'WP-1',site:'North Deck',area:'A1',tasks:[
    {id:'t1',assignedUserId:'s1',scheduledAt:'2026-02-01T08:00:00Z',dueAt:'2026-02-02T08:00:00Z',statusCode:'Planned',areaEquipmentId:'e1',plannedGrade:'Close',routeOrder:1},
    {id:'t2',assignedUserId:null,dueAt:'2027-02-02T08:00:00Z',statusCode:'Planned',areaEquipmentId:'e2',plannedGrade:'Visual',routeOrder:2},
  ]}]});
  let renderer!:Renderer.ReactTestRenderer;
  await Renderer.act(async()=>{renderer=Renderer.create(<InspectionPlanningScreen role="Manager"/>); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();});
  expect(textOf(renderer.root)).toContain('Campaign A');
  const campaign=renderer.root.findAllByType(TouchableOpacity).find(x=>textOf(x).includes('Campaign A'));
  if(!campaign) throw new Error('Campaign A selection button was not rendered');
  await Renderer.act(async()=>{campaign.props.onPress(); await Promise.resolve(); await Promise.resolve();});
  expect(textOf(renderer.root)).toContain('Inspector workload & schedule');
  expect(textOf(renderer.root)).toContain('Surveyor One');
  expect(textOf(renderer.root)).toContain('overdue');
  expect(textOf(renderer.root)).toContain('Unassigned');
  expect(textOf(renderer.root)).toContain('WP-1');
  expect(textOf(renderer.root)).toContain('e1');
  await Renderer.act(async()=>renderer.unmount());
});
