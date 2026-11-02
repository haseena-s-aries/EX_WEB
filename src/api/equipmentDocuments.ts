import apiClient from './client';

export const equipmentDocumentCategories = [
  {value: 'ExCertificate', label: 'Ex certificate'},
  {value: 'ManufacturerDatasheet', label: 'Manufacturer datasheet'},
  {value: 'InstallationMaintenanceManual', label: 'Installation and maintenance manual'},
  {value: 'ElectricalDrawing', label: 'Electrical drawing / schematic'},
  {value: 'InspectionProcedure', label: 'Inspection procedure'},
  {value: 'ApprovedTechnicalInstruction', label: 'Approved technical instruction'},
  {value: 'OtherControlledReference', label: 'Other controlled reference'},
] as const;

export const getEquipmentReferenceDocuments = (equipmentId: string, category?: string) =>
  apiClient.get<{items: any[]; categories: string[]}>(`/v1/equipment-documents/equipment/${equipmentId}`, {params: category ? {category} : undefined});

export const uploadEquipmentReferenceDocument = (data: FormData) =>
  apiClient.post('/v1/equipment-documents', data, {headers: {'Content-Type': 'multipart/form-data'}});

export const submitEquipmentReferenceDocument = (id: string) => apiClient.post(`/v1/equipment-documents/${id}/submit`);
export const approveEquipmentReferenceDocument = (id: string, comment?: string) => apiClient.post(`/v1/equipment-documents/${id}/approve`, {comment});
export const archiveEquipmentReferenceDocument = (id: string) => apiClient.post(`/v1/equipment-documents/${id}/archive`);
export const downloadEquipmentReferenceDocument = (id: string) => apiClient.get(`/v1/equipment-documents/${id}/download`, {responseType: 'blob'});
export const getEquipmentReferenceDocumentHistory = (id: string) => apiClient.get<any>(`/v1/equipment-documents/${id}/history`);
export const getEquipmentDocumentPolicies = (projectId: string) => apiClient.get<any[]>(`/v1/equipment-documents/requirement-policies`, {params: {projectId}});
export const createEquipmentDocumentPolicy = (data: any) => apiClient.post('/v1/equipment-documents/requirement-policies', data);
export const approveEquipmentDocumentPolicy = (id: string) => apiClient.post(`/v1/equipment-documents/requirement-policies/${id}/approve`);
