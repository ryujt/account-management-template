import React, { useEffect } from 'react';
import { useAuthStore } from '@stores/authStore';
import { useUserStore } from '@stores/userStore';
import '@styles/Dashboard.css';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { profile, fetchProfile } = useUserStore();

  useEffect(() => {
    fetchProfile().catch(console.error);
  }, [fetchProfile]);

  const displayProfile = profile || user;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>대시보드</h1>
        <p>{displayProfile?.displayName}님, 환영합니다!</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h2>내 정보</h2>
          <div className="info-list">
            <div className="info-item">
              <span className="info-label">이메일:</span>
              <span className="info-value">{displayProfile?.email}</span>
            </div>
            <div className="info-item">
              <span className="info-label">이름:</span>
              <span className="info-value">{displayProfile?.displayName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">이메일 인증:</span>
              <span className={`info-value ${displayProfile?.emailVerified ? 'verified' : 'unverified'}`}>
                {displayProfile?.emailVerified ? '인증 완료' : '인증 필요'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">역할:</span>
              <span className="info-value">
                {displayProfile?.roles?.map(role => {
                  const roleLabels = { member: '일반 사용자', admin: '관리자', manager: '매니저' };
                  return roleLabels[role] || role;
                }).join(', ')}
              </span>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <h2>빠른 액세스</h2>
          <div className="quick-actions">
            <a href="/profile" className="action-link">
              프로필 수정
            </a>
            <a href="/profile/sessions" className="action-link">
              활성 세션 관리
            </a>
            {displayProfile?.roles?.includes('admin') && (
              <>
                <a href="/admin" className="action-link admin-link">
                  관리자 대시보드
                </a>
                <a href="/admin/users" className="action-link admin-link">
                  사용자 관리
                </a>
              </>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <h2>계정 상태</h2>
          <div className="status-list">
            <div className="status-item">
              <span className="status-icon">
                {displayProfile?.emailVerified ? '✅' : '⚠️'}
              </span>
              <span className="status-text">
                {displayProfile?.emailVerified 
                  ? '이메일 인증이 완료되었습니다.' 
                  : '이메일 인증이 필요합니다.'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-icon">🔒</span>
              <span className="status-text">계정이 안전하게 보호되고 있습니다.</span>
            </div>
            {displayProfile?.roles?.includes('admin') && (
              <div className="status-item">
                <span className="status-icon">🛡️</span>
                <span className="status-text">관리자 권한이 부여되어 있습니다.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}