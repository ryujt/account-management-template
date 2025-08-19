import React, { useState, useEffect } from 'react';
import { useUserStore } from '@stores/userStore';
import { useAuthStore } from '@stores/authStore';
import '@styles/Profile.css';

export default function Profile() {
  const { user, setUser } = useAuthStore();
  const { profile, fetchProfile, updateProfile, error, clearError } = useUserStore();
  const [formData, setFormData] = useState({
    displayName: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const displayProfile = profile || user;

  useEffect(() => {
    fetchProfile().catch(console.error);
  }, [fetchProfile]);

  useEffect(() => {
    if (displayProfile) {
      setFormData({
        displayName: displayProfile.displayName || ''
      });
    }
  }, [displayProfile]);

  const handleChange = e => {
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
      await updateProfile(formData);
      
      if (user) {
        setUser({ ...user, displayName: formData.displayName }, user.accessToken);
      }
      
      setSuccessMessage('프로필이 성공적으로 업데이트되었습니다.');
    } catch (err) {
      console.error('Profile update error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>프로필 관리</h1>
        <p>개인 정보를 관리하고 업데이트하세요.</p>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <h2>기본 정보</h2>
          
          {successMessage && (
            <div className="success-message">
              {successMessage}
            </div>
          )}
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label htmlFor="email">이메일</label>
              <input
                type="email"
                id="email"
                value={displayProfile?.email || ''}
                disabled
                className="form-control-disabled"
              />
              <small className="form-help">이메일은 변경할 수 없습니다.</small>
            </div>

            <div className="form-group">
              <label htmlFor="displayName">이름</label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label>이메일 인증 상태</label>
              <div className={`verification-status ${displayProfile?.emailVerified ? 'verified' : 'unverified'}`}>
                {displayProfile?.emailVerified ? (
                  <>
                    <span className="status-icon">✅</span>
                    <span>인증 완료</span>
                  </>
                ) : (
                  <>
                    <span className="status-icon">⚠️</span>
                    <span>인증 필요</span>
                  </>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>역할</label>
              <div className="roles-display">
                {displayProfile?.roles?.map(role => {
                  const roleLabels = { member: '일반 사용자', admin: '관리자', manager: '매니저' };
                  return (
                    <span key={role} className="role-badge">
                      {roleLabels[role] || role}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? '저장 중...' : '프로필 저장'}
              </button>
            </div>
          </form>
        </div>

        <div className="profile-card">
          <h2>계정 정보</h2>
          <div className="account-info">
            <div className="info-item">
              <span className="info-label">가입일:</span>
              <span className="info-value">
                {displayProfile?.createdAt ? 
                  new Date(displayProfile.createdAt).toLocaleDateString('ko-KR') : 
                  '-'
                }
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">사용자 ID:</span>
              <span className="info-value">{displayProfile?.userId}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}