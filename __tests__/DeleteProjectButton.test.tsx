import React from 'react';
import Renderer from 'react-test-renderer';
import {Alert, TouchableOpacity} from 'react-native';
import DeleteProjectButton from '../src/components/DeleteProjectButton';
import {deleteProject} from '../src/api/projects';
jest.mock('../src/api/projects', () => ({deleteProject: jest.fn()}));
beforeEach(() => {jest.clearAllMocks();});
test.each(['Qc', 'Surveyor', 'Client', undefined])('hides project deletion for %s', async role => {
  let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {renderer = Renderer.create(<DeleteProjectButton userRole={role} projectId="p" projectName="Project" onDeleted={jest.fn()} />);});
  expect(renderer.root.findAllByType(TouchableOpacity)).toHaveLength(0);
});
test.each(['Manager', 'Admin'])('%s confirms before deleting and refreshes after success', async role => {
  (deleteProject as jest.Mock).mockResolvedValue({status: 204});
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const onDeleted = jest.fn(); const stopPropagation = jest.fn(); let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {renderer = Renderer.create(<DeleteProjectButton userRole={role} projectId="p" projectName="Project" onDeleted={onDeleted} />);});
  await Renderer.act(async () => {renderer.root.findByType(TouchableOpacity).props.onPress({stopPropagation});});
  expect(stopPropagation).toHaveBeenCalled(); expect(deleteProject).not.toHaveBeenCalled();
  expect(alert.mock.calls[0][1]).toContain('permanently deletes');
  await Renderer.act(async () => {alert.mock.calls[0][2]!.find(button => button.text === 'Delete')!.onPress!();});
  expect(deleteProject).toHaveBeenCalledWith('p'); expect(onDeleted).toHaveBeenCalledTimes(1); alert.mockRestore();
});
test('failed deletion keeps project visible and shows server error', async () => {
  (deleteProject as jest.Mock).mockRejectedValue({response: {status: 409, data: {error: 'Project has report links'}}});
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {}); const onDeleted = jest.fn(); let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {renderer = Renderer.create(<DeleteProjectButton userRole="Manager" projectId="p" projectName="Project" onDeleted={onDeleted} />);});
  await Renderer.act(async () => {renderer.root.findByType(TouchableOpacity).props.onPress({});});
  await Renderer.act(async () => {alert.mock.calls[0][2]!.find(button => button.text === 'Delete')!.onPress!();});
  expect(onDeleted).not.toHaveBeenCalled(); expect(alert).toHaveBeenLastCalledWith('Could not delete project', 'Project has report links'); alert.mockRestore();
});
