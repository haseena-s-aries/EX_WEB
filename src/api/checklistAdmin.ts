import apiClient from './client';

export type ChecklistQuestionDraft = {
  text: string; sortOrder: number; sectionCode: 'Apparatus' | 'Installation' | 'Environment' | null; isRequired: boolean;
  responseScaleCode: 'PassFailNA' | 'BooleanChecked' | null; applicableProtectionTypes?: string | null; requireRemarkOnFail: boolean;
  sourceItemReference?: string | null; sourceItemNumber?: number | null; applicableGrades?: string | null; subChecksJson?: string | null;
  numericReadingEnabled: boolean; measurementUnit?: string | null; minimumReading?: number | null; maximumReading?: number | null; numericReadingRequired: boolean;
};
export type ChecklistTemplate = {
  id: string; familyId?: string | null; name: string; inspectionType: 'Visual' | 'Close' | 'Detailed'; version: number; draftRevision: number;
  lifecycleStatus: 'Draft' | 'PendingTechnicalApproval' | 'Published' | 'Archived'; isActive: boolean;
  standardReference?: string | null; standardEdition?: string | null; controlledSourceReference?: string | null;
  applicableProtectionTypes?: string | null; questions: ChecklistQuestionDraft[];
};
export const getChecklistTemplates = () => apiClient.get<ChecklistTemplate[]>('/v1/checklist-admin/templates');
export const createChecklistTemplate = (data: {name: string; grade: ChecklistTemplate['inspectionType']; standardReference: string; standardEdition?: string | null; controlledSourceReference?: string | null; applicableProtectionTypes: string}) => apiClient.post('/v1/checklist-admin/templates', data);
export const editChecklistTemplate = (id: string, data: {expectedRevision: number; name: string; standardReference: string; standardEdition?: string | null; controlledSourceReference?: string | null; applicableProtectionTypes: string; questions: ChecklistQuestionDraft[]}) => apiClient.put(`/v1/checklist-admin/templates/${id}`, data);
export const previewChecklistTemplate = (id: string) => apiClient.get(`/v1/checklist-admin/templates/${id}/preview`);
export const cloneChecklistTemplate = (id: string) => apiClient.post(`/v1/checklist-admin/templates/${id}/clone`);
export const submitChecklistTemplate = (id: string) => apiClient.post(`/v1/checklist-admin/templates/${id}/submit`);
export const approveChecklistTemplate = (id: string, comments: string) => apiClient.post(`/v1/checklist-admin/templates/${id}/approve`, {comments});
export const archiveChecklistTemplate = (id: string) => apiClient.post(`/v1/checklist-admin/templates/${id}/archive`);

export const importSampleChecklist = () => apiClient.post("/v1/checklist-admin/imports/sample-pdf");
