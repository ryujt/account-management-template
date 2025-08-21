import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // 상태
      isAuthenticated: false,
      accessToken: null,
      user: null,
      rememberEmail: false,
      savedEmail: '',

      // 액션
      setAccessToken: (token) => {
        set({ 
          accessToken: token,
          isAuthenticated: !!token 
        });
      },

      setUser: (user) => {
        set({ user });
      },

      login: (accessToken, user) => {
        set({
          isAuthenticated: true,
          accessToken,
          user
        });
      },

      logout: () => {
        set({
          isAuthenticated: false,
          accessToken: null,
          user: null
        });
        // localStorage에서 인증 관련 데이터만 제거 (이메일 저장은 유지)
        const currentState = get();
        localStorage.setItem('admin-auth-storage', JSON.stringify({
          state: {
            rememberEmail: currentState.rememberEmail,
            savedEmail: currentState.savedEmail,
            isAuthenticated: false,
            accessToken: null,
            user: null
          },
          version: 0
        }));
      },

      setSavedEmail: (email) => {
        set({ savedEmail: email });
      },

      setRememberEmail: (remember) => {
        set({ rememberEmail: remember });
        if (!remember) {
          set({ savedEmail: '' });
        }
      },

      // 유틸리티
      hasRole: (role) => {
        const { user } = get();
        return user?.roles?.includes(role) || false;
      },

      isAdmin: () => {
        return get().hasRole('admin');
      },

      // 관리자 여부 확인 (더 엄격한 체크)
      isValidAdmin: () => {
        const { user, isAuthenticated } = get();
        return isAuthenticated && user && (user.roles?.includes('admin') || user.roles?.includes('super_admin'));
      }
    }),
    {
      name: 'admin-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        rememberEmail: state.rememberEmail,
        savedEmail: state.savedEmail
      })
    }
  )
);