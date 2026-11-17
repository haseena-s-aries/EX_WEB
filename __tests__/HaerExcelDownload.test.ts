import apiClient from '../src/api/client';
import {downloadHaerExcel} from '../src/api/reports';

jest.mock('../src/api/client', () => ({__esModule: true, default: {get: jest.fn()}}));
jest.mock('react-native', () => ({Platform: {OS: 'web'}}));
jest.mock('react-native-blob-util', () => ({}));

test('Rejects an older XML Excel response instead of saving it with an XLSX extension', async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({data: {
    slice: () => ({arrayBuffer: async () => new Uint8Array([0xef, 0xbb, 0xbf, 0x3c]).buffer}),
  }});
  await expect(downloadHaerExcel('project-id', 'DSSS')).rejects.toThrow('Rebuild and restart the backend');
});

test('Downloads the genuine XLSX response without changing its bytes', async () => {
  const data = {slice: () => ({arrayBuffer: async () => new Uint8Array([0x50, 0x4b, 3, 4]).buffer})};
  (apiClient.get as jest.Mock).mockResolvedValue({data});
  const anchor = {click: jest.fn(), href: '', download: ''};
  const previousDocument = (globalThis as any).document;
  const previousUrl = (globalThis as any).URL;
  const createObjectURL = jest.fn(() => 'blob:test');
  (globalThis as any).document = {createElement: () => anchor};
  (globalThis as any).URL = {createObjectURL, revokeObjectURL: jest.fn()};
  try {
    await downloadHaerExcel('project-id', 'DSSS');
    expect(createObjectURL).toHaveBeenCalledWith(data);
    expect(anchor.download).toBe('DSSS_HAER.xlsx');
    expect(anchor.click).toHaveBeenCalledTimes(1);
  } finally {
    (globalThis as any).document = previousDocument;
    (globalThis as any).URL = previousUrl;
  }
});
