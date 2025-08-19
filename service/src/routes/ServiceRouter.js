import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { setAuthToken } from '../api/index';
import LoadingSpinner from '../components/LoadingSpinner';
import ServiceLayout from '../layouts/ServiceLayout';

const Home = lazy(() => import('../pages/Home'));
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/ResetPassword'));
const Profile = lazy(() => import('../pages/Profile'));

function AuthInitializer({ children }) {
  const { accessToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      setAuthToken(accessToken);
    }
  }, [accessToken, isAuthenticated]);

  return children;
}

export default function ServiceRouter() {
  return (
    <BrowserRouter>
      <AuthInitializer>
        <LoadingSpinner />
        <ServiceLayout>
          <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ServiceLayout>
      </AuthInitializer>
    </BrowserRouter>
  );
}