import api from './index';

export const userApi = {
  getMe: () => 
    api.get('/me'),
  
  updateMe: (data) => 
    api.patch('/me', data)
};