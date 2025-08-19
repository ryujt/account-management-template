import api from './index';

export const authApi = {
  register: (email, password, displayName) => {
    // displayName을 firstName과 lastName으로 분리
    const names = displayName.trim().split(' ');
    const firstName = names[0] || displayName;
    const lastName = names.slice(1).join(' ') || '';
    
    return api.post('/auth/register', { 
      email, 
      password, 
      firstName,
      lastName 
    });
  },
  
  login: (email, password) => 
    api.post('/auth/login', { email, password }),
  
  refresh: () => 
    api.post('/auth/refresh'),
  
  logout: () => 
    api.post('/auth/logout'),
  
  verifyEmail: (token) => 
    api.post('/auth/verify-email', { token }),
  
  forgotPassword: (email) => 
    api.post('/auth/password/forgot', { email }),
  
  resetPassword: (token, newPassword) => 
    api.post('/auth/password/reset', { token, newPassword })
};