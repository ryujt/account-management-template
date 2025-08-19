import api from './index';

export const register = payload => api.post('/auth/register', payload);

export const login = payload => api.post('/auth/login', payload);

export const refresh = () => api.post('/auth/refresh');

export const logout = payload => api.post('/auth/logout', payload);

export const verifyEmail = payload => api.post('/auth/verify-email', payload);

export const forgotPassword = payload => api.post('/auth/password/forgot', payload);

export const resetPassword = payload => api.post('/auth/password/reset', payload);

export const redeemInvite = payload => api.post('/auth/invites/redeem', payload);