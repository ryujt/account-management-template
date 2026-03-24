import { useState, useEffect, useCallback } from 'react';
import Button from '../components/common/Button';
import { useUiStore } from '../stores/uiStore';
import * as userApi from '../api/user';

export default function Sessions() {
  const addToast = useUiStore((s) => s.addToast);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [terminatingId, setTerminatingId] = useState(null);

  const fetchSessions = useCallback(async () => {
    try {
      const data = await userApi.getSessions();
      setSessions(data.sessions || []);
    } catch {
      addToast('error', 'Failed to load sessions.');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  async function handleTerminate(sessionId) {
    setTerminatingId(sessionId);
    try {
      await userApi.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      addToast('success', 'Session terminated.');
    } catch {
      addToast('error', 'Failed to terminate session.');
    } finally {
      setTerminatingId(null);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleString();
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-spinner">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Active Sessions</h1>
        <p>Manage devices and browsers currently signed in to your account.</p>
      </div>

      {sessions.length === 0 ? (
        <div className="card">
          <p className="text-muted">No active sessions found.</p>
        </div>
      ) : (
        <div className="sessions-table-wrapper">
          <table className="sessions-table">
            <thead>
              <tr>
                <th>Device / IP</th>
                <th>Created</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr
                  key={session.sessionId}
                  className={session.current ? 'sessions-table__current' : ''}
                >
                  <td>
                    <div className="sessions-table__device">
                      <span>{session.ua || 'Unknown device'}</span>
                      <span className="sessions-table__ip">{session.ip || 'Unknown IP'}</span>
                    </div>
                  </td>
                  <td>{formatDate(session.createdAt)}</td>
                  <td>
                    {session.current ? (
                      <span className="badge badge--success">Current</span>
                    ) : (
                      <span className="badge badge--neutral">Active</span>
                    )}
                  </td>
                  <td>
                    {!session.current && (
                      <Button
                        variant="danger"
                        loading={terminatingId === session.sessionId}
                        onClick={() => handleTerminate(session.sessionId)}
                      >
                        Terminate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
