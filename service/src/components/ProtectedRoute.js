import React from 'react';
import { useAuthStore } from '../stores/authStore';

export default function ProtectedRoute({ children, requireAuth = true }) {
  const { isAuthenticated } = useAuthStore();
  
  if (requireAuth && !isAuthenticated) {
    window.location.href = '/login';
    return null;
  }
  
  return children;
}