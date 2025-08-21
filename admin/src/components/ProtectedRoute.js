import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const ProtectedRoute = ({ children, requireRole = 'admin' }) => {
  const location = useLocation();
  const { isAuthenticated, user, isValidAdmin } = useAuthStore();

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

  // 관리자 권한이 없는 경우
  if (!isValidAdmin()) {
    return (
      <Navigate 
        to="/login" 
        state={{ 
          from: location,
          error: '관리자 권한이 필요합니다.' 
        }} 
        replace 
      />
    );
  }

  // 특정 역할이 필요한 경우 (super_admin 등)
  if (requireRole && requireRole !== 'admin' && (!user?.roles || !user.roles.includes(requireRole))) {
    return (
      <Navigate 
        to="/dashboard" 
        state={{ 
          error: '접근 권한이 없습니다.' 
        }}
        replace 
      />
    );
  }

  return children;
};

export default ProtectedRoute;