import React, { useState, useEffect } from 'react';
import { useAdminStore } from '@stores/adminStore';
import { ROLE_LABELS, USER_ROLES } from '@constants/ui';
import '@styles/InviteManagement.css';

export default function InviteManagement() {
  const { invites, createInvite, listInvites, error, clearError } = useAdminStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    role: 'member',
    expiresInHours: 72
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    try {
      await listInvites();
    } catch (err) {
      console.error('Load invites error:', err);
    }
  };

  const handleFormChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) clearError();
    if (successMessage) setSuccessMessage('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await createInvite(formData);
      setSuccessMessage(`초대 코드가 생성되었습니다: ${result.code}`);
      setFormData({ role: 'member', expiresInHours: 72 });
      setShowCreateForm(false);
      await loadInvites();
    } catch (err) {
      console.error('Create invite error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = dateString => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const formatExpiry = timestamp => {
    return new Date(timestamp * 1000).toLocaleString('ko-KR');
  };

  const isExpired = timestamp => {
    return timestamp < Date.now() / 1000;
  };

  const copyToClipboard = async code => {
    const inviteUrl = `${window.location.origin}/auth/register?invite=${code}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setSuccessMessage('초대 링크가 클립보드에 복사되었습니다.');
    } catch (err) {
      console.error('Copy to clipboard failed:', err);
      setSuccessMessage(`초대 링크: ${inviteUrl}`);
    }
  };

  const activeInvites = invites.filter(invite => !isExpired(invite.expiresAt));
  const expiredInvites = invites.filter(invite => isExpired(invite.expiresAt));

  return (
    <div className="invite-management-page">
      <div className="page-header">
        <h1>초대 관리</h1>
        <p>새로운 사용자를 초대하고 초대 코드를 관리하세요.</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}

      <div className="create-invite-section">
        <div className="section-header">
          <h2>새 초대 만들기</h2>
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary"
            >
              초대 생성
            </button>
          ) : (
            <button
              onClick={() => setShowCreateForm(false)}
              className="btn btn-secondary"
            >
              취소
            </button>
          )}
        </div>

        {showCreateForm && (
          <form onSubmit={handleSubmit} className="create-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="role">역할</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleFormChange}
                  disabled={isSubmitting}
                >
                  {Object.values(USER_ROLES).map(role => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="expiresInHours">유효 시간 (시간)</label>
                <select
                  id="expiresInHours"
                  name="expiresInHours"
                  value={formData.expiresInHours}
                  onChange={handleFormChange}
                  disabled={isSubmitting}
                >
                  <option value={24}>24시간</option>
                  <option value={48}>48시간</option>
                  <option value={72}>72시간 (기본)</option>
                  <option value={168}>1주일</option>
                </select>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '생성 중...' : '초대 생성'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      <div className="invites-section">
        <div className="section-header">
          <h2>활성 초대 ({activeInvites.length})</h2>
        </div>

        {activeInvites.length === 0 ? (
          <div className="empty-state">
            <p>활성 초대가 없습니다.</p>
          </div>
        ) : (
          <div className="invites-list">
            {activeInvites.map(invite => (
              <div key={invite.code} className="invite-card active">
                <div className="invite-info">
                  <div className="invite-code">{invite.code}</div>
                  <div className="invite-details">
                    <span className="invite-role">{ROLE_LABELS[invite.role]}</span>
                    <span className="invite-created">생성: {formatDate(invite.createdAt)}</span>
                    <span className="invite-expires">만료: {formatExpiry(invite.expiresAt)}</span>
                    <span className="invite-creator">생성자: {invite.createdBy}</span>
                  </div>
                </div>
                <div className="invite-actions">
                  <button
                    onClick={() => copyToClipboard(invite.code)}
                    className="btn btn-sm btn-secondary"
                  >
                    링크 복사
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {expiredInvites.length > 0 && (
        <div className="invites-section">
          <div className="section-header">
            <h2>만료된 초대 ({expiredInvites.length})</h2>
          </div>

          <div className="invites-list">
            {expiredInvites.map(invite => (
              <div key={invite.code} className="invite-card expired">
                <div className="invite-info">
                  <div className="invite-code">{invite.code}</div>
                  <div className="invite-details">
                    <span className="invite-role">{ROLE_LABELS[invite.role]}</span>
                    <span className="invite-created">생성: {formatDate(invite.createdAt)}</span>
                    <span className="invite-expires">만료: {formatExpiry(invite.expiresAt)}</span>
                    <span className="invite-creator">생성자: {invite.createdBy}</span>
                  </div>
                </div>
                <div className="invite-status expired-status">
                  만료됨
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}