import apiClient from './client';
export const resolveEquipmentIdentifier=(identifier:string,technology:string)=>apiClient.get(`/v1/equipment-identification/resolve`,{params:{identifier,technology}});
export const searchEquipment=(q:string)=>apiClient.get('/v1/equipment-identification/search',{params:{q}});
export const getEquipmentTagHistory=(equipmentId:string)=>apiClient.get(`/v1/equipment-identification/equipment/${equipmentId}/tags`);
export const assignEquipmentTag=(equipmentId:string,payload:any)=>apiClient.post(`/v1/equipment-identification/equipment/${equipmentId}/tags`,payload);
export const deactivateEquipmentTag=(equipmentId:string,assignmentId:string,payload:{reason:string})=>apiClient.post(`/v1/equipment-identification/equipment/${equipmentId}/tags/${assignmentId}/deactivate`,payload);

export type RadioTechnology = 'HF_RFID' | 'NFC';
export type EquipmentIdentificationFields = {
  tagNumber: string;
  equipmentCode: string;
  equipmentName: string;
  description: string;
  type: string;
  haerFields?: Record<string, string | null>;
};
export type BulkEquipmentRow = EquipmentIdentificationFields & {
  clientId: string;
  rfidUid: string;
  technology: RadioTechnology;
};
export type IdentifiedEquipment = {
  equipmentId: string;
  projectId: string;
  projectName: string;
  areaId: string;
  tagNumber: string;
  equipmentCode: string | null;
  equipmentName: string | null;
  description: string | null;
  type: string;
  status: string;
  tags: {uid: string; technology: RadioTechnology; identifiedAt: string}[];
};

export const getIdentifiedEquipment = (projectId: string, q: string, page: number) =>
  apiClient.get<{items: IdentifiedEquipment[]; total: number; page: number; pageSize: number}>(
    '/v1/equipment-identification/identified', {params: {projectId: projectId || undefined, q: q || undefined, page, pageSize: 20}},
  );
export const bulkRegisterEquipment = (payload: {
  projectId: string; areaId: string; requireRfid: boolean; rows: BulkEquipmentRow[];
}) => apiClient.post<{
  registered: number;
  failed: number;
  results: {clientId: string; equipmentId: string | null; error: string | null; fieldErrors?: Record<string, string>}[];
}>('/v1/equipment-identification/bulk-register', payload);
export const editEquipmentIdentification = (id: string, payload: EquipmentIdentificationFields) =>
  apiClient.put(`/v1/equipment-identification/equipment/${id}/identification-details`, payload);

export const getEquipmentRegistrationProjects = () => apiClient.get<{
  id: string; projectName: string; clientName?: string | null; areas: {id: string; areaName: string}[];
}[]>('/v1/equipment-identification/registration-projects');
