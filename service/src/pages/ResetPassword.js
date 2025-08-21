import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLoadingStore } from '../stores/loadingStore';
import { authApi } from '../api/authApi';
import LoadingSpinner from '../components/LoadingSpinner';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isActionLoading, setActionLoading } = useLoadingStore();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      navigate('/login', { 
        replace: true,
        state: { 
          error: '유효하지 않은 비밀번호 재설정 링크입니다.' 
        }
      });
      return;
    }
    setToken(tokenParam);
  }, [searchParams, navigate]);

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

    // 비밀번호 검증
    if (!formData.password) {
      newErrors.password = '새 비밀번호를 입력해주세요.';
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

    setActionLoading('resetPassword', true);
    setErrors({});
    setSuccessMessage('');

    try {
      await authApi.resetPassword(token, formData.password);
      
      setSuccessMessage('비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요.');
      
      // 3초 후 로그인 페이지로 이동
      setTimeout(() => {
        navigate('/login', { 
          replace: true,
          state: { 
            message: '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.' 
          }
        });
      }, 3000);

    } catch (err) {
      console.error('Reset password error:', err);
      
      if (err.response?.status === 400) {
        setErrors({
          general: '토큰이 만료되었거나 유효하지 않습니다. 비밀번호 재설정을 다시 요청해주세요.'
        });
      } else if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setErrors({
          general: err.response?.data?.message || '비밀번호 변경에 실패했습니다. 다시 시도해주세요.'
        });
      }
    } finally {
      setActionLoading('resetPassword', false);
    }
  };

  if (successMessage) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>비밀번호 변경 완료</h1>
          </div>

          <div className="success-message">
            {successMessage}
          </div>

          <Link to="/login" className="btn-primary">
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>새 비밀번호 설정</h1>
          <p>새로운 비밀번호를 입력해주세요</p>
        </div>

        {errors.general && (
          <div className="error-message">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="password">새 비밀번호 <span className="required">*</span></label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              disabled={isActionLoading('resetPassword')}
              autoComplete="new-password"
              className={errors.password ? 'error' : ''}
            />
            {errors.password && <div className="field-error">{errors.password}</div>}
            <div className="password-hint">
              8자 이상, 대소문자와 숫자 포함
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">새 비밀번호 확인 <span className="required">*</span></label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              disabled={isActionLoading('resetPassword')}
              autoComplete="new-password"
              className={errors.confirmPassword ? 'error' : ''}
            />
            {errors.confirmPassword && <div className="field-error">{errors.confirmPassword}</div>}
          </div>

          <button 
            type="submit" 
            className="btn-primary"
            disabled={isActionLoading('resetPassword')}
          >
            {isActionLoading('resetPassword') ? (
              <LoadingSpinner size="small" />
            ) : (
              '비밀번호 변경'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            <Link to="/login" className="auth-link">
              로그인으로 돌아가기
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;