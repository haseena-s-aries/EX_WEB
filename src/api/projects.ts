// import apiClient from './client';

// export const getAssignmentOptions = () => apiClient.get('/projects/assignment-options');

// export const getProjects = () => apiClient.get('/projects');

// export const createProject = (data: {
//   projectName: string;
//   sector: string;
//   jobNo: string;
//   location: string;
//   vesselOrSiteName: string;
//   assignedSurveyorId: string;
//   assignedQcId: string;
//   assignedClientId: string;
// }) => apiClient.post('/projects', data);

import apiClient from './client';

export const getAssignmentOptions = () => apiClient.get('/projects/assignment-options');

export const getProjects = () => apiClient.get('/projects');

export const createProject = (data: {
  projectName: string;
  sector: string;
  jobNo: string;
  location: string;
  vesselOrSiteName: string;
  assignedSurveyorId: string;
  assignedQcId: string;
  assignedClientId: string;
}) => apiClient.post('/projects', data);

// TODO: confirm the exact multipart field name backend expects for the drawing
// (currently sending it as "file" — could be "drawingFile", "image", etc.)
export const addProjectArea = (projectId: string, name: string, file: any) => {
  const formData = new FormData();
  formData.append('name', name);
  if (file) {
    formData.append('file', file);
  }
  return apiClient.post(`/projects/${projectId}/areas`, formData, {
    headers: {'Content-Type': 'multipart/form-data'},
  });
};

export type SurveyorProjectSummary = {
  projectId: string;
  projectName: string;
  sector: string;
  jobNo: string;
  location: string;
  vesselOrSiteName: string;
  createdDate: string;
  areaCount: number;
  status: string;
};

export type SurveyorAreaSummary = {
  areaId: string;
  areaName: string;
  layoutImagePath?: string | null;
  photoCount: number;
  equipmentCount: number;
};

export type SurveyorProjectDetails = Omit<SurveyorProjectSummary, 'areaCount'> & {
  assignedSurveyor: string;
  assignedQc: string;
  assignedClient: string;
  areas: SurveyorAreaSummary[];
};

export type AreaEquipment = {
  id: string;
  projectId: string;
  areaId: string;
  xPercent: number;
  yPercent: number;
  tagNumber: string;
  equipmentCode?: string | null;
  type: string;
  circuitId?: string | null;
  location?: string | null;
  manufacturer?: string | null;
  protectionDetails?: string | null;
  certificateNumber?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type SurveyorAreaDetails = {
  areaId: string;
  areaName: string;
  layoutImagePath?: string | null;
  equipment: AreaEquipment[];
};

export const getSurveyorProjects = () =>
  apiClient.get<SurveyorProjectSummary[]>('/surveyor/projects');

export const getSurveyorProject = (projectId: string) =>
  apiClient.get<SurveyorProjectDetails>(`/surveyor/projects/${projectId}`);

export const getSurveyorProjectAreas = (projectId: string) =>
  apiClient.get<SurveyorAreaSummary[]>(
    `/surveyor/projects/${projectId}/areas`,
  );

export const getSurveyorArea = (projectId: string, areaId: string) =>
  apiClient.get<SurveyorAreaDetails>(
    `/surveyor/projects/${projectId}/areas/${areaId}`,
  );
