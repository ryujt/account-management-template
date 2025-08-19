import React from 'react';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/authApi';
import '../styles/layout.css';

export default function AdminLayout({ children }) {
  const { user, isAuthenticated, logout } = useAuthStore();
  
  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      window.location.href = '/login';
    }
  };

  return (
    <div className="main-layout">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">
            <a href="/">Admin Dashboard</a>
          </h1>
          <nav className="nav">
            {isAuthenticated ? (
              <>
                <span className="user-info">
                  {user?.displayName} (관리자)
                </span>
                <a href="http://localhost:3001" className="nav-link" target="_blank" rel="noopener noreferrer">서비스 페이지</a>
                <button onClick={handleLogout} className="btn btn-outline">
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <a href="/login" className="nav-link">로그인</a>
                <a href="http://localhost:3001" className="nav-link">서비스 페이지</a>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="main">
        {children}
      </main>
    </div>
  );
}