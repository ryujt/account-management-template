import React from 'react';
import { Link } from 'react-router-dom';
import '@styles/Auth.css';

export default function PasswordResetSuccess() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="success-icon">✅</div>
        <h1>비밀번호 변경 완료</h1>
        
        <div className="success-message">
          <p>비밀번호가 성공적으로 변경되었습니다.</p>
          <p>새로운 비밀번호로 로그인해 주세요.</p>
        </div>

        <div className="auth-links">
          <Link to="/auth/login" className="btn btn-primary">
            로그인하기
          </Link>
        </div>
      </div>
    </div>
  );
}