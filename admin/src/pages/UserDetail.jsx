import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UserDetailPanel from '../components/users/UserDetailPanel';
import RoleManager from '../components/users/RoleManager';
import StatusBadge from '../components/users/StatusBadge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { getUser, updateUserStatus, addRole, removeRole } from '../api/admin';
import useUiStore from '../stores/uiStore';

function formatDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function UserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useUiStore();

  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUser(userId);
      setUser(data.user);
      setSessions(data.sessions || []);
    } catch (err) {
      showError(err.response?.data?.error?.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [userId, showError]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleStatusChange = async () => {
    if (!newStatus) return;
    setActionLoading(true);
    try {
      await updateUserStatus(userId, newStatus);
      success(`Status changed to ${newStatus}`);
      setStatusModal(false);
      await fetchUser();
    } catch (err) {
      showError(err.response?.data?.error?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddRole = async (role) => {
    setActionLoading(true);
    try {
      await addRole(userId, role);
      success(`Role "${role}" added`);
      await fetchUser();
    } catch (err) {
      showError(err.response?.data?.error?.message || 'Failed to add role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveRole = async (role) => {
    setActionLoading(true);
    try {
      await removeRole(userId, role);
      success(`Role "${role}" removed`);
      await fetchUser();
    } catch (err) {
      showError(err.response?.data?.error?.message || 'Failed to remove role');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading-state">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page">
        <div className="empty-state">User not found.</div>
      </div>
    );
  }

  const statusOptions = ['active', 'disabled', 'suspended'].filter(
    (s) => s !== user.status,
  );

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          &larr; Back to Users
        </button>
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          <UserDetailPanel user={user} />

          <div className="detail-section">
            <h3 className="section-title">Change Status</h3>
            <div className="status-actions">
              <span className="status-current">
                Current: <StatusBadge status={user.status} />
              </span>
              {user.status !== 'withdrawn' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setNewStatus(statusOptions[0] || '');
                    setStatusModal(true);
                  }}
                >
                  Change Status
                </Button>
              )}
            </div>
          </div>

          <RoleManager
            roles={user.roles}
            onAdd={handleAddRole}
            onRemove={handleRemoveRole}
            loading={actionLoading}
          />
        </div>

        <div className="detail-sidebar">
          <div className="detail-section">
            <h3 className="section-title">
              Active Sessions ({sessions.length})
            </h3>
            {sessions.length === 0 ? (
              <p className="text-muted">No active sessions.</p>
            ) : (
              <div className="session-list">
                {sessions.map((session) => (
                  <div key={session.sessionId} className="session-card">
                    <div className="session-field">
                      <span className="session-label">Session ID</span>
                      <span className="monospace">{session.sessionId}</span>
                    </div>
                    <div className="session-field">
                      <span className="session-label">IP</span>
                      <span>{session.ip || '-'}</span>
                    </div>
                    <div className="session-field">
                      <span className="session-label">User Agent</span>
                      <span className="session-ua">{session.ua || '-'}</span>
                    </div>
                    <div className="session-field">
                      <span className="session-label">Created</span>
                      <span>{formatDateTime(session.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={statusModal}
        onClose={() => setStatusModal(false)}
        title="Change User Status"
        footer={
          <>
            <Button variant="default" onClick={() => setStatusModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleStatusChange}
              loading={actionLoading}
            >
              Confirm
            </Button>
          </>
        }
      >
        <p>Select a new status for this user:</p>
        <select
          className="form-select"
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Modal>
    </div>
  );
}
