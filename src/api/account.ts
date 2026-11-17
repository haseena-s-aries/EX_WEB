import apiClient, {getAuthToken} from './client';
import {setSessionProfile, SessionProfile} from './profileState';
import {Platform} from 'react-native';
import {ClientLogoFile} from '../components/clientLogo';
export type AccountProfile = SessionProfile & {phoneNumber?: string | null; designation?: string | null; isActive: boolean; pendingEmail?: string | null; canChangePassword: boolean};
const ownRequest = (request: () => Promise<{data: AccountProfile}>) => {
  const session = getAuthToken();
  return request().then(response => {if (session && session === getAuthToken()) setSessionProfile(response.data); return response;});
};
export const getMyProfile = () => ownRequest(() => apiClient.get<AccountProfile>('/account/profile'));
export const updateMyProfile = (data: {displayName: string; phoneNumber: string; designation: string}) => ownRequest(() => apiClient.put<AccountProfile>('/account/profile', data));
export const removeProfilePhoto = () => ownRequest(() => apiClient.delete<AccountProfile>('/account/profile/photo'));
export const uploadProfilePhoto = (file: ClientLogoFile) => {
  const form = new FormData();
  form.append('photo', Platform.OS === 'web' && file.webFile ? file.webFile : {uri: file.uri, name: file.name, type: file.type} as any);
  return ownRequest(() => apiClient.put<AccountProfile>('/account/profile/photo', form));
};
export const forgotPassword = (email: string) => apiClient.post('/account/forgot-password', {email});
export const requestPasswordCode = (email: string) => apiClient.post('/account/forgot-password-code', {email});
export const resetPasswordWithCode = (email: string, code: string, newPassword: string, confirmPassword: string) => apiClient.post('/account/reset-password-code', {email, code, newPassword, confirmPassword});
export const resetPassword = (token: string, newPassword: string, confirmPassword: string) => apiClient.post('/account/reset-password', {token, newPassword, confirmPassword});
export const changeMyPassword = (currentPassword: string, newPassword: string, confirmPassword: string) => apiClient.post('/account/change-password', {currentPassword, newPassword, confirmPassword});
export const requestEmailChange = (email: string, currentPassword: string) => ownRequest(() => apiClient.post<AccountProfile>('/account/email-change', {email, currentPassword}));
export const verifyEmail = (token: string) => apiClient.post('/account/verify-email', {token});
