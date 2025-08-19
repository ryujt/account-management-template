import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { setAuthToken } from '../api/index';
import LoadingSpinner from '../components/LoadingSpinner';
import AdminLayout from '../layouts/AdminLayout';

const AdminLogin = lazy(() => import('../pages/AdminLogin'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const AdminUserDetail = lazy(() => import('../pages/AdminUserDetail'));
const AdminAuditLog = lazy(() => import('../pages/AdminAuditLog'));

function AuthInitializer({ children }) {
  const { accessToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      setAuthToken(accessToken);
    }
  }, [accessToken, isAuthenticated]);

  return children;
}

export default function AdminRouter() {
  return (
    <BrowserRouter>
      <AuthInitializer>
        <LoadingSpinner />
        <AdminLayout>
          <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
            <Routes>
              <Route path="/login" element={<AdminLogin />} />
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/users" element={<AdminDashboard />} />
              <Route path="/users/:userId" element={<AdminUserDetail />} />
              <Route path="/audit" element={<AdminAuditLog />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AdminLayout>
      </AuthInitializer>
    </BrowserRouter>
  );
}