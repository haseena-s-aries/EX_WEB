import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {TouchableOpacity} from 'react-native';
import SurveyorInspectionScreen from '../src/screens/SurveyorInspectionScreen';
import {
  createSurveyorInspection,
  getSurveyorChecklist,
  getSurveyorEquipmentDetails,
  getSurveyorEquipmentInspection,
  updateSurveyorInspection,
} from '../src/api/projects';

jest.mock('../src/components/AuthenticatedImage', () => 'AuthenticatedImage');
jest.mock('../src/components/InspectionPhotoPicker', () => 'InspectionPhotoPicker');
jest.mock('../src/api/projects', () => ({
  createSurveyorInspection: jest.fn(),
  deleteSurveyorInspectionPhoto: jest.fn(),
  getSurveyorChecklist: jest.fn(),
  getSurveyorEquipmentDetails: jest.fn(),
  getSurveyorEquipmentInspection: jest.fn(),
  updateSurveyorInspection: jest.fn(),
  uploadSurveyorInspectionPhotos: jest.fn(),
}));

const equipment = {
  id: 'equipment-1',
  projectId: 'project-1',
  areaId: 'area-1',
  areaName: 'PIPE',
  sequenceNo: 1,
  xPercent: 20,
  yPercent: 30,
  tagNumber: 'EQ-001',
  equipmentId: 'MTR-01',
  type: 'Motor',
  createdAt: '2026-09-29T00:00:00Z',
  inspectionStatus: 'NotStarted',
  inspectionEditable: true,
};

const checklist = [
  ...[
    'Enclosure is intact',
    'Gaskets are in good condition',
    'No excessive corrosion',
    'Rating plate is legible',
  ].map((text, index) => ({
    checklistItemId: `visual-${index + 1}`,
    inspectionType: 'Visual' as const,
    text,
    sortOrder: index + 1,
    isRequired: true,
  })),
  ...[
    'All bolts and fasteners are tight',
    'Cable entries are properly sealed',
    'Covers and lids properly fitted',
    'Grounding/bonding connections intact',
  ].map((text, index) => ({
    checklistItemId: `close-${index + 1}`,
    inspectionType: 'Close' as const,
    text,
    sortOrder: index + 1,
    isRequired: true,
  })),
  ...[
    'No unauthorized modifications',
    'Flame paths clean and undamaged',
    'No excessive paint buildup',
    'Internal components properly mounted',
  ].map((text, index) => ({
    checklistItemId: `detailed-${index + 1}`,
    inspectionType: 'Detailed' as const,
    text,
    sortOrder: index + 1,
    isRequired: true,
  })),
];

const inspection = (status: 'InProgress' | 'Completed', checked = false) => ({
  inspectionId: 'inspection-1',
  equipmentId: 'equipment-1',
  inspectionDate: '2026-09-29T00:00:00Z',
  inspectorName: 'Surveyor One',
  comments: null,
  status,
  isEditable: true,
  createdAt: '2026-09-29T00:00:00Z',
  updatedAt: '2026-09-29T00:00:00Z',
  answers: checklist.map(item => ({...item, isChecked: checked, remarks: null})),
  photos: [],
});

const textOf = (node: ReactTestRenderer.ReactTestInstance): string =>
  node.children.map(child => typeof child === 'string' ? child : textOf(child)).join('');

const buttonNamed = (root: ReactTestRenderer.ReactTestInstance, name: string) =>
  root.findAllByType(TouchableOpacity).find(button => textOf(button).includes(name));

test('starts a draft and reloads the completed inspection after save', async () => {
  (getSurveyorEquipmentDetails as jest.Mock).mockResolvedValue({data: equipment});
  (getSurveyorChecklist as jest.Mock).mockResolvedValue({data: checklist});
  (getSurveyorEquipmentInspection as jest.Mock)
    .mockRejectedValueOnce({response: {status: 404}})
    .mockResolvedValueOnce({data: inspection('Completed', true)});
  (createSurveyorInspection as jest.Mock).mockResolvedValue({
    data: inspection('InProgress'),
  });
  (updateSurveyorInspection as jest.Mock).mockResolvedValue({
    data: inspection('Completed', true),
  });
  const onSaved = jest.fn();
  const onBack = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SurveyorInspectionScreen
        equipmentId="equipment-1"
        inspectorName="Surveyor One"
        onBack={onBack}
        onSaved={onSaved}
      />,
    );
  });

  expect(createSurveyorInspection).toHaveBeenCalledWith(
    'equipment-1',
    expect.objectContaining({isCompleted: false}),
  );
  expect(textOf(renderer.root)).toContain('0/12');
  expect(textOf(renderer.root)).toContain('Progress: 0 / 12 checked');

  await ReactTestRenderer.act(async () => {
    buttonNamed(renderer.root, 'Enclosure is intact')?.props.onPress();
  });
  expect(textOf(renderer.root)).toContain('1/12');

  await ReactTestRenderer.act(async () => {
    buttonNamed(renderer.root, 'Save Inspection')?.props.onPress();
  });

  expect(updateSurveyorInspection).toHaveBeenCalledWith(
    'inspection-1',
    expect.objectContaining({
      isCompleted: true,
      answers: expect.arrayContaining([
        expect.objectContaining({checklistItemId: 'visual-1', isChecked: true}),
      ]),
    }),
  );
  expect(getSurveyorEquipmentInspection).toHaveBeenCalledTimes(2);
  expect(onSaved).toHaveBeenCalledTimes(1);
  expect(onBack).toHaveBeenCalledTimes(1);
});

test('select all affects only the active tab and preserves other tabs', async () => {
  (getSurveyorEquipmentDetails as jest.Mock).mockResolvedValue({data: equipment});
  (getSurveyorChecklist as jest.Mock).mockResolvedValue({data: checklist});
  (getSurveyorEquipmentInspection as jest.Mock).mockResolvedValue({
    data: inspection('InProgress'),
  });
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SurveyorInspectionScreen
        equipmentId="equipment-1"
        inspectorName="Surveyor One"
        onBack={jest.fn()}
        onSaved={jest.fn()}
      />,
    );
  });

  await ReactTestRenderer.act(async () => {
    buttonNamed(renderer.root, 'Select All')?.props.onPress();
  });
  expect(textOf(renderer.root)).toContain('Progress: 4 / 12 checked');

  await ReactTestRenderer.act(async () => {
    buttonNamed(renderer.root, 'Close')?.props.onPress();
  });
  expect(textOf(renderer.root)).toContain('All bolts and fasteners are tight');
  expect(
    buttonNamed(renderer.root, 'Select All')?.props.accessibilityState.checked,
  ).toBe(false);

  await ReactTestRenderer.act(async () => {
    buttonNamed(renderer.root, 'Select All')?.props.onPress();
  });
  expect(textOf(renderer.root)).toContain('Progress: 8 / 12 checked');

  await ReactTestRenderer.act(async () => {
    buttonNamed(renderer.root, 'Visual')?.props.onPress();
  });
  expect(
    buttonNamed(renderer.root, 'Select All')?.props.accessibilityState.checked,
  ).toBe(true);
});
