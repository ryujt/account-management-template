import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';
import '@styles/Auth.css';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const { verifyEmail, error, clearError } = useAuthStore();
  const [status, setStatus] = useState('verifying');
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    const verify = async () => {
      try {
        await verifyEmail({ token });
        setStatus('success');
      } catch (err) {
        console.error('Email verification error:', err);
        setStatus('error');
      }
    };

    verify();
  }, [token, verifyEmail]);

  if (status === 'verifying') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="loading-icon">⏳</div>
          <h1>이메일 인증 중...</h1>
          <p>잠시만 기다려 주세요.</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="success-icon">✅</div>
          <h1>이메일 인증 완료</h1>
          
          <div className="success-message">
            <p>이메일 인증이 성공적으로 완료되었습니다.</p>
            <p>이제 모든 기능을 사용하실 수 있습니다.</p>
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

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="error-icon">❌</div>
        <h1>인증 실패</h1>
        
        <div className="error-message">
          {error || '유효하지 않거나 만료된 인증 링크입니다.'}
        </div>

        <div className="auth-links">
          <Link to="/auth/login">로그인 페이지로 이동</Link>
          <Link to="/auth/register">새로 회원가입하기</Link>
        </div>
      </div>
    </div>
  );
}