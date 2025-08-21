import api from './index';

export const userApi = {
  // 내 프로필 조회
  getMyProfile: async () => {
    const response = await api.get('/me');
    return response.data;
  },

  // 내 프로필 수정
  updateMyProfile: async (userData) => {
    const response = await api.patch('/me', userData);
    return response.data;
  }
};