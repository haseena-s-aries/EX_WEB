import React from 'react';
import Renderer from 'react-test-renderer';
import ChecklistAdminScreen from '../src/screens/ChecklistAdminScreen';
import * as checklistApi from '../src/api/checklistAdmin';

jest.mock('../src/api/checklistAdmin', () => ({
  approveChecklistTemplate: jest.fn().mockResolvedValue({}), archiveChecklistTemplate: jest.fn().mockResolvedValue({}),
  cloneChecklistTemplate: jest.fn().mockResolvedValue({}), createChecklistTemplate: jest.fn().mockResolvedValue({}),
  editChecklistTemplate: jest.fn().mockResolvedValue({}), getChecklistTemplates: jest.fn().mockResolvedValue({data: []}),
  previewChecklistTemplate: jest.fn().mockResolvedValue({data: {x: {}, Sections: []}}), submitChecklistTemplate: jest.fn().mockResolvedValue({}),
}));
const textOf = (node: Renderer.ReactTestInstance): string => node.children.map(child => typeof child === 'string' ? child : textOf(child)).join(' ');
const press = (root: Renderer.ReactTestInstance, label: string) => root.findAllByProps({accessibilityRole: 'button'}).find(x => textOf(x).includes(label))!.props.onPress();

test('admin can create a controlled checklist draft and the draft editor exposes sections and measurement setup', async () => {
  let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {renderer = Renderer.create(<ChecklistAdminScreen role="Admin"/>);});
  await Renderer.act(async () => press(renderer.root, 'New checklist'));
  await Renderer.act(async () => {
    const inputs = renderer.root.findAllByType(require('react-native').TextInput);
    const set = (label: string, value: string) => inputs.find(x => x.props.accessibilityLabel === label)!.props.onChangeText(value);
    set('Template name', 'Approved source draft'); set('Controlled source reference', 'Client standard REV-A'); set('Applicable Ex protection types, comma separated', 'Ex d');
  });
  await Renderer.act(async () => press(renderer.root, 'Create draft'));
  expect(checklistApi.createChecklistTemplate).toHaveBeenCalledWith(expect.objectContaining({name: 'Approved source draft', controlledSourceReference: 'Client standard REV-A', applicableProtectionTypes: 'Ex d'}));
  expect(textOf(renderer.root)).toContain('Draft created. Open it to add checkpoints.');
  await Renderer.act(async () => renderer.unmount());
});

test('QC user can publish only through technical approval action', async () => {
  const pending = {id: 't1', name: 'Controlled template', inspectionType: 'Close', version: 1, draftRevision: 1, lifecycleStatus: 'PendingTechnicalApproval', isActive: false, standardReference: 'IEC 60079-17', standardEdition: '2023', controlledSourceReference: 'Approved source', applicableProtectionTypes: 'Ex d', questions: [{text: 'Inspect checkpoint', sortOrder: 1, sectionCode: 'Apparatus', isRequired: true, responseScaleCode: 'PassFailNA', requireRemarkOnFail: false, numericReadingEnabled: false, numericReadingRequired: false}]};
  (checklistApi.getChecklistTemplates as jest.Mock).mockResolvedValue({data: [pending]});
  let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {renderer = Renderer.create(<ChecklistAdminScreen role="Qc"/>);});
  await Renderer.act(async () => press(renderer.root, 'Controlled template'));
  expect(textOf(renderer.root)).toContain('Approve and publish');
  await Renderer.act(async () => {
    const input = renderer.root.findAllByType(require('react-native').TextInput).find(x => x.props.accessibilityLabel === 'Technical approval comments')!;
    input.props.onChangeText('Technical approval recorded');
  });
  await Renderer.act(async () => press(renderer.root, 'Approve and publish'));
  expect(checklistApi.approveChecklistTemplate).toHaveBeenCalledWith('t1', 'Technical approval recorded');
  await Renderer.act(async () => renderer.unmount());
});

test('draft checklist can be previewed by section before publication', async () => {
  const draft = {id:'preview-1',name:'Preview draft',inspectionType:'Visual',version:1,draftRevision:2,lifecycleStatus:'Draft',isActive:false,standardReference:'Client controlled source',controlledSourceReference:'Doc-REV-B',applicableProtectionTypes:'Ex e',questions:[{text:'Synthetic preview prompt',sortOrder:1,sectionCode:'Environment',isRequired:true,responseScaleCode:'PassFailNA',requireRemarkOnFail:true,numericReadingEnabled:false,numericReadingRequired:false}]};
  (checklistApi.getChecklistTemplates as jest.Mock).mockResolvedValue({data:[draft]});
  let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {renderer=Renderer.create(<ChecklistAdminScreen role="Manager"/>);});
  await Renderer.act(async () => press(renderer.root,'Preview draft'));
  await Renderer.act(async () => press(renderer.root,'Preview checklist'));
  expect(checklistApi.previewChecklistTemplate).toHaveBeenCalledWith('preview-1');
  expect(textOf(renderer.root)).toContain('Checklist preview');
  expect(textOf(renderer.root)).toContain('Synthetic preview prompt');
  await Renderer.act(async () => renderer.unmount());
});
