import apiClient from '../api/client';
import {reportPdfPath} from '../api/reports';
import {GeneratedReport} from './types';

export async function generateReportPdf(id: string, fileName: string): Promise<GeneratedReport> {
  const response = await apiClient.get(reportPdfPath(id), {responseType: 'blob'});
  const browser = globalThis as any;
  const uri = browser.URL.createObjectURL(response.data);
  return {uri, fileName, dispose: () => browser.URL.revokeObjectURL(uri)};
}
export async function downloadReportPdf(report: GeneratedReport) {
  const browser = globalThis as any;
  const link = browser.document.createElement('a');
  link.href = report.uri; link.download = report.fileName;
  browser.document.body.appendChild(link); link.click(); link.remove();
}
