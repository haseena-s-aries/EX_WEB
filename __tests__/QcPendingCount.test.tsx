import React from 'react';
import Renderer from 'react-test-renderer';
import {Text} from 'react-native';
import apiClient from '../src/api/client';
import {getQcDashboard} from '../src/api/projects';
import useQcPendingCount from '../src/hooks/useQcPendingCount';

jest.mock('../src/api/projects', () => ({getQcDashboard: jest.fn()}));
jest.mock('../src/api/client', () => ({__esModule: true, default: {interceptors: {response: {use: jest.fn(), eject: jest.fn()}}}}));
let listener: (response: any) => any;
let renderer: Renderer.ReactTestRenderer;
const manager = {role: 'Manager'};
function Probe({user = manager, screen = 'Dashboard'}: {user?: {role: string} | null; screen?: string}) {
  return <Text>{useQcPendingCount(user, screen)}</Text>;
}
const count = () => renderer.root.findByType(Text).props.children;
beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks();
  (getQcDashboard as jest.Mock).mockResolvedValue({data: {awaitingQcReview: 3, approved: 20, changesRequested: 5}});
  (apiClient.interceptors.response.use as jest.Mock).mockImplementation(callback => {listener = callback; return 7;});
});
afterEach(async () => {
  await Renderer.act(async () => {renderer?.unmount();});
  jest.useRealTimers();
});
test('Loads the backend inspection count on login, refreshes on navigation and polls new submissions', async () => {
  await Renderer.act(async () => {renderer = Renderer.create(<Probe user={null} />);});
  expect(getQcDashboard).not.toHaveBeenCalled();
  await Renderer.act(async () => {renderer.update(<Probe />);});
  expect(count()).toBe(3);
  (getQcDashboard as jest.Mock).mockResolvedValue({data: {awaitingQcReview: 4}});
  await Renderer.act(async () => {jest.advanceTimersByTime(30000);});
  expect(count()).toBe(4);
  (getQcDashboard as jest.Mock).mockResolvedValue({data: {awaitingQcReview: 2}});
  await Renderer.act(async () => {renderer.update(<Probe screen="QcPending" />);});
  expect(count()).toBe(2);
});
test.each(['start-review', 'approve', 'request-changes'])('%s automatically refetches the source count', async action => {
  await Renderer.act(async () => {renderer = Renderer.create(<Probe />);});
  (getQcDashboard as jest.Mock).mockResolvedValue({data: {awaitingQcReview: 2}});
  const response = {config: {method: 'post', url: `/qc/inspections/i/${action}`}, data: {}};
  await Renderer.act(async () => {expect(listener(response)).toBe(response);});
  expect(count()).toBe(2);
});
test('Uses a dashboard Refresh response directly, and refreshes after Surveyor resubmission', async () => {
  await Renderer.act(async () => {renderer = Renderer.create(<Probe />);});
  await Renderer.act(async () => {listener({config: {method: 'get', url: '/qc/dashboard'}, data: {awaitingQcReview: 0, approved: 99}});});
  expect(count()).toBe(0);
  (getQcDashboard as jest.Mock).mockResolvedValue({data: {awaitingQcReview: 1}});
  await Renderer.act(async () => {listener({config: {method: 'put', url: '/surveyor/inspections/i'}, data: {}});});
  expect(count()).toBe(1);
});
test('Ignores late responses after logout and removes timers and interceptors', async () => {
  let resolve!: (value: any) => void;
  (getQcDashboard as jest.Mock).mockReturnValue(new Promise(done => {resolve = done;}));
  await Renderer.act(async () => {renderer = Renderer.create(<Probe />);});
  await Renderer.act(async () => {renderer.update(<Probe user={null} />); resolve({data: {awaitingQcReview: 50}});});
  expect(count()).toBe(0);
  expect(apiClient.interceptors.response.eject).toHaveBeenCalledWith(7);
  await Renderer.act(async () => {jest.advanceTimersByTime(30000);});
  expect(getQcDashboard).toHaveBeenCalledTimes(1);
});
test.each(['Surveyor', 'Client'])('%s does not call the QC dashboard', async role => {
  await Renderer.act(async () => {renderer = Renderer.create(<Probe user={{role}} />);});
  expect(getQcDashboard).not.toHaveBeenCalled();
  expect(count()).toBe(0);
});
