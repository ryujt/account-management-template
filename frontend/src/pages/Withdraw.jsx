import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import * as userApi from '../api/user';

export default function Withdraw() {
  const navigate = useNavigate();
  const addToast = useUiStore((s) => s.addToast);
  const [password, setPassword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!password) {
      setError('Please enter your password to confirm.');
      return;
    }
    setModalOpen(true);
  }

  async function handleConfirmDelete() {
    setModalOpen(false);
    setLoading(true);
    try {
      await userApi.withdraw(password);
      useAuthStore.getState().clearAuth();
      addToast('success', 'Your account has been deleted.');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to delete account. Please check your password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Delete Account</h1>
        <p>Permanently delete your account and all associated data.</p>
      </div>

      <div className="card card--danger">
        <div className="alert alert--warning">
          <strong>Warning:</strong> This action is irreversible. All your data, sessions, and account
          information will be permanently deleted.
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert--error">{error}</div>}

          <Input
            label="Confirm Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="Enter your password to confirm"
          />

          <Button type="submit" variant="danger" loading={loading}>
            Delete My Account
          </Button>
        </form>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Confirm Account Deletion"
      >
        <p>Are you absolutely sure you want to delete your account? This action cannot be undone.</p>
        <div className="modal__actions">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete}>
            Yes, Delete My Account
          </Button>
        </div>
      </Modal>
    </div>
  );
}
