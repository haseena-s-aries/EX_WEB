import apiClient from './client';
export type Company = {id: string; companyName: string; displayName: string; address?: string | null; telephone?: string | null; fax?: string | null; website?: string | null; email?: string | null; logoUrl?: string | null};
export const getCompanies = () => apiClient.get<Company[]>('/companies');
