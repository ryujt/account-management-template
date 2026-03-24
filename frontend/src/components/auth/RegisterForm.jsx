import { useState } from 'react';
import { Link } from 'react-router-dom';
import Input from '../common/Input';
import Button from '../common/Button';

export default function RegisterForm({ onSubmit, loading, error }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setValidationError('');

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    onSubmit(email, password, displayName);
  }

  const displayError = validationError || error;

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Create Account</h1>
      <p className="auth-form__subtitle">Get started with your free account.</p>

      {displayError && <div className="alert alert--error">{displayError}</div>}

      <Input
        label="Display Name"
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        required
        autoComplete="name"
        placeholder="John Doe"
      />
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
        autoComplete="new-password"
        placeholder="At least 8 characters"
      />
      <Input
        label="Confirm Password"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        autoComplete="new-password"
        placeholder="Re-enter your password"
      />

      <Button type="submit" loading={loading} className="auth-form__submit">
        Create Account
      </Button>

      <p className="auth-form__footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </form>
  );
}
