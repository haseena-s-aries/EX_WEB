import {getApiErrorMessage} from '../api/errors';

export type GeneratedReport = {uri: string; fileName: string; dispose: () => void};
export type ReportPdfPreviewProps = {
  report: GeneratedReport;
  projectName?: string;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onDownload?: () => void;
  onGenerate?: () => void;
};
export const reportFileName = (job: string) => `${job.replace(/[^a-z0-9_-]/gi, '') || 'project'}_Explosion_Proof_Survey_Report.pdf`;

export const pdfTimeoutMs = 120_000;

export function reportPdfError(status: number | undefined, body: string | undefined, fallback: string) {
  let data;
  try {data = body ? JSON.parse(body) : undefined;} catch { /* Ignore non-JSON error pages. */ }
  if (status === 404) return new Error('This project report is unavailable. Refresh the project list and try again.');
  const message = getApiErrorMessage({response: {status, data}}, '');
  return new Error(message || (typeof data?.detail === 'string' && data.detail) || fallback);
}
