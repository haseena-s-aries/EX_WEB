import apiClient from '../src/api/client';
import {generateReportPdf, previewReportPdf} from '../src/reports/pdfFile.web';

jest.mock('../src/api/client', () => ({get: jest.fn(), post: jest.fn()}));
jest.mock('react-native-blob-util', () => ({}));

afterEach(() => jest.clearAllMocks());

test('Surveyor generation exposes the server validation message from a Blob response', async () => {
  (apiClient.post as jest.Mock).mockRejectedValue({
    response: {
      status: 400,
      data: {text: async () => JSON.stringify({errors: {Revision: ['Revision is required.']}})},
    },
  });
  const details = {uidNumber: 'UID-1', documentNumber: 'DOC-1', revision: ''};
  await expect(generateReportPdf('p1', 'report.pdf', details)).rejects.toThrow('Revision is required.');
  expect(apiClient.post).toHaveBeenCalledWith('/reports/projects/p1/pdf', details, expect.objectContaining({responseType: 'blob'}));
});

test('Preview rejects a successful response that does not contain PDF bytes', async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({
    data: {type: 'application/pdf', slice: () => ({text: async () => '<html'})},
  });
  await expect(previewReportPdf('p1', 'report.pdf')).rejects.toThrow('The server did not return a valid PDF.');
  expect(apiClient.get).toHaveBeenCalledWith('/reports/projects/p1/pdf/preview', expect.objectContaining({responseType: 'blob'}));
  expect(apiClient.post).not.toHaveBeenCalled();
});
