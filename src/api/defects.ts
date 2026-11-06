import apiClient from './client';
import type {InspectionPhotoFile} from './projects';

export type DefectSummary = {openCount: number; high: number; medium: number; low: number; unspecified: number};
export type Defect = {
  id: string; inspectionId: string | null; projectId: string; projectName: string; areaName: string;
  tagNumber: string; observation: string; recommendation?: string | null;
  severity: string; status: string; reportedBy: string;
  inspectionDate: string; inspectionDueDate?: string | null;
  equipmentId: string; itemNumber?: string; equipmentDescription?: string; grade?: string; registerDate?: string;
  aosdId?: string; faultCategory?: string; faultCode?: string; remarks?: string; additionalRemarks?: string; canEdit?: boolean;
  photos: {id: string; fileName: string; downloadUrl: string; slot?: string}[];
};
export type DefectsResponse = {summary: DefectSummary; items: Defect[]};
export const getDefects = (openOnly = true, projectId?: string) => apiClient.get<DefectsResponse>('/defects', {params: {openOnly, projectId}});

export type RegisterProject = {id: string; name: string; clientName?: string | null};
export type RegisterEquipment = {id: string; tagNumber: string; itemNumber?: string; description: string; area: string};
export type DefectInput = {equipmentId: string; date: string; grade: string; aosdId: string; faultCategory: string; faultCode: string;
  observation: string; recommendation: string; remarks: string; additionalRemarks: string};
export const getRegisterProjects = () => apiClient.get<RegisterProject[]>('/defects/register/projects');
export const getRegisterEquipment = (projectId: string) =>
  apiClient.get<RegisterEquipment[]>(`/defects/register/projects/${projectId}/equipment`);
export const saveDefect = (projectId: string, id: string, data: DefectInput) =>
  apiClient.put(`/defects/register/projects/${projectId}/${id}`, data);
export const saveDefectPhoto = (id: string, slot: number, photo: InspectionPhotoFile | null) => {
  const path = `/defects/register/${id}/photos/${slot}`;
  if (!photo) return apiClient.delete(path);
  const form = new FormData();
  if (photo.webFile) form.append('photo', photo.webFile);
  else form.append('photo', {uri: photo.uri, type: photo.type || 'image/jpeg', name: photo.fileName || photo.name || 'defect.jpg'} as any);
  return apiClient.put(path, form);
};
