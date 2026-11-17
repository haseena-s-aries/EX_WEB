import React from 'react';
import Renderer, {act} from 'react-test-renderer';
import {Pressable, TextInput} from 'react-native';
import EquipmentCategoryChecklistScreen from '../src/screens/EquipmentCategoryChecklistScreen';
import DefectRegisterScreen from '../src/screens/DefectRegisterScreen';
import apiClient from '../src/api/client';
import {getEquipmentRegistrationProjects} from '../src/api/equipmentIdentification';
import {getHaerRegister} from '../src/api/reports';
import {getChecklistCatalog} from '../src/api/equipmentChecklistCatalog';
import {getDefects, getRegisterProjects, getRegisterEquipment} from '../src/api/defects';
import {getInspectionDefects} from '../src/api/projects';

jest.mock('../src/api/client', () => ({__esModule:true, default:{get:jest.fn(),put:jest.fn(),post:jest.fn()}}));
jest.mock('../src/api/equipmentIdentification', () => ({getEquipmentRegistrationProjects:jest.fn()}));
jest.mock('../src/api/reports', () => ({getHaerRegister:jest.fn()}));
jest.mock('../src/api/equipmentChecklistCatalog', () => ({allCheckpoints:'All Checkpoints',getChecklistCatalog:jest.fn()}));
jest.mock('../src/api/defects', () => ({getDefects:jest.fn(),getRegisterProjects:jest.fn(),getRegisterEquipment:jest.fn()}));
jest.mock('../src/api/projects', () => ({getInspectionDefects:jest.fn()}));
jest.mock('../src/components/HaerGrid', () => 'HaerGrid');
jest.mock('../src/components/AuthenticatedImage', () => 'AuthenticatedImage');
jest.mock('../src/components/ChecklistCatalogEditor', () => 'ChecklistCatalogEditor');
jest.mock('../src/components/InspectionPhotoPicker', () => 'InspectionPhotoPicker');
const text = (node:Renderer.ReactTestInstance):string => node.children.map(c => typeof c==='string'?c:text(c)).join('');
let ui:Renderer.ReactTestRenderer;
afterEach(async () => {await act(async () => ui?.unmount());});
const press = async (label:string) => {await act(async () => {
  const buttons=ui.root.findAll(n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function');
  const target=buttons.find(n => n.props.accessibilityLabel===label || text(n)===label || text(n)===label+' ✓');
  if (!target) throw new Error(`Missing ${label}; available: ${buttons.map(n=>text(n)).join(' | ')}`);
  target.props.onPress();
});};

test('QC can filter every checklist section without changing saved selections or posting updates', async () => {
  jest.clearAllMocks();
  (getEquipmentRegistrationProjects as jest.Mock).mockResolvedValue({data:[{id:'p',projectName:'Assigned',clientName:'Company'}]});
  (getHaerRegister as jest.Mock).mockResolvedValue({data:{equipment:[{equipmentRecordId:'e',equipmentName:'Motor'}]}});
  (getChecklistCatalog as jest.Mock).mockResolvedValue({data:{categories:[{id:'d',name:"Ex 'd' only"},{id:'custom',name:'Custom Ex category'}]}});
  (apiClient.get as jest.Mock).mockResolvedValue({data:{version:2,selectedCodes:['A1'],points:[
    {code:'A1',section:'Apparatus',itemNumber:1,text:'Saved apparatus point',protectionApplicability:'d'},
    {code:'B1',section:'Installation',itemNumber:1,text:'Installation point',protectionApplicability:'custom'},
    {code:'C1',section:'Environment',itemNumber:1,text:'Environment point',protectionApplicability:'custom'},
  ]}});
  await act(async () => {ui=Renderer.create(<EquipmentCategoryChecklistScreen readOnly/>);});
  await press('Select Project'); await press('Assigned'); await press('Select Equipment'); await press('Motor');
  expect(ui.root.findAllByType('HaerGrid' as any)).toHaveLength(3);
  expect(ui.root.findAllByType('HaerGrid' as any)[0].props.rows[0]).toMatchObject({selected:true,onPress:undefined});
  await press('Select Checkpoint Category'); await press('Custom Ex category');
  expect(ui.root.findAllByType('HaerGrid' as any)).toHaveLength(2);
  expect(text(ui.root)).toContain('1 selected');
  expect(text(ui.root)).not.toContain('Save Selected Checkpoints');
  expect(text(ui.root)).not.toContain('+ Add Category');
  expect(apiClient.put).not.toHaveBeenCalled();
  expect(apiClient.post).not.toHaveBeenCalled();
});

test('QC shares the full defect table and filters without reconciliation or register editing', async () => {
  jest.clearAllMocks();
  (getRegisterProjects as jest.Mock).mockResolvedValue({data:[{id:'p',name:'Assigned',clientName:'Company'}]});
  (getRegisterEquipment as jest.Mock).mockResolvedValue({data:[]});
  (getInspectionDefects as jest.Mock).mockResolvedValue({data:[]});
  (getDefects as jest.Mock).mockResolvedValue({data:{items:[{id:'f',equipmentId:'e',observation:'Corrosion',inspectionDate:'2026-11-13T00:00:00Z',status:'Open',canEdit:true,photos:[],remarks:'First',additionalRemarks:'Second'}]}});
  await act(async () => {ui=Renderer.create(<DefectRegisterScreen role="Qc"/>);});
  const grid=ui.root.findByType('HaerGrid' as any);
  expect(grid.props.columns).toHaveLength(16);
  expect(grid.props.rows).toHaveLength(1);
  expect(text(ui.root)).toContain('Client Company Name');
  expect(text(ui.root)).not.toContain('+ Add Defect');
  expect(text(ui.root)).not.toContain('Add Defect for Equipment');
  expect(ui.root.findAllByType(Pressable).some(n => text(n)==='Edit')).toBe(false);
  await act(async () => {ui.root.findByType(TextInput).props.onChangeText('no match');});
  expect(ui.root.findByType('HaerGrid' as any).props.rows).toHaveLength(0);
  expect(apiClient.post).not.toHaveBeenCalled();
  expect(apiClient.put).not.toHaveBeenCalled();
});
