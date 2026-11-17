import apiClient from './client';
import {setSessionProfile} from './profileState';
// git updated
export const sendOtp = (name: string, email: string, role: string) =>
  apiClient.post('/auth/register/send-otp', {name, email, role});

export const verifyOtp = (email: string, otp: string) =>
  apiClient.post('/auth/register/verify-otp', {email, otp});

export const resendOtp = (email: string) =>
  apiClient.post('/auth/register/resend-otp', {email});

export const completeRegistration = (email: string, password: string) =>
  apiClient.post('/auth/register/complete', {email, password});

export const loginUser = (email: string, password: string) =>
  apiClient.post('/auth/login', {email, password}).then(response => {setSessionProfile(response.data.user); return response;});

export const getPendingApprovals = () => apiClient.get('/auth/approvals/pending');

export const approveUser = (userId: string) =>
  apiClient.put(`/auth/approvals/${userId}/approve`);

export const rejectUser = (userId: string, reason: string) =>
  apiClient.put(`/auth/approvals/${userId}/reject`, {reason});

export const getUsers = (status?: string) =>
  apiClient.get('/auth/users', {params: status ? {status} : {}});

export const updateUserRole = (userId: string, role: string) =>
  apiClient.put(`/auth/users/${userId}/role`, {role});

export const deleteUser = (userId: string) =>
  apiClient.delete(`/auth/users/${userId}`);
