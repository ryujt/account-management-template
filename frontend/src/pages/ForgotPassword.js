import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';
import '@styles/Auth.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { forgotPassword, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = e => {
    setEmail(e.target.value);
    if (error) clearError();
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await forgotPassword({ email });
      setIsSuccess(true);
    } catch (err) {
      console.error('Forgot password error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="success-icon">✉️</div>
          <h1>비밀번호 재설정 메일 발송</h1>
          
          <div className="success-message">
            <p>비밀번호 재설정 링크를 <strong>{email}</strong>로 발송했습니다.</p>
            <p>메일함을 확인하시고 링크를 클릭해 주세요.</p>
            <p className="text-small">메일이 보이지 않는다면 스팸함을 확인해 주세요.</p>
          </div>

          <div className="auth-links">
            <Link to="/auth/login">로그인 페이지로 이동</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>비밀번호 재설정</h1>
        <p className="auth-description">
          가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
        </p>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={handleChange}
              required
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? '발송 중...' : '재설정 링크 발송'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/auth/login">로그인 페이지로 돌아가기</Link>
        </div>

        <div className="auth-links">
          <Link to="/">← 홈으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}