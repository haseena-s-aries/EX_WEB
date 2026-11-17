jest.mock('../src/components/ReportWorkflowPanel', () => 'ReportWorkflowPanel');
import React from 'react';
import Renderer from 'react-test-renderer';
import {getProject, getQcProject} from '../src/api/projects';
import ProjectDetailsScreen from '../src/screens/ProjectDetailsScreen';

jest.mock('../src/api/projects', () => ({getProject: jest.fn(), getQcProject: jest.fn()}));
jest.mock('../src/components/ProjectWorkSchedulePanel', () => 'ProjectWorkSchedulePanel');
jest.mock('../src/components/ProjectDetailModal', () => 'ProjectDetailModal');
jest.mock('../src/components/ProjectImageGallery', () => 'ProjectImageGallery');
jest.mock('../src/components/OurCompanySection', () => 'OurCompanySection');
jest.mock('../src/components/ClientDetailsSection', () => 'ClientDetailsSection');
jest.mock('../src/components/DeleteProjectButton', () => 'DeleteProjectButton');
jest.mock('../src/components/ZoomableImageViewer', () => 'ZoomableImageViewer');
jest.mock('../src/components/HazardousAreaPlanSection', () => 'HazardousAreaPlanSection');
jest.mock('../src/components/AuthenticatedImage', () => 'AuthenticatedImage');

test('the dedicated Edit Project route shows the loaded project form', async () => {
  const project = {id: 'project-1', projectName: 'MV Resolute'};
  (getProject as jest.Mock).mockResolvedValue({data: project});
  let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {
    renderer = Renderer.create(<ProjectDetailsScreen editOnly projectId={project.id}
      onBack={jest.fn()} surveyors={[]} qcUsers={[]} clients={[]} />);
  });
  expect(renderer.root.findByType('ProjectDetailModal' as any).props).toMatchObject({
    fullPage: true, visible: true, project,
  });
  await Renderer.act(async () => renderer.unmount());
});

test('QC project details use scoped team names, retain progress and review navigation, and cannot enter the edit form', async () => {
  (getProject as jest.Mock).mockResolvedValue({data:{id:'assigned',projectName:'Assigned Vessel',status:'InProgress',assignedQcId:'qc',assignedSurveyorId:'s',areas:[{id:'area',areaName:'Deck',equipment:[{id:'e',tagNumber:'M-1',inspectionStatus:'Completed'}]}]}});
  (getQcProject as jest.Mock).mockResolvedValue({data:{assignedSurveyor:'Inspector One',assignedQc:'Reviewer One'}});
  const review=jest.fn();
  let renderer!:Renderer.ReactTestRenderer;
  await Renderer.act(async () => {renderer=Renderer.create(<ProjectDetailsScreen userRole="Qc" editOnly projectId="assigned" onBack={jest.fn()} onQcReview={review} surveyors={[]} qcUsers={[]} clients={[]}/>);});
  const text=(node:Renderer.ReactTestInstance):string=>node.children.map(c=>typeof c==='string'?c:text(c)).join('');
  expect(text(renderer.root)).toContain('Inspector One');
  expect(text(renderer.root)).toContain('Reviewer One');
  expect(text(renderer.root)).toContain('1 / 1 equipment inspected · 100%');
  expect(renderer.root.findAllByType('ProjectDetailModal' as any)).toHaveLength(0);
  expect(text(renderer.root)).not.toContain('Edit project');
  expect(renderer.root.findByType('ProjectImageGallery' as any).props.editable).toBe(false);
  await Renderer.act(async () => {renderer.root.findAll(n=>typeof n.props.onPress==='function').find(n=>text(n)==='QC Inspection Review')!.props.onPress();});
  expect(review).toHaveBeenCalled();
  await Renderer.act(async()=>renderer.unmount());
});
