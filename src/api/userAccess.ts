import {useEffect, useState} from 'react';
import api, {getAuthToken} from './client';
export type RoleRequest = {id:string; userId:string; name:string; email:string; currentRole:string; requestedRole:string; reason:string; status:string; requestedAt:string; reviewedAt?:string; reviewedBy?:string; rejectionReason?:string};
export type AccessNotice = {id:string; kind:string; title:string; message:string; targetUserId?:string; roleRequestId?:string; projectId?:string; areaId?:string; equipmentId?:string; inspectionActivityId?:string; createdAt:string; readAt?:string};
const listeners = new Set<() => void>();
export const refreshUserAccess = () => listeners.forEach(fn => fn());
export function subscribeUserAccess(fn: () => void) {listeners.add(fn); return () => {listeners.delete(fn);};}
export const getRoleRequests = () => api.get<RoleRequest[]>('/user-access/role-requests');
export const getAllRoleRequests = () => api.get<RoleRequest[]>('/user-access/role-requests/all');
export const requestRoleChange = (requestedRole:string, reason:string) => api.post('/user-access/role-requests', {requestedRole, reason});
export const reviewRoleChange = (id:string, decision:string, reason?:string) => api.put(`/user-access/role-requests/${id}/review`, {decision, reason});
export const getAccessNotices = () => api.get<AccessNotice[]>('/user-access/notifications');
export const readAccessNotice = (id:string) => api.put(`/user-access/notifications/${id}/read`);
export const dismissAccessNotice = (id:string) => api.put(`/user-access/notifications/${id}/dismiss`);
export function useUserAccessCounts(enabled:boolean) {
  const [counts,setCounts]=useState({pendingRegistrations:0,pendingRoleChanges:0});
  const token=getAuthToken();
  useEffect(()=>{
    if (!enabled || !token) {setCounts({pendingRegistrations:0,pendingRoleChanges:0});return;}
    let alive=true;
    const refresh=()=>{api.get('/user-access/counts').then(r=>{if(alive && token===getAuthToken())setCounts(r.data);}).catch(()=>{});};
    refresh(); const timer=setInterval(refresh,20000);const unsubscribe=subscribeUserAccess(refresh);
    return()=>{alive=false;clearInterval(timer);unsubscribe();};
  },[enabled,token]);
  return counts;
}
