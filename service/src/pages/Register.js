import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../stores/authStore';
import { useLoadingStore } from '../stores/loadingStore';
import { authApi } from '../api/authApi';
import LoadingSpinner from '../components/LoadingSpinner';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { isActionLoading, setActionLoading } = useLoadingStore();
  
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 해당 필드의 에러 메시지 제거
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // 이메일 검증
    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요.';
    }

    // 이름 검증
    if (!formData.displayName) {
      newErrors.displayName = '이름을 입력해주세요.';
    } else if (formData.displayName.length < 2) {
      newErrors.displayName = '이름은 2자 이상 입력해주세요.';
    }

    // 비밀번호 검증
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.';
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상 입력해주세요.';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = '비밀번호는 대소문자와 숫자를 포함해야 합니다.';
    }

    // 비밀번호 확인 검증
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setActionLoading('register', true);
    setErrors({});
    setSuccessMessage('');

    try {
      const response = await authApi.register({
        email: formData.email,
        displayName: formData.displayName,
        password: formData.password
      });

      setSuccessMessage('회원가입이 완료되었습니다. 이메일을 확인하여 계정을 인증해주세요.');
      
      // 회원가입 후 자동 로그인이 되는 경우
      if (response.accessToken) {
        login(response.accessToken, response.user);
        navigate('/', { replace: true });
      } else {
        // 이메일 인증이 필요한 경우 로그인 페이지로 이동
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }

    } catch (err) {
      console.error('Register error:', err);
      
      if (err.response?.data?.errors) {
        // 필드별 에러 메시지
        setErrors(err.response.data.errors);
      } else {
        // 일반 에러 메시지
        setErrors({
          general: err.response?.data?.message || '회원가입에 실패했습니다. 다시 시도해주세요.'
        });
      }
    } finally {
      setActionLoading('register', false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setActionLoading('googleRegister', true);
    setErrors({});

    try {
      const response = await authApi.handleGoogleCallback(credentialResponse.credential);
      
      login(response.accessToken, response.user);
      navigate('/', { replace: true });

    } catch (err) {
      console.error('Google register error:', err);
      setErrors({
        general: err.response?.data?.message || '구글 회원가입에 실패했습니다. 다시 시도해주세요.'
      });
    } finally {
      setActionLoading('googleRegister', false);
    }
  };

  const handleGoogleError = () => {
    setErrors({
      general: '구글 회원가입을 취소했습니다.'
    });
  };

  const isLoading = isActionLoading('register') || isActionLoading('googleRegister');

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>회원가입</h1>
          <p>새 계정을 만드세요</p>
        </div>

        {errors.general && (
          <div className="error-message">
            {errors.general}
          </div>
        )}

        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">이메일 <span className="required">*</span></label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              autoComplete="email"
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="displayName">이름 <span className="required">*</span></label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              autoComplete="name"
              className={errors.displayName ? 'error' : ''}
            />
            {errors.displayName && <div className="field-error">{errors.displayName}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호 <span className="required">*</span></label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              autoComplete="new-password"
              className={errors.password ? 'error' : ''}
            />
            {errors.password && <div className="field-error">{errors.password}</div>}
            <div className="password-hint">
              8자 이상, 대소문자와 숫자 포함
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">비밀번호 확인 <span className="required">*</span></label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              autoComplete="new-password"
              className={errors.confirmPassword ? 'error' : ''}
            />
            {errors.confirmPassword && <div className="field-error">{errors.confirmPassword}</div>}
          </div>

          <button 
            type="submit" 
            className="btn-primary"
            disabled={isLoading}
          >
            {isActionLoading('register') ? <LoadingSpinner size="small" /> : '회원가입'}
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
            text="signup_with"
            shape="rectangular"
            theme="outline"
            size="large"
            width="100%"
          />
          {isActionLoading('googleRegister') && (
            <div className="google-loading-overlay">
              <LoadingSpinner size="small" />
            </div>
          )}
        </div>

        <div className="auth-footer">
          <p>
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="auth-link">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;