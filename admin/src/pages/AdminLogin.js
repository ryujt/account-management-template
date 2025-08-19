import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/authApi';
import { setAuthToken } from '../api/index';
import '../styles/auth.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const setAuth = useAuthStore(state => state.setAuth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await authApi.login(email, password);
      
      // firstName과 lastName을 displayName으로 변환
      const user = {
        ...result.user,
        displayName: `${result.user.firstName} ${result.user.lastName}`
      };
      
      if (!user.roles?.includes('admin')) {
        setError('관리자 권한이 필요합니다.');
        setIsLoading(false);
        return;
      }
      
      setAuthToken(result.accessToken);
      setAuth(result.accessToken, user);
      window.location.href = '/';
    } catch (err) {
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>관리자 로그인</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <div className="auth-links">
          <a href="http://localhost:3001">서비스 페이지로 이동</a>
        </div>
      </div>
    </div>
  );
}