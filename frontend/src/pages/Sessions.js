import React, { useEffect, useState } from 'react';
import { useUserStore } from '@stores/userStore';
import '@styles/Sessions.css';

export default function Sessions() {
  const { sessions, fetchSessions, revokeSession, error, clearError } = useUserStore();
  const [revoking, setRevoking] = useState(new Set());

  useEffect(() => {
    fetchSessions().catch(console.error);
  }, [fetchSessions]);

  const handleRevokeSession = async (sessionId) => {
    if (revoking.has(sessionId)) return;

    setRevoking(prev => new Set(prev).add(sessionId));
    try {
      await revokeSession(sessionId);
    } catch (err) {
      console.error('Session revoke error:', err);
    } finally {
      setRevoking(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    }
  };

  const formatDate = dateString => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const formatExpiry = timestamp => {
    return new Date(timestamp * 1000).toLocaleString('ko-KR');
  };

  return (
    <div className="sessions-page">
      <div className="sessions-header">
        <h1>활성 세션 관리</h1>
        <p>현재 로그인된 모든 기기와 세션을 관리하세요.</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="sessions-content">
        {sessions.length === 0 ? (
          <div className="empty-state">
            <p>활성 세션이 없습니다.</p>
          </div>
        ) : (
          <div className="sessions-list">
            {sessions.map(session => (
              <div key={session.sessionId} className="session-card">
                <div className="session-info">
                  <div className="session-main">
                    <h3>{session.ua || 'Unknown Browser'}</h3>
                    <p className="session-ip">IP: {session.ip}</p>
                  </div>
                  <div className="session-details">
                    <div className="session-time">
                      <span className="time-label">로그인:</span>
                      <span className="time-value">{formatDate(session.createdAt)}</span>
                    </div>
                    <div className="session-time">
                      <span className="time-label">만료:</span>
                      <span className="time-value">{formatExpiry(session.expiresAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="session-actions">
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRevokeSession(session.sessionId)}
                    disabled={revoking.has(session.sessionId)}
                  >
                    {revoking.has(session.sessionId) ? '해제 중...' : '세션 해제'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="sessions-info">
          <div className="info-card">
            <h3>세션 관리 정보</h3>
            <ul>
              <li>각 세션은 기기별 로그인을 나타냅니다.</li>
              <li>세션을 해제하면 해당 기기에서 자동으로 로그아웃됩니다.</li>
              <li>현재 사용 중인 세션을 해제하면 다시 로그인해야 합니다.</li>
              <li>의심스러운 세션이나 사용하지 않는 기기의 세션은 즉시 해제하세요.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}