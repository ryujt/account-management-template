import { create } from 'zustand';
import { listUsers, getUser, updateUser, assignUserRole, revokeUserRole, revokeUserSession, createInvite, listInvites, getAuditLogs } from '@api/adminApi';

export const useAdminStore = create((set, get) => ({
  users: [],
  selectedUser: null,
  invites: [],
  auditLogs: [],
  usersCursor: null,
  auditCursor: null,
  status: 'idle',
  error: null,

  listUsers: async (query = '', role = '', status = '', cursor = null) => {
    set({ status: 'loading', error: null });
    try {
      const data = await listUsers({ query, role, status, cursor });
      const isNewQuery = !cursor;
      set({
        users: isNewQuery ? data.items : [...get().users, ...data.items],
        usersCursor: data.nextCursor,
        status: 'success'
      });
      return data;
    } catch (e) {
      set({ error: e.message, status: 'error' });
      throw e;
    }
  },

  getUser: async userId => {
    set({ error: null });
    try {
      const data = await getUser(userId);
      set({ selectedUser: data });
      return data;
    } catch (e) {
      set({ error: e.message });
      throw e;
    }
  },

  updateUser: async (userId, payload) => {
    set({ error: null });
    try {
      const data = await updateUser(userId, payload);
      if (get().selectedUser && get().selectedUser.user.userId === userId) {
        set({
          selectedUser: {
            ...get().selectedUser,
            user: { ...get().selectedUser.user, ...payload }
          }
        });
      }
      set({
        users: get().users.map(user =>
          user.userId === userId ? { ...user, ...payload } : user
        )
      });
      return data;
    } catch (e) {
      set({ error: e.message });
      throw e;
    }
  },

  assignRole: async (userId, role) => {
    set({ error: null });
    try {
      const data = await assignUserRole(userId, { role });
      if (get().selectedUser && get().selectedUser.user.userId === userId) {
        const currentRoles = get().selectedUser.user.roles || [];
        set({
          selectedUser: {
            ...get().selectedUser,
            user: {
              ...get().selectedUser.user,
              roles: [...currentRoles, role]
            }
          }
        });
      }
      set({
        users: get().users.map(user =>
          user.userId === userId
            ? { ...user, roles: [...(user.roles || []), role] }
            : user
        )
      });
      return data;
    } catch (e) {
      set({ error: e.message });
      throw e;
    }
  },

  revokeRole: async (userId, role) => {
    set({ error: null });
    try {
      const data = await revokeUserRole(userId, role);
      if (get().selectedUser && get().selectedUser.user.userId === userId) {
        const currentRoles = get().selectedUser.user.roles || [];
        set({
          selectedUser: {
            ...get().selectedUser,
            user: {
              ...get().selectedUser.user,
              roles: currentRoles.filter(r => r !== role)
            }
          }
        });
      }
      set({
        users: get().users.map(user =>
          user.userId === userId
            ? { ...user, roles: (user.roles || []).filter(r => r !== role) }
            : user
        )
      });
      return data;
    } catch (e) {
      set({ error: e.message });
      throw e;
    }
  },

  revokeSession: async (userId, sessionId) => {
    set({ error: null });
    try {
      const data = await revokeUserSession(userId, sessionId);
      if (get().selectedUser && get().selectedUser.user.userId === userId) {
        set({
          selectedUser: {
            ...get().selectedUser,
            sessions: get().selectedUser.sessions.filter(s => s.sessionId !== sessionId)
          }
        });
      }
      return data;
    } catch (e) {
      set({ error: e.message });
      throw e;
    }
  },

  createInvite: async payload => {
    set({ error: null });
    try {
      const data = await createInvite(payload);
      return data;
    } catch (e) {
      set({ error: e.message });
      throw e;
    }
  },

  listInvites: async () => {
    set({ error: null });
    try {
      const data = await listInvites();
      set({ invites: data.items || [] });
      return data;
    } catch (e) {
      set({ error: e.message });
      throw e;
    }
  },

  getAuditLogs: async (actor = '', action = '', from = '', to = '', cursor = null) => {
    set({ error: null });
    try {
      const data = await getAuditLogs({ actor, action, from, to, cursor });
      const isNewQuery = !cursor;
      set({
        auditLogs: isNewQuery ? data.items : [...get().auditLogs, ...data.items],
        auditCursor: data.nextCursor
      });
      return data;
    } catch (e) {
      set({ error: e.message });
      throw e;
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    users: [],
    selectedUser: null,
    invites: [],
    auditLogs: [],
    usersCursor: null,
    auditCursor: null,
    status: 'idle',
    error: null
  }),

  clearUsers: () => set({ users: [], usersCursor: null }),
  clearAuditLogs: () => set({ auditLogs: [], auditCursor: null })
}));