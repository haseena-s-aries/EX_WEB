import apiClient from './client';
import {EquipmentInspectionStatus, ProjectStatus, QcEquipmentInspection, QcReviewStatus, QcSeverity} from './projects';

export type ManagerQcCounts = {awaitingQcReview: number; inReview: number; changesRequested: number; approved: number; overdue: number};
export type ManagerQcProject = {
  projectId: string; projectName: string; jobNo: string; location: string; surveyorName: string;
  assignedQc: string; managerId: string | null; managerName: string | null;
  projectStatus: ProjectStatus; qcReviewStatus: QcReviewStatus; totalEquipment: number;
  counts: ManagerQcCounts; lastQcActivity: string | null;
};
export type ManagerQcArea = {areaId: string; areaName: string; totalEquipment: number; counts: ManagerQcCounts};
export type ManagerQcProjectDetails = {project: ManagerQcProject; areas: ManagerQcArea[]};
export type ManagerQcEquipment = {
  equipmentId: string; inspectionId: string | null; sequenceNo: number; tagNumber: string; type: string;
  inspectionStatus: EquipmentInspectionStatus; qcReviewStatus: QcReviewStatus | null; qcComments: string | null;
  severity: QcSeverity | null; reviewedBy: string | null; reviewStartedAt: string | null; reviewedAt: string | null;
};
export type ManagerQcAreaDetails = {areaId: string; areaName: string; counts: ManagerQcCounts; equipment: ManagerQcEquipment[]};
export type ManagerQcHistory = {
  id: string; action: string; occurredAt: string; actorName: string | null; comments: string | null;
  severity: QcSeverity | null; qcStatus: QcReviewStatus | null; reviewStartedAt: string | null; reviewedAt: string | null;
};
export type ManagerQcInspection = {equipment: ManagerQcEquipment; inspection: QcEquipmentInspection | null; history: ManagerQcHistory[];
  inspectionType?: string | null; equipmentName?: string | null; description?: string | null;
  itemNumber?: string | null; areaName?: string | null; rfidTagUid?: string | null};
export type ReportingManager = {id: string; displayName: string};
const root = '/manager/qc-review';
export const getManagerQcDashboard = () => apiClient.get<ManagerQcCounts>(`${root}/dashboard`);
export const getManagerQcProjects = () => apiClient.get<ManagerQcProject[]>(`${root}/projects`);
export const getManagerQcProject = (id: string) => apiClient.get<ManagerQcProjectDetails>(`${root}/projects/${id}`);
export const getManagerQcArea = (projectId: string, areaId: string) => apiClient.get<ManagerQcAreaDetails>(`${root}/projects/${projectId}/areas/${areaId}`);
export const getManagerQcEquipment = (id: string, inspectionId?: string) => apiClient.get<ManagerQcInspection>(`${root}/equipment/${id}`, inspectionId ? {params: {inspectionId}} : undefined);
export type ManagerQcRecord = {
  projectId: string; areaId: string; areaName: string; areaTotalEquipment: number; equipment: ManagerQcEquipment;
  itemNumber: string | null; equipmentName: string | null; description: string | null; rfidTagUid: string | null;
  inspectionDate: string | null; inspectionType: string | null; inspectorName: string | null;
  submittedAt: string | null; hasReview: boolean; lastQcActivity: string | null;
};
export const getManagerQcRecords = (projectId: string) => apiClient.get<ManagerQcRecord[]>(`${root}/projects/${projectId}/records`);
export const getReportingManagers = () => apiClient.get<ReportingManager[]>(`${root}/reporting-managers`);
export const setQcReportingManager = (qcId: string, managerId: string | null) => apiClient.put(`${root}/users/${qcId}/manager`, {managerId});
