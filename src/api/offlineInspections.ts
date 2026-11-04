import apiClient from './client';
import {createSurveyorEquipment, InspectionPhotoFile, SaveAreaEquipmentRequest, uploadSurveyorEquipmentPhotos} from './projects';

export const getAssignedOfflinePackages = () => apiClient.get<{serverTime:string;packages:any[]}>('/v1/offline-inspections/packages');
export const downloadOfflineReferenceDocument = async(url:string) => {const response=await apiClient.get(url,{responseType:'arraybuffer'});return new Uint8Array(response.data as ArrayBuffer);};
export const submitOfflineActivity = (payload:any,idempotencyKey:string) => apiClient.post('/v1/offline-inspections/sync',payload,{headers:{'Idempotency-Key':idempotencyKey}});
export const syncEquipmentDocumentUse = (payload:any) => apiClient.post('/v1/equipment-documents/use-events',payload);
export const registerOfflineEquipment = (projectId:string,areaId:string,payload:SaveAreaEquipmentRequest,key:string) => createSurveyorEquipment(projectId,areaId,payload,key);
export const uploadOfflineEquipmentPhoto = (projectId:string,areaId:string,equipmentId:string,photo:InspectionPhotoFile,role:'Overview'|'Nameplate'|'ExMarking',clientPhotoId:string) => uploadSurveyorEquipmentPhotos(projectId,areaId,equipmentId,[photo],role,[clientPhotoId]);
export const uploadOfflineActivityPhoto = (activityId:string,photo:InspectionPhotoFile,checkpointResponseRevisionId:string|undefined,idempotencyKey:string) => {
  const form=new FormData();form.append('photo',{uri:photo.uri,type:photo.type||'image/jpeg',name:photo.fileName||'inspection.jpg'} as any);
  if(checkpointResponseRevisionId)form.append('checkpointResponseRevisionId',checkpointResponseRevisionId);
  form.append('caption',`offline:${idempotencyKey}`);
  return apiClient.post(`/v1/inspection-activities/${activityId}/photos`,form,{headers:{'Idempotency-Key':idempotencyKey}});
};
