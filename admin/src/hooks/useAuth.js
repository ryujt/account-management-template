import useAuthStore from '../stores/authStore';

export default function useAuth() {
  const { user, isAuthenticated, login, logout } = useAuthStore();

  const isAdmin = user?.roles?.includes('admin') ?? false;

  return { user, isAuthenticated, isAdmin, login, logout };
}
