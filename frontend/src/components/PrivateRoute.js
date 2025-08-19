import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';

export default function PrivateRoute({ children, requiredRole = null }) {
  const { isAuthenticated, user, hasRole, refresh } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated) {
        try {
          await refresh();
        } catch (err) {
          console.error('Token refresh failed:', err);
        }
      }
      setIsChecking(false);
    };

    checkAuth();
  }, [isAuthenticated, refresh]);

  if (isChecking) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        로딩 중...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}