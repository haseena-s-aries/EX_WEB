import apiClient from '../api/client';
import {ReportDocumentDetails, reportPdfPath} from '../api/reports';
import {GeneratedReport, pdfTimeoutMs, reportPdfError} from './types';

async function fetchPdf(path: string, fileName: string, details?: ReportDocumentDetails): Promise<GeneratedReport> {
  const config = {responseType: 'blob' as const, timeout: pdfTimeoutMs};
  let blob: Blob;
  try {
    const response = details ? await apiClient.post<Blob>(path, details, config) : await apiClient.get<Blob>(path, config);
    blob = response.data;
  } catch (error: any) {
    const body = error.response?.data;
    const text = typeof body?.text === 'function' ? await body.text().catch(() => undefined) : undefined;
    throw reportPdfError(error.response?.status, text,
      error.code === 'ECONNABORTED' ? 'The PDF request timed out. Check Report History before retrying.' : 'Could not retrieve the PDF. Check your connection and try again.');
  }
  if (blob?.type?.split(';')[0].trim().toLowerCase() !== 'application/pdf' || await blob.slice(0, 5).text() !== '%PDF-') {
    throw new Error('The server did not return a valid PDF.');
  }
  const uri = URL.createObjectURL(blob);
  return {uri, fileName, dispose: () => URL.revokeObjectURL(uri)};
}

export const previewReportPdf = (id: string, fileName: string) => fetchPdf(`${reportPdfPath(id)}/preview`, fileName);
export const generateReportPdf = (id: string, fileName: string, details?: ReportDocumentDetails) => fetchPdf(reportPdfPath(id), fileName, details);
export async function downloadReportPdf(report: GeneratedReport) {
  const browser = globalThis as any;
  const link = browser.document.createElement('a');
  link.href = report.uri; link.download = report.fileName;
  browser.document.body.appendChild(link); link.click(); link.remove();
}
