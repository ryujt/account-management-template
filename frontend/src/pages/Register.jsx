import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import RegisterForm from '../components/auth/RegisterForm';
import { useAuth } from '../hooks/useAuth';
import { useUiStore } from '../stores/uiStore';
import * as authApi from '../api/auth';

export default function Register() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const addToast = useUiStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(email, password, displayName) {
    setError('');
    setLoading(true);
    try {
      await authApi.register(email, password, displayName);
      addToast('success', 'Account created. Please log in.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <RegisterForm onSubmit={handleSubmit} loading={loading} error={error} />
    </div>
  );
}
