import { create } from 'zustand';
import * as authApi from '../api/auth';
import client from '../api/client';

const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  setAuth: (user, accessToken) => {
    set({ user, accessToken, isAuthenticated: true });
  },

  clearAuth: () => {
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  login: async (email, password) => {
    const data = await authApi.login(email, password);
    if (!data.user.roles?.includes('admin')) {
      throw new Error('Access denied. Admin role required.');
    }
    set({
      user: data.user,
      accessToken: data.accessToken,
      isAuthenticated: true,
    });
    return data;
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      get().clearAuth();
    }
  },

  refresh: async () => {
    const data = await authApi.refresh();
    set({ accessToken: data.accessToken });
    return data;
  },

  initialize: async () => {
    try {
      const data = await authApi.refresh();
      set({ accessToken: data.accessToken });

      // Fetch user info to check admin role
      const { data: userInfo } = await client.get('/user/info');

      if (!userInfo.roles?.includes('admin')) {
        get().clearAuth();
        return;
      }

      set({
        user: userInfo,
        accessToken: data.accessToken,
        isAuthenticated: true,
      });
    } catch {
      get().clearAuth();
    }
  },
}));

export default useAuthStore;
