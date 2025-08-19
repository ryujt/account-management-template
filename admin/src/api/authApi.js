import api from './index';

export const authApi = {
  login: (email, password) => 
    api.post('/auth/login', { email, password }),
  
  refresh: () => 
    api.post('/auth/refresh'),
  
  logout: () => 
    api.post('/auth/logout')
};