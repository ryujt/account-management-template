import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '@styles/Auth.css';

export default function VerifyEmailSent() {
  const location = useLocation();
  const email = location.state?.email;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="success-icon">✉️</div>
        <h1>이메일 인증 필요</h1>
        
        <div className="info-message">
          {email ? (
            <p><strong>{email}</strong>로 인증 메일을 발송했습니다.</p>
          ) : (
            <p>인증 메일을 발송했습니다.</p>
          )}
          <p>메일함을 확인하시고 인증 링크를 클릭해 주세요.</p>
        </div>

        <div className="auth-links">
          <Link to="/auth/login">로그인 페이지로 이동</Link>
          <Link to="/">홈으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}