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