import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoadingSpinner from '@components/LoadingSpinner';
import PrivateRoute from '@components/PrivateRoute';
import AppLayout from '@layouts/AppLayout';

const Landing = lazy(() => import('@pages/Landing'));
const Login = lazy(() => import('@pages/Login'));
const Register = lazy(() => import('@pages/Register'));
const VerifyEmailSent = lazy(() => import('@pages/VerifyEmailSent'));
const VerifyEmail = lazy(() => import('@pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('@pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@pages/ResetPassword'));
const PasswordResetSuccess = lazy(() => import('@pages/PasswordResetSuccess'));

const Dashboard = lazy(() => import('@pages/Dashboard'));
const Profile = lazy(() => import('@pages/Profile'));
const Sessions = lazy(() => import('@pages/Sessions'));

const AdminDashboard = lazy(() => import('@pages/admin/AdminDashboard'));
const UserList = lazy(() => import('@pages/admin/UserList'));
const UserDetail = lazy(() => import('@pages/admin/UserDetail'));
const InviteManagement = lazy(() => import('@pages/admin/InviteManagement'));
const AuditLog = lazy(() => import('@pages/admin/AuditLog'));

export default function AppRouter() {
  return (
    <BrowserRouter>
      <LoadingSpinner />
      <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Landing />} />
            
            <Route path="auth/login" element={<Login />} />
            <Route path="auth/register" element={<Register />} />
            <Route path="auth/verify-email-sent" element={<VerifyEmailSent />} />
            <Route path="auth/verify-email" element={<VerifyEmail />} />
            <Route path="auth/forgot-password" element={<ForgotPassword />} />
            <Route path="auth/reset-password" element={<ResetPassword />} />
            <Route path="auth/password-reset-success" element={<PasswordResetSuccess />} />
            
            <Route path="dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            
            <Route path="profile" element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            } />
            
            <Route path="profile/sessions" element={
              <PrivateRoute>
                <Sessions />
              </PrivateRoute>
            } />
            
            <Route path="admin" element={
              <PrivateRoute requiredRole="admin">
                <AdminDashboard />
              </PrivateRoute>
            } />
            
            <Route path="admin/users" element={
              <PrivateRoute requiredRole="admin">
                <UserList />
              </PrivateRoute>
            } />
            
            <Route path="admin/users/:userId" element={
              <PrivateRoute requiredRole="admin">
                <UserDetail />
              </PrivateRoute>
            } />
            
            <Route path="admin/invites" element={
              <PrivateRoute requiredRole="admin">
                <InviteManagement />
              </PrivateRoute>
            } />
            
            <Route path="admin/audit" element={
              <PrivateRoute requiredRole="admin">
                <AuditLog />
              </PrivateRoute>
            } />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}