import { create } from 'zustand';
import { getProfile, updateProfile, getUserSessions, revokeUserSession } from '@api/userApi';

export const useUserStore = create((set, get) => ({
  profile: null,
  sessions: [],
  status: 'idle',
  error: null,

  fetchProfile: async () => {
    set({ status: 'loading', error: null });
    try {
      const data = await getProfile();
      set({ profile: data, status: 'success' });
      return data;
    } catch (e) {
      set({ error: e.message, status: 'error' });
      throw e;
    }
  },

  updateProfile: async payload => {
    set({ error: null });
    try {
      const data = await updateProfile(payload);
      if (get().profile) {
        set({ profile: { ...get().profile, ...payload } });
      }
      return data;
    } catch (e) {
      set({ error: e.message });
      throw e;
    }
  },

  fetchSessions: async () => {
    set({ error: null });
    try {
      const data = await getUserSessions();
      set({ sessions: data.items || [] });
      return data;
    } catch (e) {
      set({ error: e.message });
      throw e;
    }
  },

  revokeSession: async sessionId => {
    set({ error: null });
    try {
      const data = await revokeUserSession(sessionId);
      set({ sessions: get().sessions.filter(s => s.sessionId !== sessionId) });
      return data;
    } catch (e) {
      set({ error: e.message });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
  
  reset: () => set({ profile: null, sessions: [], status: 'idle', error: null })
}));