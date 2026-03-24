import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';
import { useAuth } from '../hooks/useAuth';
import { useUiStore } from '../stores/uiStore';

export default function Login() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const addToast = useUiStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(email, password) {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      addToast('success', 'Signed in successfully.');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <LoginForm onSubmit={handleSubmit} loading={loading} error={error} />
    </div>
  );
}
