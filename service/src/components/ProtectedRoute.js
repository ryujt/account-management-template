import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const ProtectedRoute = ({ children, requireRole = null }) => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();

  // 인증되지 않은 경우
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // 특정 역할이 필요한 경우
  if (requireRole && (!user?.roles || !user.roles.includes(requireRole))) {
    return (
      <Navigate 
        to="/" 
        replace 
      />
    );
  }

  return children;
};

export default ProtectedRoute;