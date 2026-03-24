import { useState } from 'react';
import { Link } from 'react-router-dom';
import Input from '../common/Input';
import Button from '../common/Button';

export default function LoginForm({ onSubmit, loading, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(email, password);
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Sign In</h1>
      <p className="auth-form__subtitle">Welcome back. Enter your credentials to continue.</p>

      {error && <div className="alert alert--error">{error}</div>}

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        placeholder="you@example.com"
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
        placeholder="Enter your password"
      />

      <div className="auth-form__actions">
        <Button type="submit" loading={loading}>
          Sign In
        </Button>
        <Link to="/reset-password" className="auth-form__link">
          Forgot password?
        </Link>
      </div>

      <p className="auth-form__footer">
        Don&apos;t have an account?{' '}
        <Link to="/register">Create one</Link>
      </p>
    </form>
  );
}
