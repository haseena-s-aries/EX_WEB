import axios from 'axios';
import {Platform} from 'react-native';

const webConfig = (globalThis as typeof globalThis & {
  EX_SURVEY_CONFIG?: {apiBaseUrl?: string};
}).EX_SURVEY_CONFIG;

const BASE_URL = Platform.select({
  web: webConfig?.apiBaseUrl || 'https://139.5.189.155:338/api',
  android: 'https://139.5.189.155:338/api',
  ios: 'https://139.5.189.155:338/api',
  default: 'https://139.5.189.155:338/api',
});

const apiClient = axios.create({
  baseURL: BASE_URL,
});

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
};

export const getAuthToken = () => authToken;

export const getApiResourceUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const baseUrl = String(apiClient.defaults.baseURL || '').replace(/\/$/, '');
  const origin = baseUrl.replace(/\/api$/, '');
  return path.startsWith('/api/')
    ? `${origin}${path}`
    : `${baseUrl}/${path.replace(/^\//, '')}`;
};

export default apiClient;
