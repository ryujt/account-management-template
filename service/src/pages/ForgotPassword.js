import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLoadingStore } from '../stores/loadingStore';
import { authApi } from '../api/authApi';
import LoadingSpinner from '../components/LoadingSpinner';

const ForgotPassword = () => {
  const { isActionLoading, setActionLoading } = useLoadingStore();
  
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading('forgotPassword', true);
    setError('');
    setSuccessMessage('');

    try {
      await authApi.forgotPassword(email);
      
      setSuccessMessage(
        '비밀번호 재설정 링크가 이메일로 전송되었습니다. ' +
        '이메일을 확인하고 링크를 클릭하여 비밀번호를 재설정해주세요.'
      );
      setIsSubmitted(true);

    } catch (err) {
      console.error('Forgot password error:', err);
      setError(
        err.response?.data?.message || 
        '이메일 전송에 실패했습니다. 이메일 주소를 확인하고 다시 시도해주세요.'
      );
    } finally {
      setActionLoading('forgotPassword', false);
    }
  };

  const handleInputChange = (e) => {
    setEmail(e.target.value);
    if (error) setError('');
  };

  const handleTryAgain = () => {
    setIsSubmitted(false);
    setSuccessMessage('');
    setEmail('');
  };

  if (isSubmitted && successMessage) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>이메일 전송 완료</h1>
          </div>

          <div className="success-message">
            {successMessage}
          </div>

          <div className="forgot-password-actions">
            <button 
              onClick={handleTryAgain}
              className="btn-secondary"
            >
              다른 이메일로 재시도
            </button>
            
            <Link to="/login" className="btn-primary">
              로그인으로 돌아가기
            </Link>
          </div>

          <div className="auth-footer">
            <p>
              이메일이 오지 않았나요?{' '}
              <button 
                onClick={handleTryAgain}
                className="text-button"
              >
                다시 시도
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>비밀번호 찾기</h1>
          <p>이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">이메일 주소</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={handleInputChange}
              required
              disabled={isActionLoading('forgotPassword')}
              autoComplete="email"
              placeholder="example@email.com"
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary"
            disabled={isActionLoading('forgotPassword')}
          >
            {isActionLoading('forgotPassword') ? (
              <LoadingSpinner size="small" />
            ) : (
              '재설정 링크 전송'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            <Link to="/login" className="auth-link">
              로그인으로 돌아가기
            </Link>
          </p>
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

export default ForgotPassword;