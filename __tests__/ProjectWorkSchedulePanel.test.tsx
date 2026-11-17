import React from 'react';
import Renderer from 'react-test-renderer';
import {TextInput, TouchableOpacity} from 'react-native';
import {getProjectWorkSchedule, saveProjectWorkSchedule} from '../src/api/projects';
import ProjectDateField from '../src/components/ProjectDateField';
import ProjectWorkSchedulePanel from '../src/components/ProjectWorkSchedulePanel';

jest.mock('../src/api/projects', () => ({getProjectWorkSchedule: jest.fn(), saveProjectWorkSchedule: jest.fn()}));
const textOf = (node: Renderer.ReactTestInstance): string => node.children.map(child => typeof child === 'string' ? child : textOf(child)).join('');

test('a forecast after Target Date requires a reason before saving', async () => {
  (getProjectWorkSchedule as jest.Mock).mockResolvedValue({data: {
    targetDate: '2026-12-10', today: '2026-12-01', summary: {status: 'On Track', delayDays: 0}, reasonRequired: false, history: [],
  }});
  (saveProjectWorkSchedule as jest.Mock).mockResolvedValue({});
  let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {
    renderer = Renderer.create(<ProjectWorkSchedulePanel editable projectId="project-1" projectName="Resolute" />);
  });
  const date = (label: string, value: string) => renderer.root.findAllByType(ProjectDateField).find(input => input.props.label === label)!.props.onChange(value);
  const press = (label: string) => renderer.root.findAllByType(TouchableOpacity).find(button => textOf(button) === label)!.props.onPress();
  await Renderer.act(async () => {date('Work Start Date', '2026-12-02');});
  await Renderer.act(async () => {date('Expected Work End Date', '2026-12-13');});
  expect(textOf(renderer.root)).toContain('Number of Calendar Days Delayed: 3');
  await Renderer.act(async () => {press('Submit Delay Reason');});
  expect(textOf(renderer.root)).toContain('Delay Reason is required.');
  expect(saveProjectWorkSchedule).not.toHaveBeenCalled();
  await Renderer.act(async () => {renderer.root.findByType(TextInput).props.onChangeText('  Delayed vessel access  ');});
  await Renderer.act(async () => {press('Submit Delay Reason');});
  expect(saveProjectWorkSchedule).toHaveBeenCalledWith('project-1', {
    requestId: expect.any(String), workStartDate: '2026-12-02', expectedWorkEndDate: '2026-12-13', delayReason: 'Delayed vessel access',
  });
  await Renderer.act(async () => renderer.unmount());
});

test('saved server summaries immediately replace 10-day, 5-day and on-track indicators', async () => {
  const state = (delay: number) => ({targetDate:'2026-12-20',today:'2026-12-01',summary:{status:delay ? 'Delay Expected' : 'On Track',delayDays:delay,expectedCompletion:delay ? `2026-12-${20+delay}` : '2026-12-20',latestDelayReason:delay ? 'Access delay' : null},mine:{workStartDate:'2026-12-01',expectedWorkEndDate:`2026-12-${20+delay}`,delayReason:delay ? 'Access delay' : null},reasonRequired:false,history:[]});
  (getProjectWorkSchedule as jest.Mock).mockResolvedValue({data:state(10)});
  (saveProjectWorkSchedule as jest.Mock).mockResolvedValueOnce({data:state(5)}).mockResolvedValueOnce({data:state(0)});
  let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async()=>{renderer=Renderer.create(<ProjectWorkSchedulePanel editable projectId="p" projectName="Project"/>);});
  const end=(date:string)=>renderer.root.findAllByType(ProjectDateField).find(n=>n.props.label==='Expected Work End Date')!.props.onChange(date);
  const press=(label:string)=>renderer.root.findAllByType(TouchableOpacity).find(n=>textOf(n)===label)!.props.onPress();
  expect(textOf(renderer.root)).toContain('Delay Expected · 10 calendar days');
  await Renderer.act(async()=>end('2026-12-25'));
  await Renderer.act(async()=>press('Submit Delay Reason'));
  expect(textOf(renderer.root)).toContain('Delay Expected · 5 calendar days');
  await Renderer.act(async()=>end('2026-12-20'));
  await Renderer.act(async()=>press('Save Work Schedule'));
  expect(textOf(renderer.root)).toContain('On Track');
  expect(textOf(renderer.root)).not.toContain('calendar days');
  expect(textOf(renderer.root)).not.toContain('Latest delay reason');
  await Renderer.act(async()=>renderer.unmount());
});
