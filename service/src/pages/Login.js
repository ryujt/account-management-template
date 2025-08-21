import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../stores/authStore';
import { useLoadingStore } from '../stores/loadingStore';
import { authApi } from '../api/authApi';
import LoadingSpinner from '../components/LoadingSpinner';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    login, 
    savedEmail, 
    rememberEmail, 
    setSavedEmail, 
    setRememberEmail 
  } = useAuthStore();
  const { isActionLoading, setActionLoading } = useLoadingStore();
  
  const [formData, setFormData] = useState({
    email: savedEmail || '',
    password: '',
    rememberMe: rememberEmail
  });
  const [error, setError] = useState('');

  // 이미 로그인된 경우 리다이렉트
  useEffect(() => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [navigate, location]);

  // 저장된 이메일이 있으면 폼에 설정
  useEffect(() => {
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
    }
  }, [savedEmail]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // 에러 메시지 초기화
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading('login', true);
    setError('');

    try {
      const response = await authApi.login({
        email: formData.email,
        password: formData.password
      });

      // 이메일 저장 설정
      setRememberEmail(formData.rememberMe);
      if (formData.rememberMe) {
        setSavedEmail(formData.email);
      } else {
        setSavedEmail('');
      }

      // 로그인 상태 저장
      login(response.accessToken, response.user);

      // 리다이렉트
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });

    } catch (err) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.message || 
        '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.'
      );
    } finally {
      setActionLoading('login', false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setActionLoading('googleLogin', true);
    setError('');

    try {
      // 구글 토큰을 백엔드로 전송하여 인증 처리
      const response = await authApi.handleGoogleCallback(credentialResponse.credential);
      
      login(response.accessToken, response.user);
      
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });

    } catch (err) {
      console.error('Google login error:', err);
      setError(
        err.response?.data?.message || 
        '구글 로그인에 실패했습니다. 다시 시도해주세요.'
      );
    } finally {
      setActionLoading('googleLogin', false);
    }
  };

  const handleGoogleError = () => {
    setError('구글 로그인을 취소했습니다.');
  };

  const isLoading = isActionLoading('login') || isActionLoading('googleLogin');

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>로그인</h1>
          <p>계정에 로그인하세요</p>
        </div>

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
              value={formData.email}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                disabled={isLoading}
              />
              이메일 저장
            </label>

            <Link to="/forgot-password" className="forgot-link">
              비밀번호를 잊으셨나요?
            </Link>
          </div>

          <button 
            type="submit" 
            className="btn-primary"
            disabled={isLoading}
          >
            {isActionLoading('login') ? <LoadingSpinner size="small" /> : '로그인'}
          </button>
        </form>

        <div className="auth-divider">
          <span>또는</span>
        </div>

        <div className="google-login-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap={false}
            disabled={isLoading}
            text="signin_with"
            shape="rectangular"
            theme="outline"
            size="large"
            width="100%"
          />
          {isActionLoading('googleLogin') && (
            <div className="google-loading-overlay">
              <LoadingSpinner size="small" />
            </div>
          )}
        </div>

        <div className="auth-footer">
          <p>
            계정이 없으신가요?{' '}
            <Link to="/register" className="auth-link">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;