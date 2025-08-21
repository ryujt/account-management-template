import api from './index';

export const authApi = {
  // 회원가입
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // 로그인
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

  // 이메일 인증
  verifyEmail: async (token) => {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  },

  // 비밀번호 재설정 요청
  forgotPassword: async (email) => {
    const response = await api.post('/auth/password/forgot', { email });
    return response.data;
  },

  // 비밀번호 재설정
  resetPassword: async (token, password) => {
    const response = await api.post('/auth/password/reset', { token, password });
    return response.data;
  },

  // 구글 OAuth URL 가져오기
  getGoogleOAuthUrl: async () => {
    const response = await api.get('/auth/oauth/google');
    return response.data;
  },

  // 구글 OAuth 콜백 처리
  handleGoogleCallback: async (code, state) => {
    const response = await api.get(`/auth/oauth/google/callback?code=${code}&state=${state}`);
    return response.data;
  }
};