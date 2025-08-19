import api from './index';

export const adminApi = {
  getUsers: (params) => 
    api.get('/admin/users', { params }),
  
  getUser: (userId) => 
    api.get(`/admin/users/${userId}`),
  
  updateUser: (userId, data) => 
    api.patch(`/admin/users/${userId}`, data),
  
  assignRole: (userId, role) => 
    api.post(`/admin/users/${userId}/roles`, { role }),
  
  removeRole: (userId, role) => 
    api.delete(`/admin/users/${userId}/roles/${role}`),
  
  createInvite: (role, expiresInHours) => 
    api.post('/admin/invites', { role, expiresInHours }),
  
  getAuditLogs: (params) => 
    api.get('/admin/audit', { params })
};