import { create } from 'zustand';
import * as authApi from '../api/auth';

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, accessToken) =>
    set({ user, accessToken, isAuthenticated: true, isLoading: false }),

  clearAuth: () =>
    set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false }),

  login: async (email, password) => {
    const data = await authApi.login(email, password);
    set({
      user: data.user,
      accessToken: data.accessToken,
      isAuthenticated: true,
      isLoading: false,
    });
    return data;
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // proceed with local logout even if API fails
    }
    set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
  },

  refresh: async () => {
    try {
      const data = await authApi.refresh();
      const currentUser = get().user;
      // Merge user data from refresh response if available, keep existing user if not
      const user = data.user
        ? { ...currentUser, ...data.user }
        : currentUser;
      set({
        user,
        accessToken: data.accessToken,
        isAuthenticated: !!user,
        isLoading: false,
      });
      return data;
    } catch {
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
      throw new Error('Refresh failed');
    }
  },

  initialize: async () => {
    try {
      await get().refresh();
    } catch {
      // already cleared in refresh
    }
  },
}));
