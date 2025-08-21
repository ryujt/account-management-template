import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useLoadingStore } from '../stores/loadingStore';
import { authApi } from '../api/authApi';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Zustand stores
  const { 
    login, 
    isAuthenticated,
    savedEmail,
    rememberEmail,
    setSavedEmail,
    setRememberEmail 
  } = useAuthStore();
  const { setLoading, isLoading } = useLoadingStore();

  // Local state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [error, setError] = useState('');

  // 이미 로그인된 경우 대시보드로 이동
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // 저장된 이메일 불러오기
  useEffect(() => {
    if (rememberEmail && savedEmail) {
      setFormData(prev => ({
        ...prev,
        email: savedEmail,
        rememberMe: true
      }));
    }
  }, [rememberEmail, savedEmail]);

  // 폼 입력 핸들러
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // 로그인 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);

      const response = await authApi.login({
        email: formData.email,
        password: formData.password
      });

      const { accessToken, user } = response;

      // 관리자 권한 확인
      if (!user.roles?.includes('admin') && !user.roles?.includes('super_admin')) {
        setError('관리자 권한이 없습니다.');
        return;
      }

      // 이메일 저장 설정
      if (formData.rememberMe) {
        setSavedEmail(formData.email);
        setRememberEmail(true);
      } else {
        setSavedEmail('');
        setRememberEmail(false);
      }

      // 로그인 처리
      login(accessToken, user);

      // 리다이렉트
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });

    } catch (error) {
      console.error('로그인 실패:', error);
      
      if (error.response?.status === 401) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (error.response?.status === 403) {
        setError('관리자 권한이 필요합니다.');
      } else {
        setError('로그인에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>관리자 로그인</h1>
          <p>계정 관리 시스템에 접속하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              {error}
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
              placeholder="관리자 이메일을 입력하세요"
              required
              autoComplete="username"
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
              placeholder="비밀번호를 입력하세요"
              required
              autoComplete="current-password"
            />
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              <span className="checkmark"></span>
              이메일 저장
            </label>
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? <LoadingSpinner size="small" /> : '로그인'}
          </button>
        </form>

        <div className="login-footer">
          <p className="system-info">
            Account Management System v1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;