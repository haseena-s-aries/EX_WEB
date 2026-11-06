import apiClient from './client';
import {Company} from './companies';
import {Platform} from 'react-native';
import BlobUtil from 'react-native-blob-util';
import {getApiResourceUrl,getAuthToken} from './client';

export type ReportProject = {id: string; projectName: string; jobNumber: string; location: string; status: string};
export type ReportData = {
  ourCompany?: Company | null; ourCompanyLogo?: {url: string} | null;
  projectId: string; projectName: string; jobNumber: string; siteName: string; location: string;
  client: string; preparedBy: string; checkedBy: string; approvedBy: string;
  uidNumber?: string | null; documentNumber?: string | null; revision?: string | null; description?: string | null; clientName?: string | null; clientLogo?: {url: string} | null;
  hazardousAreaPlan?: {url: string} | null;
  areas: Array<{id?: string; name: string; layout?: {url: string} | null; equipment: Array<{sequenceNo: number; tagNumber: string; equipmentId?: string | null; location?: string | null; rfidTagUid?: string | null; type: string; inspections: Array<{id?:string;status: string; inspector: string; answers: unknown[]; photos: unknown[]; findings: unknown[]}>}>}>;
};
export type HaerEquipment = {equipmentRecordId:string;sequenceNo:number; equipmentId:string; tagNumber:string; area:string; equipmentType:string; description?:string|null; location?:string|null; manufacturer?:string|null; model?:string|null; serialNumber?:string|null; circuitId?:string|null; exProtectionType?:string|null; gasGroup?:string|null; temperatureClass?:string|null; hazardousAreaZone?:string|null; ambientTemperatureRange?:string|null; ipRating?:string|null; protectionDetails?:string|null; certificateNumber?:string|null; notifiedBody?:string|null; specialConditionsOfUse?:string|null; rfidTagUid?:string|null; rfidIdentificationMethod?:string|null; inspectionStatus:string; lastInspectionGrade?:string|null; lastInspectionAt?:string|null; lastInspectionResult?:string|null; outstandingDefects:number; outstandingDefectStatuses:string[]; inspectionHistory:Array<{grade:string;inspectedAt?:string|null;status:string;result:string;inspector?:string|null}>; reconciliationStatus:string; metadataAvailability:Record<string,string>};
export type HaerReportData = {projectId:string;projectName:string;jobNumber:string;siteName:string;clientName?:string|null;revision?:string|null;generatedAt:string;equipment:HaerEquipment[]};
export const getReportProjects = () => apiClient.get<ReportProject[]>('/reports/projects');
export const getProjectReport = (id: string) => apiClient.get<ReportData>(`/reports/projects/${id}`);
export const reportPdfPath = (id: string) => `/reports/projects/${id}/pdf`;
export const getHaer = (id:string, areaId?:string) => apiClient.get<HaerReportData>(`/reports/projects/${id}/haer`, {params: areaId ? {areaId} : undefined});
export type HaerMetadataUpdate = Pick<HaerEquipment,'description'|'location'|'manufacturer'|'model'|'serialNumber'|'exProtectionType'|'gasGroup'|'temperatureClass'|'hazardousAreaZone'|'ambientTemperatureRange'|'ipRating'|'certificateNumber'|'notifiedBody'|'specialConditionsOfUse'|'circuitId'|'rfidTagUid'|'rfidIdentificationMethod'|'reconciliationStatus'> & {notApplicableFields:string[]};
export const updateHaerMetadata = (equipmentId:string, data:HaerMetadataUpdate) => apiClient.put(`/v1/haer/equipment/${equipmentId}/metadata`, data);
export const getDailyProgressReport = (projectId:string, date:string) => apiClient.get<any>(`/reports/projects/${projectId}/daily-progress`, {params:{date}});
export const getDefectReport = (projectId:string, status?:string) => apiClient.get<any>(`/reports/projects/${projectId}/defects`, {params:status?{status}:undefined});
export const getReportExportHistory = (projectId:string) => apiClient.get<{artifacts:any[];events:any[]}>(`/reports/projects/${projectId}/history`);
export const downloadReportArtifact = (projectId:string,artifactId:string,fileName:string) => downloadOperationalFile(`/reports/projects/${projectId}/artifacts/${artifactId}`,fileName);
export const getInspectionActivityReports = (projectId:string) => apiClient.get<Array<{id:string;grade:string;startedAt:string;completedAt?:string|null;reviewStatus:string;tagNumber:string}>>(`/reports/projects/${projectId}/inspection-activities`);
const downloadOperationalFile = async (path:string, fileName:string) => {
  if(Platform.OS!=='web'){
    const localPath=`${BlobUtil.fs.dirs.CacheDir}/ex-survey-${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const response=await BlobUtil.config({path:localPath}).fetch('GET',getApiResourceUrl(path),{Authorization:`Bearer ${getAuthToken()}`});
    if(response.info().status!==200){await BlobUtil.fs.unlink(localPath).catch(()=>undefined);throw new Error('The report export could not be downloaded.');}
    if(Platform.OS==='android') await BlobUtil.MediaCollection.copyToMediaStore({name:fileName,parentFolder:'Ex-Survey',mimeType:fileName.toLowerCase().endsWith('.zip')?'application/zip':fileName.toLowerCase().endsWith('.pdf')?'application/pdf':fileName.toLowerCase().endsWith('.csv')?'text/csv':'application/vnd.ms-excel'},'Download',localPath);
    else await BlobUtil.ios.previewDocument(localPath);
    return;
  }
  const response = await apiClient.get<Blob>(path, {responseType:'blob'});
  const doc=(globalThis as any).document; const urlApi=(globalThis as any).URL;
  if(!doc||!urlApi?.createObjectURL) throw new Error('This export can currently be downloaded from the web app.');
  const url=urlApi.createObjectURL(response.data); try {const anchor=doc.createElement('a'); anchor.href=url; anchor.download=fileName; anchor.click();} finally {urlApi.revokeObjectURL(url);}
};
export const downloadInspectionRecord = (id:string) => downloadOperationalFile(`/reports/activities/${id}/inspection-record.pdf`, `ITR-${id.slice(0,8)}.pdf`);
export const downloadCampaignHandover = (id:string, jobNo:string) => downloadOperationalFile(`/reports/projects/${id}/handover.zip`, `${safeJob(jobNo)}_handover.zip`);
const downloadHaerFile = async (path: string, fileName: string) => {
  return downloadOperationalFile(path,fileName);
};
const safeJob = (jobNumber:string) => jobNumber.replace(/[^a-zA-Z0-9_-]/g, '') || 'project';
const areaQuery = (areaId?:string) => areaId ? `?areaId=${encodeURIComponent(areaId)}` : '';
export const downloadHaerCsv = (id:string, jobNumber:string, areaId?:string) => downloadHaerFile(`/reports/projects/${id}/haer.csv${areaQuery(areaId)}`, `${safeJob(jobNumber)}_HAER.csv`);
export const downloadHaerPdf = (id:string, jobNumber:string, areaId?:string) => downloadHaerFile(`/reports/projects/${id}/haer.pdf${areaQuery(areaId)}`, `${safeJob(jobNumber)}_HAER.pdf`);
export const downloadHaerExcel = (id:string, jobNumber:string, areaId?:string) => downloadHaerFile(`/reports/projects/${id}/haer/excel${areaQuery(areaId)}`, `${safeJob(jobNumber)}_HAER.xls`);

export type HaerRegisterRow = HaerEquipment & {
  areaId: string;
  itemNumber?: string | null;
  equipmentName?: string | null;
  comments?: string | null;
};
export const getHaerRegister = (projectId: string) =>
  apiClient.get<{projectId: string; projectName: string; equipment: HaerRegisterRow[]}>(`/v1/haer/projects/${projectId}/register`);
