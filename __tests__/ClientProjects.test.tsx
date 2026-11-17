import React from 'react';
import Renderer, {act} from 'react-test-renderer';
import {TextInput, TouchableOpacity} from 'react-native';
import {ClientProjectsContent, ClientProjectsLayout} from '../src/components/ClientProjects';
import SearchableOptionPicker from '../src/components/SearchableOptionPicker';
import type {ClientProject} from '../src/api/clientDashboard';

const progress = {totalAreas:2,areasCompleted:1,totalEquipment:4,equipmentInspected:4,totalSubmitted:5,awaitingQc:2,inReview:1,changesRequested:1,qcApproved:1,openDefects:3,closedDefects:6,surveyProgress:100};
const projects:ClientProject[] = [
  {projectId:'p1',projectName:'Ocean Project',sector:'',jobNumber:'JOB-ONE',location:'Dubai',vesselOrSiteName:'Ocean Vessel',projectStatus:'InProgress',surveyorName:'Sam',assignedQcName:'Quinn',qcStatus:'PendingReview',progress},
  {projectId:'p2',projectName:'Harbour Project',sector:'',jobNumber:'JOB-TWO',location:'Abu Dhabi',vesselOrSiteName:'Harbour',projectStatus:'Completed',surveyorName:'Alex',assignedQcName:'Quinn',qcStatus:'QcApproved',progress:{...progress,totalAreas:0,areasCompleted:0,totalEquipment:0,equipmentInspected:0,totalSubmitted:0,qcApproved:0,surveyProgress:0}},
];
const text = (node:Renderer.ReactTestInstance):string => node.children.map(c => typeof c === 'string' ? c : text(c)).join('');
let ui:Renderer.ReactTestRenderer;
afterEach(async () => {await act(async () => ui?.unmount());});
const press = async (name:string) => {await act(async () => {ui.root.findAllByType(TouchableOpacity).find(n => n.props.accessibilityLabel === name)!.props.onPress();});};

test('project search, status filtering and clear persist through view changes and use correct navigation ID', async () => {
  const open = jest.fn(), refresh = jest.fn();
  function Page() {const [query,setQuery] = React.useState(''); return <ClientProjectsContent projects={projects} query={query} onQuery={setQuery} onProject={open} onRefresh={refresh} refreshing={false} />;}
  await act(async () => {ui = Renderer.create(<Page />);});
  expect(text(ui.root)).toContain('My Projects (2)');
  await act(async () => {ui.root.findByType(TextInput).props.onChangeText('job-two');});
  expect(ui.root.findAll(n => n.props.testID === 'client-project-p1')).toHaveLength(0);
  await press('List view'); expect(ui.root.findByType(TextInput).props.value).toBe('job-two');
  await press('View Project →'); expect(open).toHaveBeenCalledWith('p2');
  await act(async () => {ui.root.findByType(SearchableOptionPicker).props.onChange('InProgress');});
  expect(text(ui.root)).toContain('No matching projects');
  await press('Grid view'); expect(ui.root.findByType(SearchableOptionPicker).props.value).toBe('InProgress');
  await press('✕ Clear Filters'); expect(new Set(ui.root.findAll(n => /^client-project-/.test(n.props.testID || '')).map(n => n.props.testID)).size).toBe(2);
  await press('↻ Refresh'); expect(refresh).toHaveBeenCalledTimes(1);
});

test('survey progress stays separate from QC with existing denominators and safe zero totals', async () => {
  await act(async () => {ui = Renderer.create(<ClientProjectsContent projects={projects} query="" onQuery={jest.fn()} onProject={jest.fn()} onRefresh={jest.fn()} refreshing={false} />);});
  const bars = ui.root.findAll(n => n.props.accessibilityRole === 'progressbar');
  expect(bars.find(n => n.props.accessibilityLabel === 'Ocean Project: Areas Completed')!.props.accessibilityValue.now).toBe(50);
  expect(bars.find(n => n.props.accessibilityLabel === 'Ocean Project: QC Approved')!.props.accessibilityValue.now).toBe(20);
  expect(bars.filter(n => n.props.accessibilityLabel === 'Overall survey progress')[0].props.accessibilityValue.now).toBe(100);
  expect(bars.find(n => n.props.accessibilityLabel === 'Harbour Project: QC Approved')!.props.accessibilityValue.now).toBe(0);
  expect(text(ui.root)).not.toMatch(/NaN|Infinity/);
  expect(text(ui.root.findByProps({testID:'client-project-p1'}))).toContain('Closed Defects6');
});

test('honest unassigned, loading and recoverable error states', async () => {
  await act(async () => {ui = Renderer.create(<ClientProjectsContent projects={[]} query="" onQuery={jest.fn()} onProject={jest.fn()} onRefresh={jest.fn()} refreshing={false} />);});
  expect(text(ui.root)).toContain('No projects assigned');
  await act(async () => {ui.update(<ClientProjectsLayout title="Projects" heading="Projects" loading error="" onRefresh={jest.fn()}>hidden</ClientProjectsLayout>);});
  expect(text(ui.root)).toContain('Loading your assigned projects'); expect(text(ui.root)).not.toContain('hidden');
  const retry = jest.fn();
  await act(async () => {ui.update(<ClientProjectsLayout title="Projects" heading="Projects" loading={false} error="Connection unavailable" onRefresh={retry}>hidden</ClientProjectsLayout>);});
  expect(text(ui.root)).toContain('Connection unavailable'); await press('Try again'); expect(retry).toHaveBeenCalled();
});
