import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { register, login, refresh, logout, verifyEmail, forgotPassword, resetPassword, redeemInvite } from '@api/authApi';
import { setAuthToken } from '@api/index';

export const useAuthStore = create(
  subscribeWithSelector((set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      error: null,
      
      setUser: (user, accessToken) => {
        setAuthToken(accessToken);
        set({
          user,
          accessToken,
          isAuthenticated: true,
          error: null
        });
      },

      clearAuth: () => {
        setAuthToken(null);
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          error: null
        });
      },

      register: async payload => {
        set({ error: null });
        try {
          const data = await register(payload);
          return data;
        } catch (e) {
          set({ error: e.message });
          throw e;
        }
      },

      login: async payload => {
        set({ error: null });
        try {
          const data = await login(payload);
          get().setUser(data.user, data.accessToken);
          return data;
        } catch (e) {
          set({ error: e.message });
          throw e;
        }
      },

      refresh: async () => {
        try {
          const data = await refresh();
          set({ accessToken: data.accessToken });
          setAuthToken(data.accessToken);
          return data;
        } catch (e) {
          get().clearAuth();
          throw e;
        }
      },

      logout: async () => {
        const { user } = get();
        try {
          if (user) {
            await logout({ userId: user.userId });
          }
        } catch (e) {
          console.error('Logout error:', e);
        } finally {
          get().clearAuth();
        }
      },

      verifyEmail: async payload => {
        set({ error: null });
        try {
          const data = await verifyEmail(payload);
          return data;
        } catch (e) {
          set({ error: e.message });
          throw e;
        }
      },

      forgotPassword: async payload => {
        set({ error: null });
        try {
          const data = await forgotPassword(payload);
          return data;
        } catch (e) {
          set({ error: e.message });
          throw e;
        }
      },

      resetPassword: async payload => {
        set({ error: null });
        try {
          const data = await resetPassword(payload);
          return data;
        } catch (e) {
          set({ error: e.message });
          throw e;
        }
      },

      redeemInvite: async payload => {
        set({ error: null });
        try {
          const data = await redeemInvite(payload);
          return data;
        } catch (e) {
          set({ error: e.message });
          throw e;
        }
      },

      hasRole: role => {
        const { user } = get();
        return user && user.roles && user.roles.includes(role);
      },

      isAdmin: () => get().hasRole('admin'),

      clearError: () => set({ error: null })
    }))
);