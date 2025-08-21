import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const Home = () => {
  const { user } = useAuthStore();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return '좋은 새벽';
    if (hour < 12) return '좋은 아침';
    if (hour < 18) return '좋은 오후';
    return '좋은 저녁';
  };

  return (
    <div className="home-container">
      {/* Welcome Section */}
      <div className="welcome-section">
        <div className="welcome-content">
          <h1>
            {getGreeting()}입니다, {user?.displayName || '사용자'}님!
          </h1>
          <p className="welcome-subtitle">
            Account Management Service에 오신 것을 환영합니다
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <div className="section-header">
          <h2>빠른 실행</h2>
        </div>
        <div className="quick-actions-grid">
          <Link to="/profile" className="quick-action-card">
            <div className="action-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
              </svg>
            </div>
            <h3>내 프로필</h3>
            <p>프로필 정보 확인 및 수정</p>
          </Link>

          {user?.roles?.includes('admin') && (
            <a href="/admin" className="quick-action-card">
              <div className="action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM12 7C13.1 7 14 7.9 14 9S13.1 11 12 11 10 10.1 10 9 10.9 7 12 7ZM18 15C18 16.93 16.84 19.24 12 19.24S6 16.93 6 15C6 13.45 8.69 12.24 12 12.24S18 13.45 18 15Z" fill="currentColor"/>
                </svg>
              </div>
              <h3>관리자 페이지</h3>
              <p>사용자 및 시스템 관리</p>
            </a>
          )}
        </div>
      </div>

      {/* Account Overview */}
      <div className="account-overview-section">
        <div className="section-header">
          <h2>계정 개요</h2>
        </div>
        <div className="overview-grid">
          <div className="overview-card">
            <div className="overview-header">
              <h3>계정 상태</h3>
            </div>
            <div className="overview-content">
              <div className="status-item">
                <span className="status-label">이메일 인증</span>
                <span className={`status-value ${user?.emailVerified ? 'verified' : 'unverified'}`}>
                  {user?.emailVerified ? '인증됨' : '미인증'}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">계정 상태</span>
                <span className={`status-value ${user?.status || 'active'}`}>
                  {user?.status === 'active' ? '활성' : '비활성'}
                </span>
              </div>
              {user?.roles && user.roles.length > 0 && (
                <div className="status-item">
                  <span className="status-label">역할</span>
                  <div className="status-value">
                    {user.roles.map(role => (
                      <span key={role} className="role-tag">
                        {role === 'admin' ? '관리자' : role}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="overview-card">
            <div className="overview-header">
              <h3>가입 정보</h3>
            </div>
            <div className="overview-content">
              <div className="info-item">
                <span className="info-label">이메일</span>
                <span className="info-value">{user?.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">이름</span>
                <span className="info-value">{user?.displayName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">가입일</span>
                <span className="info-value">
                  {user?.createdAt ? formatDate(user.createdAt) : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="help-section">
        <div className="help-content">
          <h3>도움이 필요하신가요?</h3>
          <p>
            계정 관련 문의사항이나 기술적 문제가 있으시면 언제든지 문의해주세요.
          </p>
          <div className="help-actions">
            <button className="btn-secondary" onClick={() => window.location.href = 'mailto:support@example.com'}>
              문의하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;