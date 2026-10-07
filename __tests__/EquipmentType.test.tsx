import React from 'react';
import Renderer from 'react-test-renderer';
import {Platform, TextInput, TouchableOpacity} from 'react-native';
import SurveyorAreaDetailsScreen from '../src/screens/SurveyorAreaDetailsScreen';
import {createSurveyorEquipment, getProjectAreaPhotos, getSurveyorArea, getSurveyorEquipment, updateSurveyorEquipment} from '../src/api/projects';

jest.mock('../src/api/projects', () => ({getSurveyorArea: jest.fn(), getSurveyorEquipment: jest.fn(), getProjectAreaPhotos: jest.fn(), createSurveyorEquipment: jest.fn(), updateSurveyorEquipment: jest.fn(), deleteSurveyorEquipment: jest.fn()}));
jest.mock('../src/components/AuthenticatedImage', () => 'AuthenticatedImage');
jest.mock('../src/components/ZoomableImageViewer', () => 'LayoutViewer');
const textOf = (node: Renderer.ReactTestInstance): string => node.children.map(child => typeof child === 'string' ? child : textOf(child)).join('');
let renderer: Renderer.ReactTestRenderer;
const originalPlatform = Platform.OS;
const equipment = {id: 'equipment', sequenceNo: 3, tagNumber: 'D3232', equipmentId: 'D2232', type: 'Motor', xPercent: 25, yPercent: 50, circuitId: 'C1', location: 'Deck', manufacturer: 'ACME', protectionDetails: 'IP66', certificateNumber: 'CERT', status: 'NotStarted'};
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', {configurable: true, value: 'web'});
  (getSurveyorArea as jest.Mock).mockResolvedValue({data: {areaId: 'area', areaName: 'Deck', layoutImagePath: '/layout.jpg'}});
  (getSurveyorEquipment as jest.Mock).mockResolvedValue({data: [equipment]});
  (getProjectAreaPhotos as jest.Mock).mockResolvedValue({data: []});
  (createSurveyorEquipment as jest.Mock).mockResolvedValue({data: equipment});
  (updateSurveyorEquipment as jest.Mock).mockResolvedValue({data: equipment});
});
afterEach(async () => {
  await Renderer.act(async () => {renderer?.unmount();});
  Object.defineProperty(Platform, 'OS', {configurable: true, value: originalPlatform});
});
async function open() {
  await Renderer.act(async () => {renderer = Renderer.create(<SurveyorAreaDetailsScreen projectId="project" areaId="area" onBack={jest.fn()} onEquipmentPress={jest.fn()} />);});
}
async function press(text: string) {
  await Renderer.act(async () => {renderer.root.findAllByType(TouchableOpacity).find(node => textOf(node) === text)!.props.onPress({stopPropagation: jest.fn()});});
}
async function select(value: string) {
  await Renderer.act(async () => {renderer.root.findByType('select' as any).props.onChange({target: {value}});});
}
async function add() {
  await press('+ Add Equipment');
  const canvas = renderer.root.find(node => typeof node.props.onLayout === 'function' && Array.isArray(node.props.style) && node.props.style.some((style: any) => style?.aspectRatio));
  await Renderer.act(async () => {canvas.props.onLayout({nativeEvent: {layout: {width: 200, height: 100}}});});
  await Renderer.act(async () => {canvas.props.onPress({nativeEvent: {locationX: 50, locationY: 50}});});
  await Renderer.act(async () => {renderer.root.findAllByType(TextInput)[0].props.onChangeText('D3232');});
}
test('Add requires Type, offers the exact options, and preserves pin coordinates when saving', async () => {
  await open(); await add();
  const dropdown = renderer.root.findByType('select' as any);
  expect(dropdown.props.value).toBe('');
  expect(dropdown.findAllByType('option' as any).map(node => textOf(node))).toEqual(['Select equipment type', 'Transformer', 'Switchgear', 'Circuit Breaker', 'Motor', 'Generator', 'Panel', 'Cable', 'Lighting', 'Outlet', 'Other']);
  await press('Add Equipment');
  expect(createSurveyorEquipment).not.toHaveBeenCalled();
  await select('Transformer'); await press('Add Equipment');
  expect(createSurveyorEquipment).toHaveBeenCalledWith('project', 'area', expect.objectContaining({type: 'Transformer', tagNumber: 'D3232', xPercent: 25, yPercent: 50}));
});
test('Other requires a custom value and saves it into type', async () => {
  await open(); await add(); await select('Other'); await press('Add Equipment');
  expect(createSurveyorEquipment).not.toHaveBeenCalled();
  expect(textOf(renderer.root)).toContain('Other Equipment Type is required.');
  await Renderer.act(async () => {renderer.root.findAllByType(TextInput).find(node => node.props.placeholder === 'Enter equipment type')!.props.onChangeText('  UPS System  ');});
  await press('Add Equipment');
  expect(createSurveyorEquipment).toHaveBeenCalledWith('project', 'area', expect.objectContaining({type: 'UPS System'}));
});
test.each(['Motor', 'UPS System', 'Other'])('Edit restores and retains saved type %s and other equipment fields', async type => {
  (getSurveyorEquipment as jest.Mock).mockResolvedValue({data: [{...equipment, type}]});
  await open(); await press('Edit');
  expect(renderer.root.findByType('select' as any).props.value).toBe(type === 'UPS System' ? 'Other' : type);
  if (type !== 'Motor') expect(renderer.root.findAllByType(TextInput).find(node => node.props.placeholder === 'Enter equipment type')!.props.value).toBe(type);
  await press('Save Changes');
  expect(updateSurveyorEquipment).toHaveBeenCalledWith('project', 'area', 'equipment', expect.objectContaining({type, tagNumber: equipment.tagNumber, equipmentId: equipment.equipmentId, circuitId: equipment.circuitId, location: equipment.location, manufacturer: equipment.manufacturer, protectionDetails: equipment.protectionDetails, certificateNumber: equipment.certificateNumber, xPercent: 25, yPercent: 50}));
});
test('Native dropdown selects a type and saves through the same edit API', async () => {
  Object.defineProperty(Platform, 'OS', {configurable: true, value: 'android'});
  await open(); await press('Edit');
  await Renderer.act(async () => {renderer.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === 'Select equipment type')!.props.onPress();});
  await Renderer.act(async () => {renderer.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === 'Generator')!.props.onPress();});
  await press('Save Changes');
  expect(updateSurveyorEquipment).toHaveBeenCalledWith('project', 'area', 'equipment', expect.objectContaining({type: 'Generator'}));
});
