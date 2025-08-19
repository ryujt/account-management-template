import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminStore } from '@stores/adminStore';
import { ROLE_LABELS, STATUS_LABELS, USER_ROLES } from '@constants/ui';
import '@styles/UserDetail.css';

export default function UserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { selectedUser, getUser, updateUser, assignRole, revokeRole, revokeSession, error, clearError } = useAdminStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    status: 'active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(new Set());

  useEffect(() => {
    if (userId) {
      loadUser();
    }
  }, [userId]);

  useEffect(() => {
    if (selectedUser?.user) {
      setFormData({
        displayName: selectedUser.user.displayName || '',
        status: selectedUser.user.status || 'active'
      });
    }
  }, [selectedUser]);

  const loadUser = async () => {
    try {
      await getUser(userId);
    } catch (err) {
      console.error('Load user error:', err);
      if (err.status === 404) {
        navigate('/admin/users');
      }
    }
  };

  const handleFormChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) clearError();
  };

  const handleUpdateUser = async e => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await updateUser(userId, formData);
      setEditMode(false);
    } catch (err) {
      console.error('Update user error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleAction = async (role, action) => {
    const actionKey = `${action}-${role}`;
    if (actionLoading.has(actionKey)) return;

    setActionLoading(prev => new Set(prev).add(actionKey));
    try {
      if (action === 'assign') {
        await assignRole(userId, role);
      } else {
        await revokeRole(userId, role);
      }
    } catch (err) {
      console.error('Role action error:', err);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionKey);
        return newSet;
      });
    }
  };

  const handleRevokeSession = async sessionId => {
    const actionKey = `revoke-session-${sessionId}`;
    if (actionLoading.has(actionKey)) return;

    setActionLoading(prev => new Set(prev).add(actionKey));
    try {
      await revokeSession(userId, sessionId);
    } catch (err) {
      console.error('Revoke session error:', err);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionKey);
        return newSet;
      });
    }
  };

  const formatDate = dateString => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const formatExpiry = timestamp => {
    return new Date(timestamp * 1000).toLocaleString('ko-KR');
  };

  if (!selectedUser) {
    return (
      <div className="user-detail-page">
        <div className="loading-state">
          <p>사용자 정보를 로딩 중...</p>
        </div>
      </div>
    );
  }

  const { user, sessions } = selectedUser;
  const userRoles = user.roles || [];
  const availableRoles = Object.values(USER_ROLES).filter(role => !userRoles.includes(role));

  return (
    <div className="user-detail-page">
      <div className="page-header">
        <button onClick={() => navigate('/admin/users')} className="back-button">
          ← 사용자 목록으로
        </button>
        <div className="header-info">
          <h1>{user.displayName}</h1>
          <p>{user.email}</p>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="user-detail-content">
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            프로필
          </button>
          <button
            className={`tab-button ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            역할 관리
          </button>
          <button
            className={`tab-button ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => setActiveTab('sessions')}
          >
            세션 ({sessions.length})
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'profile' && (
            <div className="profile-tab">
              <div className="section-header">
                <h2>기본 정보</h2>
                {!editMode ? (
                  <button onClick={() => setEditMode(true)} className="btn btn-secondary">
                    수정
                  </button>
                ) : (
                  <div className="edit-actions">
                    <button onClick={() => setEditMode(false)} className="btn btn-secondary">
                      취소
                    </button>
                  </div>
                )}
              </div>

              {editMode ? (
                <form onSubmit={handleUpdateUser} className="edit-form">
                  <div className="form-group">
                    <label htmlFor="displayName">이름</label>
                    <input
                      type="text"
                      id="displayName"
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleFormChange}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="status">상태</label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleFormChange}
                      disabled={isSubmitting}
                    >
                      <option value="active">활성</option>
                      <option value="disabled">비활성</option>
                    </select>
                  </div>

                  <div className="form-actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? '저장 중...' : '저장'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">사용자 ID:</span>
                    <span className="info-value">{user.userId}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">이메일:</span>
                    <span className="info-value">{user.email}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">이름:</span>
                    <span className="info-value">{user.displayName}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">상태:</span>
                    <span className={`status-badge ${user.status}`}>
                      {STATUS_LABELS[user.status]}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">이메일 인증:</span>
                    <span className={`verification-badge ${user.emailVerified ? 'verified' : 'unverified'}`}>
                      {user.emailVerified ? '인증 완료' : '인증 필요'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">가입일:</span>
                    <span className="info-value">{formatDate(user.createdAt)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="roles-tab">
              <div className="current-roles">
                <h3>현재 역할</h3>
                {userRoles.length === 0 ? (
                  <p>부여된 역할이 없습니다.</p>
                ) : (
                  <div className="roles-list">
                    {userRoles.map(role => (
                      <div key={role} className="role-item">
                        <span className="role-name">{ROLE_LABELS[role]}</span>
                        {role !== 'member' && (
                          <button
                            onClick={() => handleRoleAction(role, 'revoke')}
                            disabled={actionLoading.has(`revoke-${role}`)}
                            className="btn btn-sm btn-danger"
                          >
                            {actionLoading.has(`revoke-${role}`) ? '해제 중...' : '해제'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {availableRoles.length > 0 && (
                <div className="available-roles">
                  <h3>역할 부여</h3>
                  <div className="roles-list">
                    {availableRoles.map(role => (
                      <div key={role} className="role-item">
                        <span className="role-name">{ROLE_LABELS[role]}</span>
                        <button
                          onClick={() => handleRoleAction(role, 'assign')}
                          disabled={actionLoading.has(`assign-${role}`)}
                          className="btn btn-sm btn-primary"
                        >
                          {actionLoading.has(`assign-${role}`) ? '부여 중...' : '부여'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="sessions-tab">
              <h3>활성 세션</h3>
              {sessions.length === 0 ? (
                <p>활성 세션이 없습니다.</p>
              ) : (
                <div className="sessions-list">
                  {sessions.map(session => (
                    <div key={session.sessionId} className="session-item">
                      <div className="session-info">
                        <div className="session-main">
                          <h4>{session.ua || 'Unknown Browser'}</h4>
                          <p className="session-ip">IP: {session.ip}</p>
                        </div>
                        <div className="session-times">
                          <p>로그인: {formatDate(session.createdAt)}</p>
                          <p>만료: {formatExpiry(session.expiresAt)}</p>
                        </div>
                      </div>
                      <div className="session-actions">
                        <button
                          onClick={() => handleRevokeSession(session.sessionId)}
                          disabled={actionLoading.has(`revoke-session-${session.sessionId}`)}
                          className="btn btn-sm btn-danger"
                        >
                          {actionLoading.has(`revoke-session-${session.sessionId}`) ? '해제 중...' : '세션 해제'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}