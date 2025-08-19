import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';
import '@styles/Auth.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      navigate('/auth/forgot-password');
    }
  }, [token, navigate]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) clearError();
    if (validationError) setValidationError('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (isSubmitting) return;

    if (formData.newPassword !== formData.confirmPassword) {
      setValidationError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (formData.newPassword.length < 8) {
      setValidationError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({
        token,
        newPassword: formData.newPassword
      });
      navigate('/auth/password-reset-success');
    } catch (err) {
      console.error('Reset password error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return null;
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>새 비밀번호 설정</h1>
        <p className="auth-description">
          새로운 비밀번호를 입력해 주세요.
        </p>
        
        {(error || validationError) && (
          <div className="error-message">
            {validationError || error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="newPassword">새 비밀번호</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              minLength={8}
              required
              disabled={isSubmitting}
            />
            <small className="form-help">최소 8자 이상</small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">비밀번호 확인</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              minLength={8}
              required
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/auth/login">로그인 페이지로 이동</Link>
        </div>
      </div>
    </div>
  );
}