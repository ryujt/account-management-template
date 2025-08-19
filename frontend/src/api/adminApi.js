import api from './index';

export const listUsers = params => api.get('/admin/users', { params });

export const getUser = userId => api.get(`/admin/users/${userId}`);

export const updateUser = (userId, payload) => api.patch(`/admin/users/${userId}`, payload);

export const assignUserRole = (userId, payload) => api.post(`/admin/users/${userId}/roles`, payload);

export const revokeUserRole = (userId, role) => api.delete(`/admin/users/${userId}/roles/${role}`);

export const revokeUserSession = (userId, sessionId) => api.delete(`/admin/users/${userId}/sessions/${sessionId}`);

export const createInvite = payload => api.post('/admin/invites', payload);

export const listInvites = () => api.get('/admin/invites');

export const getAuditLogs = params => api.get('/admin/audit', { params });