// import axios from 'axios';
// import {Platform} from 'react-native';

// const BASE_URL = Platform.select({
//   web: 'https://localhost:7288/api',
//   android: 'https://10.0.2.2:7288/api',
//   default: 'https://localhost:7288/api',
// });

// const apiClient = axios.create({
//   baseURL: BASE_URL,
//   headers: {'Content-Type': 'application/json'},
// });

// export default apiClient;

import axios from 'axios';
import {Platform} from 'react-native';

const BASE_URL = Platform.select({
  web: 'https://localhost:7288/api',
  android: 'https://10.0.2.2:7288/api',
  default: 'https://localhost:7288/api',
});

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {'Content-Type': 'application/json'},
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
};

export default apiClient;