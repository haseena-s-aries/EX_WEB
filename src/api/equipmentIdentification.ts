import apiClient from './client';
export const resolveEquipmentIdentifier=(identifier:string,technology:string)=>apiClient.get(`/v1/equipment-identification/resolve`,{params:{identifier,technology}});
export const searchEquipment=(q:string)=>apiClient.get('/v1/equipment-identification/search',{params:{q}});
export const getEquipmentTagHistory=(equipmentId:string)=>apiClient.get(`/v1/equipment-identification/equipment/${equipmentId}/tags`);
export const assignEquipmentTag=(equipmentId:string,payload:any)=>apiClient.post(`/v1/equipment-identification/equipment/${equipmentId}/tags`,payload);
export const deactivateEquipmentTag=(equipmentId:string,assignmentId:string,payload:{reason:string})=>apiClient.post(`/v1/equipment-identification/equipment/${equipmentId}/tags/${assignmentId}/deactivate`,payload);
