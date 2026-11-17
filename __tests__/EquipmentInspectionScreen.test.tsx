import React from 'react';
import Renderer from 'react-test-renderer';
import EquipmentInspectionScreen from '../src/screens/EquipmentInspectionScreen';
import {getSurveyorEquipmentDetails} from '../src/api/projects';

jest.mock('../src/api/projects', () => ({getSurveyorEquipmentDetails: jest.fn()}));
jest.mock('../src/screens/CategoryInspectionEntryScreen', () => {
  const ReactRuntime = require('react');
  const {Text} = require('react-native');
  return (props: any) => ReactRuntime.createElement(Text, {testID: 'supported-equipment-inspection'}, `${props.project}/${props.areaId}/${props.item}`);
});

test('opens the supported Equipment Inspection with the supplied project, area, and equipment', async () => {
  let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {
    renderer = Renderer.create(<EquipmentInspectionScreen projectId="project-1" areaId="area-1" equipmentId="equipment-1" onBack={jest.fn()} onSaved={jest.fn()} />);
  });
  expect(renderer.root.findByProps({testID: 'supported-equipment-inspection'}).props.children).toBe('project-1/area-1/equipment-1');
  expect(getSurveyorEquipmentDetails).not.toHaveBeenCalled();
  await Renderer.act(async () => renderer.unmount());
});

test('resolves project and area context for an old equipment inspection link', async () => {
  (getSurveyorEquipmentDetails as jest.Mock).mockResolvedValue({data: {projectId: 'project-2', areaId: 'area-2'}});
  let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {
    renderer = Renderer.create(<EquipmentInspectionScreen equipmentId="equipment-2" onBack={jest.fn()} onSaved={jest.fn()} />);
  });
  expect(renderer.root.findByProps({testID: 'supported-equipment-inspection'}).props.children).toBe('project-2/area-2/equipment-2');
  expect(getSurveyorEquipmentDetails).toHaveBeenCalledWith('equipment-2');
  await Renderer.act(async () => renderer.unmount());
});
