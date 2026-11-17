import React from 'react';
import Renderer, {act} from 'react-test-renderer';
import {TouchableOpacity} from 'react-native';
import ProjectDetailModal from '../src/components/ProjectDetailModal';
import ClientAssignmentPicker from '../src/components/ClientAssignmentPicker';
import {getProject} from '../src/api/projects';
jest.mock('../src/api/projects', () => ({getProject: jest.fn()}));
jest.mock('../src/navigation/useNativeNavigation', () => () => undefined);
jest.mock('../src/components/OurCompanySection', () => 'OurCompanySection');
jest.mock('../src/components/ProjectSurveyorManagement', () => 'ProjectSurveyorManagement');
jest.mock('../src/components/ProjectWorkSchedulePanel', () => 'ProjectWorkSchedulePanel');
jest.mock('../src/components/ReportWorkflowPanel', () => 'ReportWorkflowPanel');
jest.mock('../src/components/HazardousAreaPlanUpload', () => 'HazardousAreaPlanUpload');
jest.mock('../src/components/ClientLogoUpload', () => 'ClientLogoUpload');
jest.mock('../src/components/ProjectImageGallery', () => 'ProjectImageGallery');
jest.mock('../src/components/HazardousAreaPlanSection', () => 'HazardousAreaPlanSection');
jest.mock('../src/components/chooseAreaAttachment', () => ({chooseAreaAttachment: jest.fn()}));
const text = (n: Renderer.ReactTestInstance): string => n.children.map(c => typeof c === 'string' ? c : text(c)).join('');
test.each([false, true])('edit restores multiple and legacy Client assignments (legacy=%s)', async legacy => {
  const project = {id: 'p1', projectName: 'Ship', jobNo: 'JOB1', location: 'Dubai', vesselOrSiteName: 'Site', targetDate: '2026-12-01',
    clientName: 'Acme Marine', assignedSurveyorId: 's1', assignedQcId: 'q1', assignedClientId: 'c1',
    ...(legacy ? {} : {assignedClientIds: ['c1', 'c2']}), status: 'Active', areas: []};
  (getProject as jest.Mock).mockResolvedValue({data: project});
  const onSave = jest.fn(); let ui!: Renderer.ReactTestRenderer;
  await act(async () => {ui = Renderer.create(<ProjectDetailModal visible fullPage userRole="Admin" project={project} onSave={onSave} onClose={jest.fn()}
    surveyors={[]} qcUsers={[]} clients={[{id: 'c1', displayName: 'Alice'}, {id: 'c2', displayName: 'Bob'}]} />);});
  expect(ui.root.findByType(ClientAssignmentPicker).props.value).toEqual(legacy ? ['c1'] : ['c1', 'c2']);
  await act(async () => {ui.root.findByType(ClientAssignmentPicker).props.onChange(['c2']);});
  await act(async () => {ui.root.findAllByType(TouchableOpacity).find(n => text(n).includes('Save Changes'))!.props.onPress();});
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({assignedClientIds: ['c2'], assignedClientId: 'c2', clientName: 'Acme Marine', assignedQcId: 'q1', preserveSurveyorAssignment: true}));
  await act(async () => ui.unmount());
});
