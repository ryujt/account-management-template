import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useLoadingStore } from '../stores/loadingStore';
import { userApi } from '../api/userApi';
import LoadingSpinner from '../components/LoadingSpinner';

const Profile = () => {
  const { user, setUser } = useAuthStore();
  const { isActionLoading, setActionLoading } = useLoadingStore();
  
  const [formData, setFormData] = useState({
    displayName: '',
    email: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const loadProfile = async () => {
    setActionLoading('loadProfile', true);
    setErrors({});

    try {
      const response = await userApi.getMyProfile();
      setUser(response.user);
    } catch (err) {
      console.error('Load profile error:', err);
      setErrors({
        general: '프로필을 불러오는데 실패했습니다.'
      });
    } finally {
      setActionLoading('loadProfile', false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 해당 필드의 에러 메시지 제거
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.displayName) {
      newErrors.displayName = '이름을 입력해주세요.';
    } else if (formData.displayName.length < 2) {
      newErrors.displayName = '이름은 2자 이상 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setActionLoading('updateProfile', true);
    setErrors({});
    setSuccessMessage('');

    try {
      const response = await userApi.updateMyProfile({
        displayName: formData.displayName
      });

      setUser(response.user);
      setSuccessMessage('프로필이 성공적으로 업데이트되었습니다.');
      setIsEditing(false);

    } catch (err) {
      console.error('Update profile error:', err);
      
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setErrors({
          general: err.response?.data?.message || '프로필 업데이트에 실패했습니다.'
        });
      }
    } finally {
      setActionLoading('updateProfile', false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      displayName: user?.displayName || '',
      email: user?.email || ''
    });
    setErrors({});
    setSuccessMessage('');
  };

  if (isActionLoading('loadProfile')) {
    return (
      <div className="profile-container">
        <div className="loading-center">
          <LoadingSpinner />
          <p>프로필을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <h1>내 프로필</h1>
          <p>계정 정보를 관리하세요</p>
        </div>

        {errors.general && (
          <div className="error-message">
            {errors.general}
          </div>
        )}

        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}

        <div className="profile-content">
          <div className="profile-info">
            <div className="info-section">
              <h3>계정 정보</h3>
              
              <div className="info-group">
                <label>이메일</label>
                <div className="info-value">
                  {user?.email}
                  {user?.emailVerified ? (
                    <span className="verified-badge">인증됨</span>
                  ) : (
                    <span className="unverified-badge">미인증</span>
                  )}
                </div>
              </div>

              <div className="info-group">
                <label>가입일</label>
                <div className="info-value">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '-'}
                </div>
              </div>

              <div className="info-group">
                <label>상태</label>
                <div className="info-value">
                  <span className={`status-badge ${user?.status || 'active'}`}>
                    {user?.status === 'active' ? '활성' : '비활성'}
                  </span>
                </div>
              </div>

              {user?.roles && user.roles.length > 0 && (
                <div className="info-group">
                  <label>역할</label>
                  <div className="info-value">
                    <div className="roles-container">
                      {user.roles.map(role => (
                        <span key={role} className="role-badge">
                          {role === 'admin' ? '관리자' : role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="profile-form-section">
            <div className="form-section-header">
              <h3>개인 정보</h3>
              {!isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="btn-secondary"
                >
                  편집
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-group">
                <label htmlFor="displayName">이름</label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  disabled={!isEditing || isActionLoading('updateProfile')}
                  className={errors.displayName ? 'error' : ''}
                />
                {errors.displayName && <div className="field-error">{errors.displayName}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="email">이메일</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="disabled"
                />
                <div className="form-hint">
                  이메일은 변경할 수 없습니다
                </div>
              </div>

              {isEditing && (
                <div className="form-actions">
                  <button 
                    type="button"
                    onClick={handleCancel}
                    className="btn-secondary"
                    disabled={isActionLoading('updateProfile')}
                  >
                    취소
                  </button>
                  <button 
                    type="submit"
                    className="btn-primary"
                    disabled={isActionLoading('updateProfile')}
                  >
                    {isActionLoading('updateProfile') ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      '저장'
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;