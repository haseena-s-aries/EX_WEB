import {Platform} from 'react-native';
import BlobUtil from 'react-native-blob-util';
import {getApiResourceUrl, getAuthToken} from '../api/client';
import {reportPdfPath} from '../api/reports';
import {GeneratedReport} from './types';

export async function generateReportPdf(id: string, fileName: string): Promise<GeneratedReport> {
  const path = `${BlobUtil.fs.dirs.CacheDir}/ex-survey-${Date.now()}.pdf`;
  const response = await BlobUtil.config({path}).fetch('GET', getApiResourceUrl(reportPdfPath(id)), {Authorization: `Bearer ${getAuthToken()}`});
  if (response.info().status !== 200) {await BlobUtil.fs.unlink(path).catch(() => undefined); throw new Error('Could not generate the PDF. Please try again.');}
  return {uri: path, fileName, dispose: () => {void BlobUtil.fs.unlink(path).catch(() => undefined);}};
}
export async function downloadReportPdf(report: GeneratedReport) {
  if (Platform.OS === 'android') await BlobUtil.MediaCollection.copyToMediaStore({name: report.fileName, parentFolder: 'Ex-Survey', mimeType: 'application/pdf'}, 'Download', report.uri);
  else BlobUtil.ios.previewDocument(report.uri);
}
