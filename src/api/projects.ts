import apiClient from './client';
import {Platform} from 'react-native';

export type ProjectStatus =
  | 'Pending'
  | 'Active'
  | 'InProgress'
  | 'Completed'
  | 'OnHold';

export const normalizeProjectStatus = (value: unknown): ProjectStatus => {
  if (typeof value === 'number') {
    const statuses: ProjectStatus[] = [
      'Pending',
      'Active',
      'InProgress',
      'Completed',
      'OnHold',
    ];
    return statuses[value] || 'Pending';
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

export type ProjectAssignableUser = {
  id: string;
  displayName: string;
  email: string;
  role: string;
};

export type ProjectSummary = {
  id: string;
  projectName: string;
  sector: string;
  jobNo: string;
  location: string;
  vesselOrSiteName: string;
  status: ProjectStatus;
  assignedSurveyorId: string;
  assignedQcId: string;
  assignedClientId: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  areaCount: number;
};

export type ProjectAreaEquipment = {
  id: string;
  sequenceNo: number;
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
  createdAt: string;
  inspectionStatus: string;
};

export type ProjectAreaPhoto = {
  id: string;
  projectAreaId?: string;
  fileName?: string | null;
  filePath?: string | null;
  downloadUrl?: string | null;
  uploadedByUserId?: string;
  uploadedAt?: string;
};

export type ProjectArea = {
  id: string;
  projectId: string;
  areaName: string;
  layoutImagePath?: string | null;
  createdAt: string;
  equipmentCount: number;
  photos: ProjectAreaPhoto[];
  equipment: ProjectAreaEquipment[];
};

export type ProjectDetails = Omit<ProjectSummary, 'areaCount'> & {
  areas: ProjectArea[];
};

export type ProjectWriteRequest = {
  projectName: string;
  sector: string;
  jobNo: string;
  location: string;
  vesselOrSiteName: string;
  assignedSurveyorId: string;
  assignedQcId: string;
  assignedClientId: string;
  status?: ProjectStatus | string;
};

export const getAssignmentOptions = () =>
  apiClient.get<ProjectAssignableUser[]>('/projects/assignment-options');

export const getProjects = () => apiClient.get<ProjectSummary[]>('/projects');

export const getProject = (projectId: string) =>
  apiClient.get<ProjectDetails>(`/projects/${projectId}`);

export const createProject = (data: ProjectWriteRequest) =>
  apiClient.post<ProjectDetails>('/projects', {
    ...data,
    status: normalizeProjectStatus(data.status),
  });

export const updateProject = (
  projectId: string,
  data: ProjectWriteRequest & {status: ProjectStatus | string},
) =>
  apiClient.put<ProjectDetails>(`/projects/${projectId}`, {
    ...data,
    status: normalizeProjectStatus(data.status),
  });

export const addProjectArea = (projectId: string, name: string, file: any) => {
  const request = apiClient.post<ProjectArea>(`/projects/${projectId}/areas`, {
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
  const request = apiClient.put<ProjectArea>(`/projects/${projectId}/areas/${areaId}`, {
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
  inspectionId?: string | null;
  qcReviewStatus?: string | null;
  qcComments?: string | null;
  qcSeverity?: string | null;
};

export type EquipmentInspectionStatus =
  | 'NotStarted'
  | 'InProgress'
  | 'Completed'
  | 'ChangesRequested'
  | 'QcApproved';

export type SurveyorEquipmentDetails = Omit<
  AreaEquipment,
  'status' | 'updatedAt' | 'createdByUserId'
> & {
  areaName: string;
  inspectionStatus: EquipmentInspectionStatus;
  inspectionEditable: boolean;
};

export type InspectionType = 'Visual' | 'Close' | 'Detailed';

export type SurveyorChecklistItem = {
  checklistItemId: string;
  inspectionType: InspectionType;
  text: string;
  sortOrder: number;
  isRequired: boolean;
};

export type SurveyorInspectionAnswer = SurveyorChecklistItem & {
  isChecked: boolean;
  remarks?: string | null;
};

export type SurveyorInspectionPhoto = {
  id: string;
  fileName: string;
  photoPath: string;
  uploadedAt: string;
};

export type SurveyorEquipmentInspection = {
  inspectionId: string;
  equipmentId: string;
  inspectionDate: string;
  inspectorName: string;
  comments?: string | null;
  status: EquipmentInspectionStatus;
  isEditable: boolean;
  createdAt: string;
  updatedAt: string;
  answers: SurveyorInspectionAnswer[];
  photos: SurveyorInspectionPhoto[];
  qcComments?: string | null;
  qcSeverity?: string | null;
};

export type SaveEquipmentInspectionRequest = {
  inspectionDate: string;
  inspectorName: string;
  comments?: string | null;
  isCompleted: boolean;
  answers: Array<{
    checklistItemId: string;
    isChecked: boolean;
    remarks?: string | null;
  }>;
};

export type InspectionPhotoFile = {
  uri?: string;
  type?: string;
  fileName?: string;
  name?: string;
  webFile?: any;
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

export const getSurveyorEquipmentDetails = (equipmentId: string) =>
  apiClient.get<SurveyorEquipmentDetails>(`/surveyor/equipment/${equipmentId}`);

export const getSurveyorEquipmentInspection = (equipmentId: string) =>
  apiClient.get<SurveyorEquipmentInspection>(
    `/surveyor/equipment/${equipmentId}/inspection`,
  );

export const getSurveyorChecklist = () =>
  apiClient.get<SurveyorChecklistItem[]>('/surveyor/checklist');

export const createSurveyorInspection = (
  equipmentId: string,
  data: SaveEquipmentInspectionRequest,
) =>
  apiClient.post<SurveyorEquipmentInspection>(
    `/surveyor/equipment/${equipmentId}/inspection`,
    data,
  );

export const updateSurveyorInspection = (
  inspectionId: string,
  data: SaveEquipmentInspectionRequest,
) =>
  apiClient.put<SurveyorEquipmentInspection>(
    `/surveyor/inspections/${inspectionId}`,
    data,
  );

export const uploadSurveyorInspectionPhotos = (
  inspectionId: string,
  files: InspectionPhotoFile[],
) => {
  const formData = new FormData();
  files.forEach(file => {
    const value = Platform.OS === 'web'
      ? file.webFile
      : {
          uri: file.uri,
          type: file.type || 'image/jpeg',
          name: file.fileName || file.name || 'inspection-photo.jpg',
        };
    formData.append('Files', value as any);
  });
  return apiClient.post<SurveyorInspectionPhoto[]>(
    `/surveyor/inspections/${inspectionId}/photos`,
    formData,
  );
};

export const deleteSurveyorInspectionPhoto = (
  inspectionId: string,
  photoId: string,
) => apiClient.delete(`/surveyor/inspections/${inspectionId}/photos/${photoId}`);

export type QcSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type QcReviewStatus =
  | 'PendingReview'
  | 'InReview'
  | 'ChangesRequested'
  | 'Approved';

export type QcDashboard = {
  awaitingQcReview: number;
  changesRequested: number;
  approved: number;
  overdue: number;
};

export type QcProjectSummary = {
  projectId: string;
  projectName: string;
  jobNo: string;
  location: string;
  surveyorName: string;
  projectStatus: ProjectStatus;
  qcReviewStatus: QcReviewStatus;
  submissionDate?: string | null;
  dueDate?: string | null;
};

export type QcEquipmentDetails = {
  equipmentId: string;
  sequenceNo: number;
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
};

export type QcAreaEquipment = QcEquipmentDetails & {
  inspectionId?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  qcReviewStatus: QcReviewStatus;
};

export type QcAreaDetails = {
  areaId: string;
  areaName: string;
  layoutImagePath?: string | null;
  equipment: QcAreaEquipment[];
};

export type QcProjectDetails = {
  projectId: string;
  projectName: string;
  sector: string;
  jobNo: string;
  location: string;
  vesselOrSiteName: string;
  projectStatus: ProjectStatus;
  createdAt: string;
  assignedSurveyor: string;
  assignedQc: string;
  assignedClient: string;
  areas: Array<{
    areaId: string;
    areaName: string;
    layoutImagePath?: string | null;
    equipmentCount: number;
    pendingQcCount: number;
    approvedCount: number;
    changesRequestedCount: number;
  }>;
  equipmentCount: number;
  pendingQcCount: number;
  approvedCount: number;
  changesRequestedCount: number;
};

export type QcEquipmentInspection = {
  inspectionId: string;
  projectId: string;
  areaId: string;
  equipment: QcEquipmentDetails;
  checklistAnswers: Array<{
    answerId: string;
    questionId: string;
    question: string;
    sortOrder: number;
    value?: string | null;
    comment?: string | null;
  }>;
  inspectionPhotos: Array<{
    fileId: string;
    fileName: string;
    storageKey: string;
    contentType: string;
    uploadedAt: string;
  }>;
  findings: Array<{
    findingId: string;
    observation: string;
    recommendation?: string | null;
    severity?: string | null;
    status: string;
  }>;
  surveyorRemarks?: string | null;
  certificateNumber?: string | null;
  certificateDetails?: string | null;
  inspectionTimestamp?: string | null;
  submissionDate?: string | null;
  dueDate?: string | null;
  qcComments?: string | null;
  qcReviewStatus: QcReviewStatus;
  severity?: QcSeverity | null;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
};

export type QcReview = {
  inspectionId: string;
  qcReviewStatus: QcReviewStatus;
  qcComments?: string | null;
  severity?: QcSeverity | null;
  reviewedByUserId: string;
  startedAt?: string | null;
  reviewedAt?: string | null;
};

export const getQcDashboard = () => apiClient.get<QcDashboard>('/qc/dashboard');

export const getQcProjects = () => apiClient.get<QcProjectSummary[]>('/qc/projects');

export const getQcProject = (projectId: string) =>
  apiClient.get<QcProjectDetails>(`/qc/projects/${projectId}`);

export const getQcArea = (projectId: string, areaId: string) =>
  apiClient.get<QcAreaDetails>(`/qc/projects/${projectId}/areas/${areaId}`);

export const getQcEquipmentInspection = (equipmentId: string) =>
  apiClient.get<QcEquipmentInspection>(`/qc/equipment/${equipmentId}/inspection`);

export const startQcReview = (inspectionId: string) =>
  apiClient.post<QcReview>(`/qc/inspections/${inspectionId}/start-review`);

export const approveQcInspection = (
  inspectionId: string,
  comments?: string,
) =>
  apiClient.post<QcReview>(`/qc/inspections/${inspectionId}/approve`, {
    comments: comments || null,
  });

export const requestQcChanges = (
  inspectionId: string,
  comments: string,
  severity: QcSeverity,
) =>
  apiClient.post<QcReview>(`/qc/inspections/${inspectionId}/request-changes`, {
    comments,
    severity,
  });

export const updateQcComments = (inspectionId: string, comments: string) =>
  apiClient.put<QcReview>(`/qc/inspections/${inspectionId}/comments`, {
    comments,
  });
