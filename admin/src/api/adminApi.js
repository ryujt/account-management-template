import api from './index';

export const adminApi = {
  // 대시보드 통계 조회
  getDashboardStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  // 사용자 목록 조회 (검색/필터/정렬/페이지네이션)
  getUsers: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.query) queryParams.append('query', params.query);
    if (params.role) queryParams.append('role', params.role);
    if (params.status) queryParams.append('status', params.status);
    if (params.cursor) queryParams.append('cursor', params.cursor);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const response = await api.get(`/admin/users?${queryParams}`);
    return response.data;
  },

  // 사용자 상세 조회
  getUserDetail: async (userId) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  // 사용자 정보 수정
  updateUser: async (userId, userData) => {
    const response = await api.patch(`/admin/users/${userId}`, userData);
    return response.data;
  },

  // 사용자 상태 변경 (활성화/비활성화)
  updateUserStatus: async (userId, status) => {
    const response = await api.patch(`/admin/users/${userId}/status`, { status });
    return response.data;
  },

  // 사용자 역할 부여
  assignRole: async (userId, roleName) => {
    const response = await api.post(`/admin/users/${userId}/roles`, { role: roleName });
    return response.data;
  },

  // 사용자 역할 해제
  removeRole: async (userId, roleName) => {
    const response = await api.delete(`/admin/users/${userId}/roles/${roleName}`);
    return response.data;
  },

  // 역할 목록 조회
  getRoles: async () => {
    const response = await api.get('/admin/roles');
    return response.data;
  },

  // 감사 로그 조회
  getAuditLogs: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.action) queryParams.append('action', params.action);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.cursor) queryParams.append('cursor', params.cursor);
    if (params.limit) queryParams.append('limit', params.limit);

    const response = await api.get(`/admin/audit-logs?${queryParams}`);
    return response.data;
  },

  // 사용자 생성 (관리자용)
  createUser: async (userData) => {
    const response = await api.post('/admin/users', userData);
    return response.data;
  },

  // 사용자 삭제
  deleteUser: async (userId) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  // 사용자 세션 목록 조회
  getUserSessions: async (userId) => {
    const response = await api.get(`/admin/users/${userId}/sessions`);
    return response.data;
  },

  // 사용자 세션 종료
  revokeUserSession: async (userId, sessionId) => {
    const response = await api.delete(`/admin/users/${userId}/sessions/${sessionId}`);
    return response.data;
  },

  // 내 프로필 조회
  getMyProfile: async () => {
    const response = await api.get('/me');
    return response.data;
  },

  // 내 프로필 수정
  updateMyProfile: async (profileData) => {
    const response = await api.patch('/me', profileData);
    return response.data;
  }
};