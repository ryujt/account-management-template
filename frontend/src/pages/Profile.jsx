import { useState, useEffect } from 'react';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import * as userApi from '../api/user';

export default function Profile() {
  const { user } = useAuth();
  const addToast = useUiStore((s) => s.addToast);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await userApi.updateProfile({ displayName });
      // Re-fetch profile to get the updated data
      const profile = await userApi.getProfile();
      const currentState = useAuthStore.getState();
      useAuthStore.getState().setAuth(
        { ...currentState.user, ...profile },
        currentState.accessToken,
      );
      addToast('success', 'Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Profile</h1>
        <p>Manage your personal information.</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert--error">{error}</div>}

          <Input
            label="Email"
            type="email"
            value={user?.email || ''}
            disabled
          />
          <Input
            label="Display Name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            placeholder="Your display name"
          />

          <Button type="submit" loading={loading}>
            Save Changes
          </Button>
        </form>
      </div>
    </div>
  );
}
