import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdminStore } from '@stores/adminStore';
import '@styles/AdminDashboard.css';

export default function AdminDashboard() {
  const { users, invites, listUsers, listInvites, clearUsers } = useAdminStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        clearUsers();
        await listUsers('', '', '', null);
        await listInvites();
      } catch (err) {
        console.error('Admin dashboard load error:', err);
      }
    };
    loadData();
  }, [listUsers, listInvites, clearUsers]);

  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.status === 'active').length;
  const adminUsers = users.filter(user => user.roles?.includes('admin')).length;
  const unverifiedUsers = users.filter(user => !user.emailVerified).length;
  const activeInvites = invites.filter(invite => invite.expiresAt > Date.now() / 1000).length;

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>관리자 대시보드</h1>
        <p>시스템 전반을 관리하고 모니터링하세요.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{totalUsers}</div>
          <div className="stat-label">전체 사용자</div>
          <Link to="/admin/users" className="stat-link">상세 보기</Link>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{activeUsers}</div>
          <div className="stat-label">활성 사용자</div>
          <Link to="/admin/users?status=active" className="stat-link">상세 보기</Link>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{adminUsers}</div>
          <div className="stat-label">관리자</div>
          <Link to="/admin/users?role=admin" className="stat-link">상세 보기</Link>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{unverifiedUsers}</div>
          <div className="stat-label">미인증 사용자</div>
          <div className="stat-description">이메일 인증 필요</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{activeInvites}</div>
          <div className="stat-label">활성 초대</div>
          <Link to="/admin/invites" className="stat-link">상세 보기</Link>
        </div>
      </div>

      <div className="admin-actions">
        <h2>빠른 작업</h2>
        <div className="actions-grid">
          <Link to="/admin/users" className="action-card">
            <div className="action-icon">👥</div>
            <div className="action-title">사용자 관리</div>
            <div className="action-description">사용자 목록, 권한, 상태 관리</div>
          </Link>

          <Link to="/admin/invites" className="action-card">
            <div className="action-icon">✉️</div>
            <div className="action-title">초대 관리</div>
            <div className="action-description">초대 코드 발급 및 관리</div>
          </Link>

          <Link to="/admin/audit" className="action-card">
            <div className="action-icon">📋</div>
            <div className="action-title">감사 로그</div>
            <div className="action-description">시스템 활동 기록 조회</div>
          </Link>

          <Link to="/admin/settings" className="action-card">
            <div className="action-icon">⚙️</div>
            <div className="action-title">시스템 설정</div>
            <div className="action-description">시스템 구성 및 설정</div>
          </Link>
        </div>
      </div>

      <div className="recent-activity">
        <h2>최근 활동</h2>
        <div className="activity-summary">
          <div className="activity-item">
            <span className="activity-icon">👤</span>
            <span className="activity-text">총 {totalUsers}명의 사용자가 등록되어 있습니다.</span>
          </div>
          <div className="activity-item">
            <span className="activity-icon">✅</span>
            <span className="activity-text">{activeUsers}명의 사용자가 활성 상태입니다.</span>
          </div>
          {unverifiedUsers > 0 && (
            <div className="activity-item warning">
              <span className="activity-icon">⚠️</span>
              <span className="activity-text">{unverifiedUsers}명의 사용자가 이메일 인증을 완료하지 않았습니다.</span>
            </div>
          )}
          <div className="activity-item">
            <span className="activity-icon">🎫</span>
            <span className="activity-text">{activeInvites}개의 활성 초대가 있습니다.</span>
          </div>
        </div>
      </div>
    </div>
  );
}