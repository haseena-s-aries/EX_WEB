import apiClient from './client';
export type ProjectStatus =
  | 'Pending'
  | 'Active'
  | 'InProgress'
  | 'Completed'
  | 'OnHold';

export const normalizeProjectStatus = (value: unknown): ProjectStatus => {
  if (typeof value === 'number') {
    return ['Pending', 'Active', 'InProgress', 'Completed', 'OnHold'][value] as
      | ProjectStatus
      | undefined || 'Pending';
  }

  switch (String(value ?? '').replace(/\s+/g, '').toLowerCase()) {
    case 'active':
      return 'Active';
    case 'inprogress':
      return 'InProgress';
    case 'completed':
      return 'Completed';
    case 'onhold':
      return 'OnHold';
    default:
      return 'Pending';
  }
};

export const projectStatusLabel = (value: unknown) => {
  const status = normalizeProjectStatus(value);
  if (status === 'InProgress') return 'In Progress';
  if (status === 'OnHold') return 'On Hold';
  return status;
};

export const getAssignmentOptions = () => apiClient.get('/projects/assignment-options');

export const getProjects = () => apiClient.get('/projects');

// NEW: fetches the full record for one project (used by the project
// detail/edit modal) — matches GET /api/projects/{id} confirmed in Swagger.
export const getProject = (projectId: string) => apiClient.get(`/projects/${projectId}`);

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

export const updateProject = (
  projectId: string,
  data: {
    projectName: string;
    sector: string;
    jobNo: string;
    location: string;
    vesselOrSiteName: string;
    assignedSurveyorId: string;
    assignedQcId: string;
    assignedClientId: string;
    status: ProjectStatus;
  },
) => apiClient.put(`/projects/${projectId}`, data);

export const addProjectArea = (projectId: string, name: string, file: any) => {
  const request = apiClient.post(`/projects/${projectId}/areas`, {
    areaName: name,
  });
  return request.then(async response => {
    if (file && response.data?.id) {
      try {
        const photoResponse = await uploadProjectAreaPhoto(
          projectId,
          response.data.id,
          file,
        );
        response.data.layoutImagePath =
          photoResponse.data?.[0]?.downloadUrl || photoResponse.data?.[0]?.filePath;
      } catch (error: any) {
        // Area creation is already committed. Preserve its ID so callers can
        // retry the image upload without trying to create a duplicate area.
        error.createdArea = response.data;
        throw error;
      }
    }
    return response;
  });
};

export const updateProjectArea = (
  projectId: string,
  areaId: string,
  name: string,
  file?: any,
) => {
  const request = apiClient.put(`/projects/${projectId}/areas/${areaId}`, {
    areaName: name,
  });
  return request.then(async response => {
    if (file) {
      const photoResponse = await uploadProjectAreaPhoto(projectId, areaId, file);
      response.data.layoutImagePath =
        photoResponse.data?.[0]?.downloadUrl || photoResponse.data?.[0]?.filePath;
    }
    return response;
  });
};

export type ProjectAreaPhoto = {
  id: string;
  fileName?: string | null;
  filePath?: string | null;
  downloadUrl?: string | null;
};

export const uploadProjectAreaPhoto = (
  projectId: string,
  areaId: string,
  file: any,
) => {
  const formData = new FormData();
  formData.append('Files', file);
  return apiClient.post<ProjectAreaPhoto[]>(
    `/projects/${projectId}/areas/${areaId}/photos`,
    formData,
  );
};

export const getProjectAreaPhotos = (projectId: string, areaId: string) =>
  apiClient.get<ProjectAreaPhoto[]>(
    `/projects/${projectId}/areas/${areaId}/photos`,
  );

// NEW: matches DELETE /api/projects/{projectId}/areas/{areaId}
export const deleteProjectArea = (projectId: string, areaId: string) =>
  apiClient.delete(`/projects/${projectId}/areas/${areaId}`);

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
  sequenceNo: number;
  xPercent: number;
  yPercent: number;
  tagNumber: string;
  equipmentId?: string | null;
  type: string;
  circuitId?: string | null;
  location?: string | null;
  manufacturer?: string | null;
  protectionDetails?: string | null;
  certificateNumber?: string | null;
  status: string;
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

export type SaveAreaEquipmentRequest = {
  xPercent: number;
  yPercent: number;
  tagNumber: string;
  equipmentId?: string | null;
  type: string;
  circuitId?: string | null;
  location?: string | null;
  manufacturer?: string | null;
  protectionDetails?: string | null;
  certificateNumber?: string | null;
};

const surveyorEquipmentUrl = (projectId: string, areaId: string) =>
  `/surveyor/projects/${projectId}/areas/${areaId}/equipment`;

export const getSurveyorEquipment = (projectId: string, areaId: string) =>
  apiClient.get<AreaEquipment[]>(surveyorEquipmentUrl(projectId, areaId));

export const createSurveyorEquipment = (
  projectId: string,
  areaId: string,
  data: SaveAreaEquipmentRequest,
) => apiClient.post<AreaEquipment>(surveyorEquipmentUrl(projectId, areaId), data);

export const updateSurveyorEquipment = (
  projectId: string,
  areaId: string,
  equipmentId: string,
  data: SaveAreaEquipmentRequest,
) =>
  apiClient.put<AreaEquipment>(
    `${surveyorEquipmentUrl(projectId, areaId)}/${equipmentId}`,
    data,
  );

export const deleteSurveyorEquipment = (
  projectId: string,
  areaId: string,
  equipmentId: string,
) =>
  apiClient.delete(
    `${surveyorEquipmentUrl(projectId, areaId)}/${equipmentId}`,
  );
