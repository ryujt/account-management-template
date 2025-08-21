import api from './index';

export const authApi = {
  // 관리자 로그인
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  // 로그아웃
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  // 토큰 갱신
  refreshToken: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },

  // 비밀번호 변경 (관리자용)
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.patch('/me/password', {
      currentPassword,
      newPassword
    });
    return response.data;
  }
};