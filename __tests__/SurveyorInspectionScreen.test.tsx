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
  {
    checklistItemId: 'visual-1',
    inspectionType: 'Visual',
    text: 'Enclosure is intact',
    sortOrder: 1,
    isRequired: true,
  },
  {
    checklistItemId: 'close-1',
    inspectionType: 'Close',
    text: 'Cable entries are secure',
    sortOrder: 1,
    isRequired: true,
  },
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
  expect(textOf(renderer.root)).toContain('0/2');

  await ReactTestRenderer.act(async () => {
    buttonNamed(renderer.root, 'Enclosure is intact')?.props.onPress();
  });
  expect(textOf(renderer.root)).toContain('1/2');

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
