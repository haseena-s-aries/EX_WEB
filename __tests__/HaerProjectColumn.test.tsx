import React from 'react';
import Renderer, {act} from 'react-test-renderer';
import {TextInput, TouchableOpacity} from 'react-native';
import AdminEquipmentListScreen from '../src/screens/AdminEquipmentListScreen';
import HaerGrid from '../src/components/HaerGrid';
import {getHaerRegister} from '../src/api/reports';
import {getEquipmentRegistrationProjects} from '../src/api/equipmentIdentification';

jest.mock('../src/api/reports', () => ({getHaerRegister: jest.fn()}));
jest.mock('../src/api/equipmentIdentification', () => ({getEquipmentRegistrationProjects: jest.fn()}));
jest.mock('../src/components/HaerAreaManager', () => 'HaerAreaManager');
jest.mock('../src/components/SearchableOptionPicker', () => 'SearchableOptionPicker');
jest.mock('../src/theme/useThemeMode', () => ({useThemeMode: () => 'dark'}));
const text = (node: Renderer.ReactTestInstance): string => node.children.map(c => typeof c === 'string' ? c : text(c)).join('');
const cellText = (cell: React.ReactElement) => (cell.props as {children: React.ReactNode}).children;

test('HAER shows related project names, searches them and retains the project when editing', async () => {
  const projects = [{id:'p1',projectName:'Ocean Alpha',areas:[{id:'a1',areaName:'Deck'}]},
    {id:'p2',projectName:'Ocean Beta',areas:[{id:'a2',areaName:'Deck'}]}];
  (getEquipmentRegistrationProjects as jest.Mock).mockResolvedValue({data:projects});
  (getHaerRegister as jest.Mock).mockImplementation(async (id: string) => ({data:{projectName:projects.find(p => p.id === id)!.projectName,
    equipment:[{equipmentRecordId:id+'e',areaId:id === 'p1' ? 'a1' : 'a2',sequenceNo:1,itemNumber:'ITEM-'+id,tagNumber:'TAG-'+id,
      equipmentType:'Motor',area:'Deck',inspectionStatus:'NotStarted'}]}}));
  let ui!: Renderer.ReactTestRenderer;
  await act(async () => {ui = Renderer.create(<AdminEquipmentListScreen onEquipmentPress={jest.fn()} />);});
  const grid = () => ui.root.findByType(HaerGrid).props;
  expect(grid().columns.slice(0,3).map((c: {label:string}) => c.label)).toEqual(['Sl. No','Project Name','Item #']);
  expect(grid().rows.map((r: {cells:React.ReactElement[]}) => cellText(r.cells[1]))).toEqual(['Ocean Alpha','Ocean Beta']);
  await act(async () => {ui.root.findByProps({accessibilityLabel:'Search HAER'}).props.onChangeText('ocean beta');});
  expect(grid().rows).toHaveLength(1);
  expect(cellText(grid().rows[0].cells[2])).toBe('ITEM-p2');
  await act(async () => {ui.root.findAllByType(TouchableOpacity).find(n => text(n) === 'Edit')!.props.onPress();});
  expect(cellText(grid().rows[0].cells[1])).toBe('Ocean Beta');
  expect(ui.root.findAllByType(TextInput).some(n => n.props.accessibilityLabel === 'Project Name')).toBe(false);
  await act(async () => {ui.unmount();});
});
