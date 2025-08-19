import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      
      setAuth: (accessToken, user) => {
        set({
          accessToken,
          user,
          isAuthenticated: true
        });
      },
      
      updateUser: (userData) => {
        set({
          user: { ...get().user, ...userData }
        });
      },
      
      logout: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false
        });
      },
      
      hasRole: (role) => {
        const user = get().user;
        return user && user.roles && user.roles.includes(role);
      },
      
      isAdmin: () => {
        return get().hasRole('admin');
      }
    }),
    {
      name: 'service-auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);