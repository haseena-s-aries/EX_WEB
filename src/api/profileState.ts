import {useSyncExternalStore} from 'react';
export type SessionProfile = {id: string; email: string; displayName: string; role: string; approvalStatus: string; profilePhotoUrl?: string | null};
let current: SessionProfile | null = null;
export const getSessionProfile = () => current;
const listeners = new Set<() => void>();
export function setSessionProfile(profile: SessionProfile | null) {current = profile; listeners.forEach(listener => listener());}
export const useSessionProfile = () => useSyncExternalStore(listener => {listeners.add(listener); return () => {listeners.delete(listener);};}, () => current, () => null);
