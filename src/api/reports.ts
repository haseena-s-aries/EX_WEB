import apiClient from './client';

export type ReportProject = {id: string; projectName: string; jobNumber: string; location: string; status: string};
export type ReportData = {
  projectId: string; projectName: string; jobNumber: string; siteName: string; location: string;
  client: string; preparedBy: string; checkedBy: string; approvedBy: string;
  hazardousAreaPlan?: {url: string} | null;
  areas: Array<{name: string; layout?: {url: string} | null; equipment: Array<{sequenceNo: number; tagNumber: string; type: string; inspections: Array<{status: string; inspector: string; answers: unknown[]; photos: unknown[]; findings: unknown[]}>}>}>;
};
export const getReportProjects = () => apiClient.get<ReportProject[]>('/reports/projects');
export const getProjectReport = (id: string) => apiClient.get<ReportData>(`/reports/projects/${id}`);
export const reportPdfPath = (id: string) => `/reports/projects/${id}/pdf`;
