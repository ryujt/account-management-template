import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { userApi } from '../api/userApi';
import ProtectedRoute from '../components/ProtectedRoute';
import '../styles/pages.css';

function ProfileContent() {
  const { user, updateUser } = useAuthStore();
  const [formData, setFormData] = useState({
    displayName: user?.displayName || ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await userApi.updateMe(formData);
      updateUser(formData);
      setSuccess('프로필이 성공적으로 업데이트되었습니다.');
    } catch (err) {
      setError(err.message || '프로필 업데이트에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="profile-section">
        <h1>프로필 관리</h1>
        
        <div className="profile-info">
          <h2>계정 정보</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>이메일</label>
              <span>{user?.email}</span>
            </div>
            <div className="info-item">
              <label>역할</label>
              <span>{user?.roles?.join(', ')}</span>
            </div>
            <div className="info-item">
              <label>이메일 인증</label>
              <span className={user?.emailVerified ? 'verified' : 'unverified'}>
                {user?.emailVerified ? '완료' : '미완료'}
              </span>
            </div>
            <div className="info-item">
              <label>가입일</label>
              <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</span>
            </div>
          </div>
        </div>

        <div className="profile-edit">
          <h2>프로필 수정</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="displayName">이름</label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? '업데이트 중...' : '프로필 업데이트'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  return (
    <ProtectedRoute requireAuth={true}>
      <ProfileContent />
    </ProtectedRoute>
  );
}