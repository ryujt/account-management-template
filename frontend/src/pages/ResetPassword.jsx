import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';
import { useUiStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import * as authApi from '../api/auth';

export default function ResetPassword() {
  const { isAuthenticated } = useAuth();
  const addToast = useUiStore((s) => s.addToast);
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If not authenticated, show a message directing to login
  if (!isAuthenticated) {
    return (
      <div className="page-center">
        <div className="auth-form">
          <h1>Reset Password</h1>
          <p className="auth-form__subtitle">
            You must be logged in to reset your password. If you forgot your password,
            please contact support.
          </p>
          <p className="auth-form__footer">
            <Link to="/login">Go to Sign In</Link>
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(newPassword);
      // Password reset invalidates all sessions, so clear local auth
      useAuthStore.getState().clearAuth();
      addToast('success', 'Password has been reset. Please log in with your new password.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Reset Password</h1>
        <p className="auth-form__subtitle">
          Enter a new password for your account. You will be logged out of all sessions.
        </p>

        {error && <div className="alert alert--error">{error}</div>}

        <Input
          label="New Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
        <Input
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
          placeholder="Re-enter new password"
        />

        <Button type="submit" loading={loading}>
          Reset Password
        </Button>

        <p className="auth-form__footer">
          <Link to="/dashboard">Back to Dashboard</Link>
        </p>
      </form>
    </div>
  );
}
