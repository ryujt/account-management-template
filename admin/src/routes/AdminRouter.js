import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminLayout from '../layouts/AdminLayout';

// 페이지 컴포넌트들
import AdminLogin from '../pages/AdminLogin';
import AdminDashboard from '../pages/AdminDashboard';
import AdminUserList from '../pages/AdminUserList';
import AdminUserDetail from '../pages/AdminUserDetail';
import AdminAuditLog from '../pages/AdminAuditLog';

// 향후 구현될 페이지들 (임시)
const AdminSettings = () => (
  <div className="page-container">
    <h1>시스템 설정</h1>
    <p>시스템 설정 페이지입니다. (구현 예정)</p>
  </div>
);

const AdminRoles = () => (
  <div className="page-container">
    <h1>역할 관리</h1>
    <p>역할 관리 페이지입니다. (구현 예정)</p>
  </div>
);

const AdminProfile = () => (
  <div className="page-container">
    <h1>내 프로필</h1>
    <p>프로필 페이지입니다. (구현 예정)</p>
  </div>
);

const AdminUserCreate = () => (
  <div className="page-container">
    <h1>사용자 생성</h1>
    <p>사용자 생성 페이지입니다. (구현 예정)</p>
  </div>
);

const NotFound = () => (
  <div className="page-container">
    <h1>404 - 페이지를 찾을 수 없습니다</h1>
    <p>요청하신 페이지가 존재하지 않습니다.</p>
  </div>
);

const AdminRouter = () => {
  return (
    <Router>
      <Routes>
        {/* 로그인 페이지 (보호되지 않음) */}
        <Route path="/login" element={<AdminLogin />} />
        
        {/* 보호된 관리자 라우트들 */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* 대시보드 (기본 페이지) */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          
          {/* 사용자 관리 */}
          <Route path="users" element={<AdminUserList />} />
          <Route path="users/create" element={<AdminUserCreate />} />
          <Route path="users/:userId" element={<AdminUserDetail />} />
          
          {/* 역할 관리 */}
          <Route path="roles" element={<AdminRoles />} />
          
          {/* 감사 로그 */}
          <Route path="audit-logs" element={<AdminAuditLog />} />
          
          {/* 설정 */}
          <Route path="settings" element={<AdminSettings />} />
          
          {/* 내 프로필 */}
          <Route path="profile" element={<AdminProfile />} />
        </Route>

        {/* Super Admin 전용 라우트 (향후 구현) */}
        <Route
          path="/super-admin/*"
          element={
            <ProtectedRoute requireRole="super_admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Super Admin 페이지들... */}
        </Route>

        {/* 404 페이지 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default AdminRouter;