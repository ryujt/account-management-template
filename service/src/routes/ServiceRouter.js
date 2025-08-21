import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useLoadingStore } from '../stores/loadingStore';
import { userApi } from '../api/userApi';

// Layout
import ServiceLayout from '../layouts/ServiceLayout';

// Components
import ProtectedRoute from '../components/ProtectedRoute';
import LoadingSpinner from '../components/LoadingSpinner';

// Pages
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import Profile from '../pages/Profile';

const ServiceRouter = () => {
  const { isAuthenticated, accessToken, setUser, logout } = useAuthStore();
  const { isLoading, setLoading } = useLoadingStore();

  // 앱 초기화 시 사용자 정보 로드
  useEffect(() => {
    const initializeAuth = async () => {
      if (isAuthenticated && accessToken) {
        setLoading(true);
        try {
          const response = await userApi.getMyProfile();
          setUser(response.user);
        } catch (error) {
          console.error('Failed to load user profile:', error);
          // 토큰이 유효하지 않은 경우 로그아웃
          if (error.response?.status === 401) {
            logout();
          }
        } finally {
          setLoading(false);
        }
      }
    };

    initializeAuth();
  }, [isAuthenticated, accessToken, setUser, logout, setLoading]);

  // 앱 로딩 중일 때 표시할 컴포넌트
  if (isLoading) {
    return (
      <div className="app-loading">
        <LoadingSpinner size="large" />
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes - 인증이 필요하지 않은 페이지들 */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Login />
          )
        } 
      />
      <Route 
        path="/register" 
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Register />
          )
        } 
      />
      <Route 
        path="/forgot-password" 
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <ForgotPassword />
          )
        } 
      />
      <Route 
        path="/reset-password" 
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <ResetPassword />
          )
        } 
      />

      {/* Protected Routes - 인증이 필요한 페이지들 */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ServiceLayout>
              <Home />
            </ServiceLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ServiceLayout>
              <Profile />
            </ServiceLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch all route - 404 페이지 */}
      <Route
        path="*"
        element={
          <div className="error-page">
            <div className="error-content">
              <h1>404</h1>
              <h2>페이지를 찾을 수 없습니다</h2>
              <p>요청하신 페이지가 존재하지 않습니다.</p>
              <div className="error-actions">
                {isAuthenticated ? (
                  <ServiceLayout>
                    <div className="error-actions-content">
                      <button 
                        onClick={() => window.history.back()}
                        className="btn-secondary"
                      >
                        이전 페이지로
                      </button>
                      <a href="/" className="btn-primary">
                        홈으로 이동
                      </a>
                    </div>
                  </ServiceLayout>
                ) : (
                  <div className="error-actions-content">
                    <a href="/login" className="btn-primary">
                      로그인하기
                    </a>
                    <a href="/register" className="btn-secondary">
                      회원가입하기
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        }
      />
    </Routes>
  );
};

export default ServiceRouter;