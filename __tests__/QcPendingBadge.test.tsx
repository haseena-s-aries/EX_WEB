import React from 'react';
import Renderer from 'react-test-renderer';
import {Text, TouchableOpacity} from 'react-native';
import Sidebar from '../src/components/Sidebar';
import QcPendingBadge from '../src/components/QcPendingBadge';

const textOf = (node: Renderer.ReactTestInstance): string => node.children.map(child => typeof child === 'string' ? child : textOf(child)).join('');
test.each(['Qc', 'Manager', 'Admin'])('%s sidebar places only the positive pending count beside QC Pending', async userRole => {
  let renderer!: Renderer.ReactTestRenderer;
  const props = {active: 'QcPending', userName: 'User', userRole, onNavigate: jest.fn(), onLogout: jest.fn()};
  await Renderer.act(async () => {renderer = Renderer.create(<Sidebar {...props} qcPendingCount={3} />);});
  const item = renderer.root.findAllByType(TouchableOpacity).find(node => textOf(node).startsWith('▤QC Pending'))!;
  expect(textOf(item)).toBe('▤QC PendingAwaiting review3');
  await Renderer.act(async () => {renderer.update(<Sidebar {...props} qcPendingCount={0} />);});
  expect(renderer.root.findByType(QcPendingBadge).findAllByType(Text)).toHaveLength(0);
  await Renderer.act(async () => {renderer.unmount();});
});
test.each(['Surveyor', 'Client'])('%s cannot see QC Pending or its badge', async userRole => {
  let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {renderer = Renderer.create(<Sidebar active="Dashboard" userName="User" userRole={userRole} onNavigate={jest.fn()} onLogout={jest.fn()} qcPendingCount={3} />);});
  expect(textOf(renderer.root)).not.toContain('QC Pending');
  expect(renderer.root.findAllByType(QcPendingBadge)).toHaveLength(0);
  await Renderer.act(async () => {renderer.unmount();});
});
test('Pending badge shows a positive count and hides at zero', async () => {
  let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {renderer = Renderer.create(<QcPendingBadge count={2} />);});
  expect(textOf(renderer.root)).toBe('2');
  await Renderer.act(async () => {renderer.update(<QcPendingBadge count={0} />);});
  expect(renderer.root.findAllByType(Text)).toHaveLength(0);
  await Renderer.act(async () => {renderer.unmount();});
});
