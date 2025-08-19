import React from 'react';
import { useAuthStore } from '../stores/authStore';
import '../styles/pages.css';

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="page-container">
      <div className="hero-section">
        <h1>계정 관리 시스템</h1>
        <p>사용자 인증과 관리를 위한 서비스입니다.</p>
        
        {isAuthenticated ? (
          <div className="welcome-section">
            <h2>환영합니다, {user?.displayName}님!</h2>
            <div className="user-info">
              <p>이메일: {user?.email}</p>
              <p>역할: {user?.roles?.join(', ')}</p>
              <p>이메일 인증: {user?.emailVerified ? '완료' : '미완료'}</p>
            </div>
            <div className="action-buttons">
              <a href="/profile" className="btn btn-primary">프로필 관리</a>
              {user?.roles?.includes('admin') && (
                <a href="http://localhost:3002" className="btn btn-secondary" target="_blank" rel="noopener noreferrer">관리자 대시보드</a>
              )}
            </div>
          </div>
        ) : (
          <div className="auth-section">
            <h2>시작하기</h2>
            <p>계정을 만들거나 로그인하여 서비스를 이용하세요.</p>
            <div className="action-buttons">
              <a href="/register" className="btn btn-primary">회원가입</a>
              <a href="/login" className="btn btn-outline">로그인</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}