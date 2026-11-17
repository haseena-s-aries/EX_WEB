import React from 'react';
import Renderer, {act} from 'react-test-renderer';
import {TextInput, TouchableOpacity} from 'react-native';
import QcReviewRecords from '../src/components/QcReviewRecords';
import SearchableOptionPicker from '../src/components/SearchableOptionPicker';
import {getManagerQcRecords, ManagerQcRecord} from '../src/api/managerQc';
jest.mock('../src/api/managerQc', () => ({getManagerQcRecords: jest.fn()}));
const text = (n: Renderer.ReactTestInstance): string => n.children.map(v => typeof v === 'string' ? v : text(v)).join('');
const project: any = {projectId: 'p1', projectName: 'Ship', jobNo: 'JOB1', assignedQc: 'Morgan', counts: {}};
const record = (id: string, reviewed: boolean): ManagerQcRecord => ({projectId: 'p1', areaId: 'a1', areaName: 'Deck', areaTotalEquipment: 5,
  itemNumber: id, equipmentName: 'Motor', description: 'Saved description', rfidTagUid: 'ABCD', inspectionDate: '2026-11-01T12:00:00Z',
  inspectionType: 'Visual', inspectorName: 'Alex', submittedAt: '2026-11-01T12:00:00Z', hasReview: reviewed, lastQcActivity: null,
  equipment: {equipmentId: 'e1', inspectionId: id, sequenceNo: 1, tagNumber: `TAG-${id}`, type: 'Motor', inspectionStatus: 'Completed',
    qcReviewStatus: reviewed ? 'Approved' : 'PendingReview', qcComments: reviewed ? 'Retest passed' : null, severity: null,
    reviewedBy: reviewed ? 'Morgan' : null, reviewStartedAt: null, reviewedAt: null}} as ManagerQcRecord);

test('shows distinct reviewed inspections, excludes submission-only records, filters and opens exact historical inspection', async () => {
  const one = record('OLD', true), two = record('NEW', true), pending = record('PENDING', false);
  (getManagerQcRecords as jest.Mock).mockResolvedValue({data: [one, two, one, pending]});
  const open = jest.fn(); let ui!: Renderer.ReactTestRenderer;
  await act(async () => {ui = Renderer.create(<QcReviewRecords projects={[project]} version={0} onProject={jest.fn()} onSelection={jest.fn()} onInspection={open} />);});
  expect(text(ui.root)).toContain('2 inspection records'); expect(text(ui.root)).not.toContain('TAG-PENDING');
  const click = async (label: string) => act(async () => {ui.root.findAllByType(TouchableOpacity).find(b => text(b) === label)!.props.onPress();});
  await click('View Review Details'); expect(open).toHaveBeenCalledWith(one);
  await act(async () => {ui.root.findByProps({accessibilityLabel: 'Search review records'}).props.onChangeText('TAG-NEW');});
  expect(text(ui.root)).toContain('1 inspection records'); expect(text(ui.root)).not.toContain('TAG-OLD');
  await click('Reset filters'); await click('Area View');
  expect(text(ui.root)).toContain('5 total equipment'); expect(text(ui.root)).toContain('3 submitted');
  await click('▾ Deck'); expect(text(ui.root)).not.toContain('TAG-OLD');
  await act(async () => {ui.root.findAllByType(SearchableOptionPicker).find(p => p.props.label === 'Workflow records')!.props.onChange('');});
  expect(text(ui.root)).toContain('3 inspection records');
  await act(async () => ui.unmount());
});

test('paginates and sorts records, applies reviewer and date filters, and handles load failures without stale records', async () => {
  (getManagerQcRecords as jest.Mock).mockResolvedValue({data: Array.from({length: 12}, (_, i) => record(`ITEM${i}`, true))});
  let ui!: Renderer.ReactTestRenderer;
  await act(async () => {ui = Renderer.create(<QcReviewRecords projects={[project]} version={0} onProject={jest.fn()} onSelection={jest.fn()} onInspection={jest.fn()} />);});
  const pick = async (label: string, v: string) => act(async () => {ui.root.findAllByType(SearchableOptionPicker).find(p => p.props.label === label)!.props.onChange(v);});
  expect(text(ui.root)).toContain('Page 1 of 2');
  await act(async () => {ui.root.findAllByType(TouchableOpacity).find(b => text(b) === 'Next')!.props.onPress();});
  expect(text(ui.root)).toContain('Page 2 of 2');
  await pick('Sort records', 'item'); expect(text(ui.root)).toContain('Page 1 of 2');
  await pick('QC Reviewer', 'Other'); expect(text(ui.root)).toContain('No inspection reviews match');
  await pick('QC Reviewer', 'Morgan');
  await act(async () => {ui.root.findAllByType(TextInput).find(p => p.props.accessibilityLabel === 'from inspection date')!.props.onChangeText('2026-11-02');});
  expect(text(ui.root)).toContain('0 inspection records');
  (getManagerQcRecords as jest.Mock).mockRejectedValue(new Error('offline'));
  await act(async () => {ui.update(<QcReviewRecords projects={[project]} version={1} onProject={jest.fn()} onSelection={jest.fn()} onInspection={jest.fn()} />);});
  expect(text(ui.root)).toContain('Retry records');
  await act(async () => ui.unmount());
});
