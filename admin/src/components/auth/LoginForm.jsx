import { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import useAuthStore from '../../stores/authStore';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      const msg =
        err.message === 'Access denied. Admin role required.'
          ? err.message
          : err.response?.data?.error?.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <h1 className="login-title">Admin Login</h1>
      <p className="login-subtitle">Sign in with your admin account</p>

      {error && <div className="form-error">{error}</div>}

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="admin@example.com"
        required
        autoFocus
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        required
      />
      <Button type="submit" variant="primary" fullWidth loading={loading}>
        Sign In
      </Button>
    </form>
  );
}
