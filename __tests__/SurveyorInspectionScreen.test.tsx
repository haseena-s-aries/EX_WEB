import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {TouchableOpacity, TextInput} from 'react-native';
import SurveyorInspectionScreen from '../src/screens/SurveyorInspectionScreen';
import {
  createSurveyorInspection,
  getSurveyorChecklist,
  getSurveyorChecklistPreview,
  getSurveyorProject,
  getSurveyorArea,
  uploadSurveyorInspectionPhotos,
  deleteSurveyorInspectionPhoto,
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
  getSurveyorChecklistPreview: jest.fn(),
  getSurveyorProject: jest.fn(),
  getSurveyorArea: jest.fn(),
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

beforeEach(() => {
  jest.clearAllMocks();
  (getSurveyorChecklistPreview as jest.Mock).mockResolvedValue({data: null});
  (getSurveyorProject as jest.Mock).mockResolvedValue({data: {projectName: 'Assigned project'}});
  (getSurveyorArea as jest.Mock).mockResolvedValue({data: {equipment: [{...equipment, model: 'Live motor model', gasGroup: 'IIB'}]}});
});

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
    renderer.root.findByProps({testID: 'answer-visual-1'}).props.onPress();
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


test('shows live header data and keeps questions without section metadata unclassified', async () => {
  (getSurveyorEquipmentDetails as jest.Mock).mockResolvedValue({data: equipment});
  (getSurveyorChecklist as jest.Mock).mockResolvedValue({data: checklist});
  (getSurveyorEquipmentInspection as jest.Mock).mockResolvedValue({data: inspection('InProgress')});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<SurveyorInspectionScreen equipmentId="equipment-1" inspectorName="Surveyor One" onBack={jest.fn()} onSaved={jest.fn()} />); });
  const text = textOf(renderer.root);
  expect(text).toContain('EX Inspection Test Record');
  expect(text).toContain('Assigned project');
  expect(text).toContain('Live motor model');
  expect(text).toContain('UNCLASSIFIED');
  expect(text).not.toContain('A. APPARATUS');
  expect(text).toContain('Status: InProgress');
  expect(text).not.toContain('CLOSED');
});

test('preserves answer remarks and checked state across grades and saves original IDs with photos', async () => {
  const existing = inspection('InProgress');
  existing.answers[0].isChecked = true;
  const withMetadata = {...existing, answers: existing.answers.map((answer, index) => ({...answer, remarks: index === 0 ? 'Existing observation' : null, sectionCode: index === 0 ? 'Apparatus' : null, applicableProtectionTypes: index === 0 ? 'Ex d' : null}))};
  (getSurveyorEquipmentDetails as jest.Mock).mockResolvedValue({data: equipment});
  (getSurveyorChecklist as jest.Mock).mockResolvedValue({data: checklist});
  (getSurveyorEquipmentInspection as jest.Mock).mockResolvedValue({data: withMetadata});
  (updateSurveyorInspection as jest.Mock).mockResolvedValue({data: withMetadata});
  (uploadSurveyorInspectionPhotos as jest.Mock).mockResolvedValue({data: []});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<SurveyorInspectionScreen equipmentId="equipment-1" inspectorName="Surveyor One" onBack={jest.fn()} onSaved={jest.fn()} />); });
  expect(textOf(renderer.root)).toContain('A. APPARATUS');
  expect(textOf(renderer.root)).toContain('Ex d');
  expect(renderer.root.findByProps({testID: 'remarks-visual-1'}).props.value).toBe('Existing observation');
  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({testID: 'remarks-visual-1'}).props.onChangeText('New observation');
    renderer.root.findByType('InspectionPhotoPicker' as any).props.onSelected([{uri: 'file:///inspection.jpg', fileName: 'inspection.jpg', type: 'image/jpeg'}]);
    buttonNamed(renderer.root, 'Close')?.props.onPress();
  });
  await ReactTestRenderer.act(async () => { buttonNamed(renderer.root, 'Visual')?.props.onPress(); });
  expect(renderer.root.findByProps({testID: 'remarks-visual-1'}).props.value).toBe('New observation');
  expect(renderer.root.findByProps({testID: 'answer-visual-1'}).props.accessibilityState.checked).toBe(true);
  await ReactTestRenderer.act(async () => { buttonNamed(renderer.root, 'Save Inspection')?.props.onPress(); });
  expect(updateSurveyorInspection).toHaveBeenCalledWith('inspection-1', expect.objectContaining({answers: expect.arrayContaining([expect.objectContaining({checklistItemId: 'visual-1', isChecked: true, remarks: 'New observation'})])}));
  expect(uploadSurveyorInspectionPhotos).toHaveBeenCalledWith('inspection-1', [expect.objectContaining({fileName: 'inspection.jpg'})]);
});

test('photo deletion preserves unsaved remarks and header edits', async () => {
  const existing = {...inspection('InProgress'), photos: [{id: 'photo-1', fileName: 'motor.jpg', photoPath: '/photo.jpg', uploadedAt: '2026-11-03'}]};
  (getSurveyorEquipmentDetails as jest.Mock).mockResolvedValue({data: equipment});
  (getSurveyorChecklist as jest.Mock).mockResolvedValue({data: checklist});
  (getSurveyorEquipmentInspection as jest.Mock).mockResolvedValueOnce({data: existing}).mockResolvedValueOnce({data: inspection('InProgress')});
  (deleteSurveyorInspectionPhoto as jest.Mock).mockResolvedValue({});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<SurveyorInspectionScreen equipmentId="equipment-1" inspectorName="Surveyor One" onBack={jest.fn()} onSaved={jest.fn()} />); });
  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({testID: 'remarks-visual-1'}).props.onChangeText('Unsaved finding');
    renderer.root.findAllByType(TextInput).find(input => input.props.accessibilityLabel === 'Inspector name')?.props.onChangeText('Updated name');
  });
  await ReactTestRenderer.act(async () => { buttonNamed(renderer.root, 'Remove')?.props.onPress(); });
  expect(deleteSurveyorInspectionPhoto).toHaveBeenCalledWith('inspection-1', 'photo-1');
  expect(renderer.root.findByProps({testID: 'remarks-visual-1'}).props.value).toBe('Unsaved finding');
  expect(renderer.root.findAllByType(TextInput).find(input => input.props.accessibilityLabel === 'Inspector name')?.props.value).toBe('Updated name');
});

test('QC approval keeps all inputs and photo controls read-only and preserves QC feedback', async () => {
  const locked = {...inspection('Completed', true), status: 'QcApproved', isEditable: false, qcComments: 'Reviewed and accepted', qcSeverity: 'Low'};
  (getSurveyorEquipmentDetails as jest.Mock).mockResolvedValue({data: {...equipment, inspectionEditable: false}});
  (getSurveyorChecklist as jest.Mock).mockResolvedValue({data: checklist});
  (getSurveyorEquipmentInspection as jest.Mock).mockResolvedValue({data: locked});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<SurveyorInspectionScreen equipmentId="equipment-1" inspectorName="Surveyor One" onBack={jest.fn()} onSaved={jest.fn()} />); });
  expect(textOf(renderer.root)).toContain('Reviewed and accepted');
  expect(textOf(renderer.root)).toContain('Status: QcApproved');
  expect(renderer.root.findAllByType(TextInput).every(input => input.props.editable === false)).toBe(true);
  expect(renderer.root.findByProps({testID: 'answer-visual-1'}).props.disabled).toBe(true);
  expect(renderer.root.findByType('InspectionPhotoPicker' as any).props.disabled).toBe(true);
  expect(buttonNamed(renderer.root, 'Save Inspection')).toBeUndefined();
  await ReactTestRenderer.act(async () => { renderer.root.findByProps({testID: 'answer-visual-1'}).props.onPress(); });
  expect(renderer.root.findByProps({testID: 'answer-visual-1'}).props.accessibilityState.checked).toBe(true);
});


test('source item numbers survive filtered grades and source-grey cells are explicitly unavailable', async () => {
  (getSurveyorEquipmentDetails as jest.Mock).mockResolvedValue({data: equipment});
  (getSurveyorChecklist as jest.Mock).mockResolvedValue({data: checklist});
  const mapped = {...inspection('InProgress'), answers: [{...checklist[0], isChecked:false, remarks:null, sectionCode:'Installation', sourceItemNumber:33, applicableGrades:'Detailed,Visual', subChecksJson:JSON.stringify([{label:'visual check',applicableGrades:['Visual']}])}]};
  (getSurveyorEquipmentInspection as jest.Mock).mockResolvedValue({data:mapped});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer=ReactTestRenderer.create(<SurveyorInspectionScreen equipmentId="equipment-1" inspectorName="Surveyor" onBack={jest.fn()} onSaved={jest.fn()}/>);});
  expect(textOf(renderer.root)).toContain('B. INSTALLATION');
  expect(textOf(renderer.root)).toContain('33');
  expect(textOf(renderer.root)).toContain('visual check: Visual');
  expect(renderer.root.findAllByProps({accessibilityLabel:'Unavailable grade in source checklist'}).length).toBeGreaterThan(0);
  await ReactTestRenderer.act(async()=>renderer.unmount());
});


test('legacy inspection opens editable saved answers; source preview is opt-in and cannot overwrite them', async () => {
  (getSurveyorEquipmentDetails as jest.Mock).mockResolvedValue({data: equipment});
  (getSurveyorChecklist as jest.Mock).mockResolvedValue({data: checklist});
  (getSurveyorEquipmentInspection as jest.Mock).mockResolvedValue({data: inspection('InProgress', true)});
  const items = ['Apparatus','Installation','Environment'].map((section,index)=>({...checklist[0],checklistItemId:`source-${index}`,sectionCode:section,sourceItemReference:`sample/${section}/1`,sourceItemNumber:1,text:`Source ${section} point`}));
  (getSurveyorChecklistPreview as jest.Mock).mockResolvedValue({data:{pointCount:59,isPublished:false,sourceRevision:'sample',items}});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async()=>{renderer=ReactTestRenderer.create(<SurveyorInspectionScreen equipmentId="equipment-1" inspectorName="Surveyor" onBack={jest.fn()} onSaved={jest.fn()}/>);});
  expect(renderer.root.findByProps({testID:'answer-visual-1'}).props.disabled).toBe(false);
  expect(textOf(renderer.root)).toContain('Editing this inspection’s saved answers');
  await ReactTestRenderer.act(async()=>renderer.root.findByProps({testID:'answer-visual-1'}).props.onPress());
  expect(renderer.root.findByProps({testID:'answer-visual-1'}).props.accessibilityState.checked).toBe(false);
  await ReactTestRenderer.act(async()=>buttonNamed(renderer.root,'View full checklist points')?.props.onPress());
  expect(textOf(renderer.root)).toContain('A. APPARATUS');
  expect(textOf(renderer.root)).toContain('B. INSTALLATION');
  expect(textOf(renderer.root)).toContain('C. ENVIRONMENT');
  expect(textOf(renderer.root)).toContain('Preview only');
  expect(renderer.root.findAllByProps({testID:'answer-source-0'})).toHaveLength(0);
  expect(textOf(renderer.root)).toContain('View only');
  expect(buttonNamed(renderer.root,'Save Inspection')).toBeUndefined();
  await ReactTestRenderer.act(async()=>buttonNamed(renderer.root,'Saved inspection (12 items)')?.props.onPress());
  expect(renderer.root.findByProps({testID:'answer-visual-1'}).props.accessibilityState.checked).toBe(false);
  expect(buttonNamed(renderer.root,'Save Inspection')).toBeDefined();
  expect(updateSurveyorInspection).not.toHaveBeenCalled();
  await ReactTestRenderer.act(async()=>renderer.unmount());
});
