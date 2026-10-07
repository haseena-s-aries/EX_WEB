import React from 'react';
import Renderer from 'react-test-renderer';
import {TouchableOpacity} from 'react-native';
import DashboardScreen from '../src/screens/DashboardScreen';
import DefectsModal from '../src/components/DefectsModal';
import {getDefects} from '../src/api/defects';
import {LIGHT} from '../src/theme/palette';

jest.mock('../src/api/defects', () => ({getDefects: jest.fn()}));
jest.mock('../src/api/projects', () => ({getProjects: jest.fn().mockResolvedValue({data: []})}));
jest.mock('../src/api/adminEquipment', () => ({loadAllEquipment: jest.fn().mockResolvedValue([]), inspectionKey: (value: string) => value}));
jest.mock('../src/components/NewProjectModal', () => 'NewProjectModal');
jest.mock('../src/components/ProjectDetailModal', () => 'ProjectDetailModal');
jest.mock('../src/components/ThemeToggle', () => 'ThemeToggle');
jest.mock('../src/components/ProgressRing', () => 'ProgressRing');
jest.mock('../src/components/ZoomableImageViewer', () => 'PhotoViewer');
jest.mock('../src/theme/useThemeMode', () => ({useThemeMode: () => 'light'}));
const textOf = (node: Renderer.ReactTestInstance): string => node.children.map(child => typeof child === 'string' ? child : textOf(child)).join('');
const summary = {openCount: 5, high: 2, medium: 2, low: 1, unspecified: 0};
const finding = {id: 'f1', inspectionId: 'i1', projectId: 'p1', projectName: 'PROJECT', areaName: 'Deck', tagNumber: 'TAG-1', observation: 'Damaged cable', recommendation: 'Replace cable', severity: 'High', status: 'Open', reportedBy: 'Surveyor', inspectionDate: '2026-10-07T10:00:00Z', photos: [{id: 'photo', fileName: 'defect.jpg', downloadUrl: '/api/defects/f1/photos/photo'}]};
let renderer: Renderer.ReactTestRenderer;
beforeEach(() => {(getDefects as jest.Mock).mockReset().mockResolvedValue({data: {summary, items: [finding]}});});
afterEach(async () => {await Renderer.act(async () => {renderer?.unmount();});});
async function press(text: string) {await Renderer.act(async () => {renderer.root.findAllByType(TouchableOpacity).find(node => textOf(node) === text)!.props.onPress();});}
test('Card uses backend open count, shows severity and opens scoped defects', async () => {
  await Renderer.act(async () => {renderer = Renderer.create(<DashboardScreen userName="Manager" userRole="Manager" />);});
  const card = renderer.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === 'View flagged defects')!;
  expect(textOf(card)).toContain('Defects Flagged5');
  expect(textOf(card)).toContain('2 High · 2 Medium · 1 Low');
  await Renderer.act(async () => {card.props.onPress();});
  expect(renderer.root.findByType(DefectsModal)).toBeDefined();
  expect(textOf(renderer.root)).toContain('Damaged cable');
});
test('Zero defects displays No open defects', async () => {
  (getDefects as jest.Mock).mockResolvedValue({data: {summary: {...summary, openCount: 0}, items: []}});
  await Renderer.act(async () => {renderer = Renderer.create(<DashboardScreen userName="Manager" />);});
  expect(textOf(renderer.root)).toContain('No open defects');
});
test('List shows findings, opens original photos lazily and refreshes resolved count', async () => {
  const onSummary = jest.fn();
  await Renderer.act(async () => {renderer = Renderer.create(<DefectsModal c={LIGHT} onClose={jest.fn()} onSummary={onSummary} />);});
  expect(getDefects).toHaveBeenCalledWith(true);
  expect(textOf(renderer.root)).toContain('PROJECT · Deck · TAG-1');
  expect(textOf(renderer.root)).toContain('Reported by: Surveyor');
  expect(renderer.root.findAllByType('PhotoViewer' as any)).toHaveLength(0);
  await press('View Photos (1)');
  expect(renderer.root.findByType('PhotoViewer' as any).props.images).toEqual(['/api/defects/f1/photos/photo']);
  await Renderer.act(async () => {renderer.root.findByType('PhotoViewer' as any).props.onClose();});
  await press('All Defects');
  expect(getDefects).toHaveBeenLastCalledWith(false);
  (getDefects as jest.Mock).mockResolvedValue({data: {summary: {...summary, openCount: 4}, items: [{...finding, status: 'Verified'}]}});
  await press('Refresh');
  expect(onSummary).toHaveBeenLastCalledWith(expect.objectContaining({openCount: 4}));
  expect(textOf(renderer.root)).toContain('Verified');
});
test('Load failures are shown as errors rather than a false zero', async () => {
  (getDefects as jest.Mock).mockRejectedValue(new Error('Offline'));
  await Renderer.act(async () => {renderer = Renderer.create(<DashboardScreen userName="Manager" />);});
  expect(textOf(renderer.root)).toContain('Unable to load · Tap to retry');
  expect(textOf(renderer.root)).not.toContain('No open defects');
});
