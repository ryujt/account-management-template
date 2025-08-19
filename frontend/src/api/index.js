import axios from 'axios';
import { useLoadingStore } from '@stores/loadingStore';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 15000
});

let loadingEnabled = true;

export const setGlobalLoadingEnabled = v => {
  loadingEnabled = Boolean(v);
};

export const setAuthToken = token => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

api.interceptors.request.use(config => {
  if (loadingEnabled) useLoadingStore.getState().start();
  if (!config.headers) config.headers = {};
  return config;
});

api.interceptors.response.use(
  res => {
    if (loadingEnabled) useLoadingStore.getState().end();
    return res.data;
  },
  err => {
    if (loadingEnabled) useLoadingStore.getState().end();
    const status = err.response ? err.response.status : 0;
    const data = err.response ? err.response.data : null;
    const code = data && data.error && data.error.code ? data.error.code : undefined;
    const message = data && data.error && data.error.message ? data.error.message : err.message;
    return Promise.reject({ status, code, message, data });
  }
);

export default api;