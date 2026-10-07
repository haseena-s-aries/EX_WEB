import apiClient from './client';

export type DefectSummary = {openCount: number; high: number; medium: number; low: number; unspecified: number};
export type Defect = {
  id: string; inspectionId: string; projectId: string; projectName: string; areaName: string;
  tagNumber: string; observation: string; recommendation?: string | null;
  severity: string; status: string; reportedBy: string;
  inspectionDate: string; inspectionDueDate?: string | null;
  photos: {id: string; fileName: string; downloadUrl: string}[];
};
export type DefectsResponse = {summary: DefectSummary; items: Defect[]};
export const getDefects = (openOnly = true) => apiClient.get<DefectsResponse>('/defects', {params: {openOnly}});
