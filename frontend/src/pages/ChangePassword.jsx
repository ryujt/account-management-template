import { useState } from 'react';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { useUiStore } from '../stores/uiStore';
import * as userApi from '../api/user';

export default function ChangePassword() {
  const addToast = useUiStore((s) => s.addToast);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await userApi.changePassword(currentPassword, newPassword);
      addToast('success', 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Change Password</h1>
        <p>Update your password to keep your account secure.</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert--error">{error}</div>}

          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="Enter current password"
          />
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
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
}
