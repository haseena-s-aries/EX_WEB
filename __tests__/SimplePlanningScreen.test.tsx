import React from 'react';
import Renderer from 'react-test-renderer';
import Planning from '../src/screens/InspectionPlanningScreen';
import {getPlanningProjects} from '../src/api/inspectionPlanning';
jest.mock('../src/api/client',()=>({__esModule:true,default:{get:jest.fn(),post:jest.fn()}}));
jest.mock('../src/api/inspectionPlanning',()=>({getPlanningProjects:jest.fn(),getCampaigns:jest.fn(),reassignInspectionTask:jest.fn()}));
jest.mock('../src/screens/AdvancedInspectionPlanningScreen',()=> 'AdvancedPlanning');
jest.mock('../src/components/ProjectWorkSchedulePanel',()=> 'WorkSchedule');
jest.mock('../src/components/AuthenticatedImage',()=> 'AuthenticatedImage');
jest.mock('../src/theme/useThemeMode',()=>({useThemeMode:()=> 'dark'}));
for(const [role,title] of [['Admin','Inspection Planning & Monitoring'],['Manager','Inspection Planning & Monitoring'],['Surveyor','My Inspection Plan']]) test(role+' sees the appropriate planning entry point',async()=>{
 (getPlanningProjects as jest.Mock).mockResolvedValue({data:[]});let view!:Renderer.ReactTestRenderer;
 await Renderer.act(async()=>{view=Renderer.create(<Planning role={role}/>);});
 expect(JSON.stringify(view.toJSON())).toContain(title);await Renderer.act(async()=>view.unmount());
});
