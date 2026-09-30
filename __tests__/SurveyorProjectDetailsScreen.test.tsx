import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {TouchableOpacity} from 'react-native';
import SurveyorProjectDetailsScreen from '../src/screens/SurveyorProjectDetailsScreen';
import {
  getSurveyorEquipment,
  getSurveyorProject,
  getSurveyorProjectAreas,
} from '../src/api/projects';

jest.mock('../src/components/AuthenticatedImage', () => 'AuthenticatedImage');
jest.mock('../src/api/projects', () => ({
  getSurveyorProject: jest.fn(),
  getSurveyorProjectAreas: jest.fn(),
  getSurveyorEquipment: jest.fn(),
  getProjectAreaPhotos: jest.fn(),
}));

const project = {
  projectId: 'project-1',
  projectName: 'Inspection Project',
  sector: 'Marine',
  jobNo: 'JOB-1',
  location: 'Rotterdam',
  vesselOrSiteName: 'MV Test',
  createdDate: '2026-09-29T00:00:00Z',
  status: 'InProgress',
  assignedSurveyor: 'Surveyor One',
  assignedQc: 'QC One',
  assignedClient: 'Client One',
  areas: [],
};

const areas = [
  {areaId: 'pipe', areaName: 'PIPE', layoutImagePath: '/pipe.jpg', photoCount: 1, equipmentCount: 2},
  {areaId: 'rack', areaName: 'Rack', layoutImagePath: '/rack.jpg', photoCount: 0, equipmentCount: 0},
];

const equipment = [
  {
    id: 'equipment-1',
    projectId: 'project-1',
    areaId: 'pipe',
    sequenceNo: 1,
    xPercent: 20,
    yPercent: 30,
    tagNumber: 'EQ-001',
    equipmentId: 'MTR-01',
    type: 'Motor',
    circuitId: 'C-01',
    location: 'Pipe Deck',
    manufacturer: 'ABB',
    protectionDetails: 'Ex d IIC T6, IP66',
    certificateNumber: 'CERT-001',
    status: 'NotStarted',
    createdByUserId: 'surveyor-1',
    createdAt: '2026-09-29T00:00:00Z',
    updatedAt: '2026-09-29T00:00:00Z',
  },
];

const textOf = (node: ReactTestRenderer.ReactTestInstance): string =>
  node.children.map(child => typeof child === 'string' ? child : textOf(child)).join('');

const buttonNamed = (root: ReactTestRenderer.ReactTestInstance, name: string) =>
  root.findAllByType(TouchableOpacity).find(button => textOf(button).includes(name));

test('expands project areas and grouped equipment independently', async () => {
  (getSurveyorProject as jest.Mock).mockResolvedValue({data: project});
  (getSurveyorProjectAreas as jest.Mock).mockResolvedValue({data: areas});
  (getSurveyorEquipment as jest.Mock).mockImplementation(
    (_projectId: string, areaId: string) =>
      Promise.resolve({data: areaId === 'pipe' ? equipment : []}),
  );
  const onAreaPress = jest.fn();
  const onEquipmentPress = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SurveyorProjectDetailsScreen
        projectId="project-1"
        onBack={jest.fn()}
        onAreaPress={onAreaPress}
        onEquipmentPress={onEquipmentPress}
      />,
    );
  });

  expect(buttonNamed(renderer.root, 'PIPE')).toBeUndefined();

  await ReactTestRenderer.act(async () => {
    buttonNamed(renderer.root, 'Project Areas')?.props.onPress();
  });
  expect(buttonNamed(renderer.root, 'View Area')).toBeDefined();
  await ReactTestRenderer.act(async () => {
    buttonNamed(renderer.root, 'View Area')?.props.onPress();
  });
  expect(onAreaPress).toHaveBeenCalledWith('pipe');

  await ReactTestRenderer.act(async () => {
    buttonNamed(renderer.root, 'All Equipment')?.props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    buttonNamed(renderer.root, 'PIPE')?.props.onPress();
  });
  expect(buttonNamed(renderer.root, 'EQ-001')).toBeDefined();
  expect(textOf(renderer.root)).toContain('Pending Inspection');

  await ReactTestRenderer.act(async () => {
    buttonNamed(renderer.root, 'EQ-001')?.props.onPress();
  });
  expect(onEquipmentPress).toHaveBeenCalledWith('pipe', 'equipment-1');

  await ReactTestRenderer.act(async () => {
    buttonNamed(renderer.root, 'Rack')?.props.onPress();
  });
  expect(buttonNamed(renderer.root, 'EQ-001')).toBeUndefined();
});
