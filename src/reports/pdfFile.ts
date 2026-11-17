import {Platform} from 'react-native';
import BlobUtil from 'react-native-blob-util';
import {getApiResourceUrl, getAuthToken} from '../api/client';
import {ReportDocumentDetails, reportPdfPath} from '../api/reports';
import {GeneratedReport, pdfTimeoutMs, reportPdfError} from './types';

async function fetchPdf(endpoint: string, fileName: string, details?: ReportDocumentDetails): Promise<GeneratedReport> {
  const path = `${BlobUtil.fs.dirs.CacheDir}/ex-survey-${Date.now()}.pdf`;
  const request = BlobUtil.config({path, timeout: pdfTimeoutMs});
  const url = getApiResourceUrl(endpoint);
  const headers = {Authorization: `Bearer ${getAuthToken()}`};
  try {
    const response = details
      ? await request.fetch('POST', url, {...headers, 'Content-Type': 'application/json'}, JSON.stringify(details))
      : await request.fetch('GET', url, headers);
    const info = response.info();
    if (info.status !== 200) {
      const body = await BlobUtil.fs.readFile(path, 'utf8').catch(() => undefined);
      throw reportPdfError(info.status, body, 'Could not retrieve the PDF. Please try again.');
    }
    const contentType = Object.entries(info.headers || {}).find(([key]) => key.toLowerCase() === 'content-type')?.[1];
    if (typeof contentType !== 'string' || contentType.split(';')[0].trim().toLowerCase() !== 'application/pdf') {
      throw new Error('The server did not return a PDF.');
    }
  } catch (error) {
    await BlobUtil.fs.unlink(path).catch(() => undefined);
    throw error;
  }
  return {uri: path, fileName, dispose: () => {void BlobUtil.fs.unlink(path).catch(() => undefined);}};
}
export const previewReportPdf = (id: string, fileName: string) => fetchPdf(`${reportPdfPath(id)}/preview`, fileName);
export const generateReportPdf = (id: string, fileName: string, details?: ReportDocumentDetails) => fetchPdf(reportPdfPath(id), fileName, details);
export async function downloadReportPdf(report: GeneratedReport) {
  if (Platform.OS === 'android') await BlobUtil.MediaCollection.copyToMediaStore({name: report.fileName, parentFolder: 'Ex-Survey', mimeType: 'application/pdf'}, 'Download', report.uri);
  else BlobUtil.ios.previewDocument(report.uri);
}
