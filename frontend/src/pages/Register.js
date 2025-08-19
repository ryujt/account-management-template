import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';
import '@styles/Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register, redeemInvite, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    inviteCode: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInviteMode, setIsInviteMode] = useState(false);

  useEffect(() => {
    const invite = searchParams.get('invite');
    if (invite) {
      setFormData(prev => ({ ...prev, inviteCode: invite }));
      setIsInviteMode(true);
    }
  }, [searchParams]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) clearError();
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (isInviteMode && formData.inviteCode) {
        await redeemInvite(formData);
      } else {
        await register(formData);
      }
      navigate('/auth/verify-email-sent', { 
        state: { email: formData.email } 
      });
    } catch (err) {
      console.error('Register error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{isInviteMode ? '초대로 회원가입' : '회원가입'}</h1>
        
        {isInviteMode && (
          <div className="info-message">
            초대 코드로 회원가입을 진행합니다.
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {isInviteMode && (
            <div className="form-group">
              <label htmlFor="inviteCode">초대 코드</label>
              <input
                type="text"
                id="inviteCode"
                name="inviteCode"
                value={formData.inviteCode}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                readOnly
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isSubmitting}
            />
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
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              minLength={8}
              required
              disabled={isSubmitting}
            />
            <small className="form-help">최소 8자 이상</small>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/auth/login">이미 계정이 있으신가요? 로그인</Link>
        </div>

        <div className="auth-links">
          <Link to="/">← 홈으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}