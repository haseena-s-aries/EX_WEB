import apiClient from './client';

const base = '/v1/inspection-activities/category-checklist/catalog';
export const allCheckpoints = 'All Checkpoints';
export type ChecklistCategory = {id:string; name:string; description?:string};
export type ChecklistCatalog = {categories:ChecklistCategory[]; nextNumbers:Record<string,number>};
export const getChecklistCatalog = () => apiClient.get<ChecklistCatalog>(base);
export const saveChecklistCategory = (category:{id?:string; name:string; description:string}) =>
  apiClient.put(`${base}/categories`, category);
export const saveChecklistCheckpoint = (checkpoint:{code?:string; section:string; itemNumber:number; text:string; categoryId:string}) =>
  apiClient.put(`${base}/checkpoints`, checkpoint);
