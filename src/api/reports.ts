import apiClient from './client';
import {Company} from './companies';

export type ReportProject = {id: string; projectName: string; jobNumber: string; location: string; status: string};
export type ReportData = {
  ourCompany?: Company | null; ourCompanyLogo?: {url: string} | null;
  projectId: string; projectName: string; jobNumber: string; siteName: string; location: string;
  client: string; preparedBy: string; checkedBy: string; approvedBy: string;
  uidNumber?: string | null; documentNumber?: string | null; revision?: string | null; description?: string | null; clientName?: string | null; clientLogo?: {url: string} | null;
  hazardousAreaPlan?: {url: string} | null;
  areas: Array<{name: string; layout?: {url: string} | null; equipment: Array<{sequenceNo: number; tagNumber: string; rfidTagUid?: string | null; type: string; inspections: Array<{status: string; inspector: string; answers: unknown[]; photos: unknown[]; findings: unknown[]}>}>}>;
};
export const getReportProjects = () => apiClient.get<ReportProject[]>('/reports/projects');
export const getProjectReport = (id: string) => apiClient.get<ReportData>(`/reports/projects/${id}`);
export const reportPdfPath = (id: string) => `/reports/projects/${id}/pdf`;
