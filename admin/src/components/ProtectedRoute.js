import React from 'react';
import { useAuthStore } from '../stores/authStore';

export default function ProtectedRoute({ children, requireAuth = true, requireAdmin = false }) {
  const { isAuthenticated, user } = useAuthStore();
  
  if (requireAuth && !isAuthenticated) {
    window.location.href = '/login';
    return null;
  }
  
  if (requireAdmin && (!user || !user.roles?.includes('admin'))) {
    return (
      <div className="error-container">
        <h2>접근 권한이 없습니다</h2>
        <p>관리자 권한이 필요한 페이지입니다.</p>
        <a href="http://localhost:3001" className="btn btn-primary">서비스 페이지로 이동</a>
      </div>
    );
  }
  
  return children;
}