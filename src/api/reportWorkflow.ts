import apiClient from './client';

export type ReportStatus = 'Ongoing' | 'Hold' | 'Submitted';
export type ReportWorkflow = {
  projectId:string;status:ReportStatus;revision:number;version:number;holdReason?:string|null;
  submittedAt?:string|null;submittedByUserId?:string|null;submittedByName?:string|null;submittedArtifactId?:string|null;
  canEdit:boolean;canReopen:boolean;
  draftArtifact?:{id:string;fileName:string;revision:number;generatedAt:string}|null;
  history:Array<{id:string;fromStatus:ReportStatus;toStatus:ReportStatus;revision:number;reason?:string|null;actorName?:string|null;actorUserId:string;occurredAt:string;artifactId?:string|null}>;
};
export const getReportWorkflow = (projectId:string, signal?:AbortSignal) => apiClient.get<ReportWorkflow>(`/reports/projects/${projectId}/workflow`, {signal});
export const changeReportStatus = (projectId:string, data:{status:ReportStatus;expectedVersion:number;reason?:string;confirmSubmission?:boolean;draftArtifactId?:string}) => apiClient.put<ReportWorkflow>(`/reports/projects/${projectId}/workflow`,data);
export const reopenReportRevision = (projectId:string, data:{expectedVersion:number;reason:string}) => apiClient.post<ReportWorkflow>(`/reports/projects/${projectId}/workflow/reopen`,data);
