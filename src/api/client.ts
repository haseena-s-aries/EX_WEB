import axios from 'axios';
import {Platform} from 'react-native';

const BASE_URL = Platform.select({
  web: 'https://localhost:7288/api',
  android: 'http://10.0.2.2:5235/api',
  default: 'https://localhost:7288/api',
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
