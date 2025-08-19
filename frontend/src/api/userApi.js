import api from './index';

export const getProfile = () => api.get('/me');

export const updateProfile = payload => api.patch('/me', payload);

export const getUserSessions = () => api.get('/me/sessions');

export const revokeUserSession = sessionId => api.delete(`/me/sessions/${sessionId}`);