import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/adminApi';
import ProtectedRoute from '../components/ProtectedRoute';
import '../styles/admin.css';

function AdminUserDetailContent() {
  const userId = window.location.pathname.split('/').pop();
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    displayName: '',
    status: 'active'
  });

  useEffect(() => {
    loadUserDetail();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadUserDetail = async () => {
    setLoading(true);
    try {
      const result = await adminApi.getUser(userId);
      setUser(result.user);
      setSessions(result.sessions || []);
      setFormData({
        displayName: result.user.displayName,
        status: result.user.status
      });
    } catch (err) {
      setError(err.message || '사용자 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await adminApi.updateUser(userId, formData);
      loadUserDetail();
    } catch (err) {
      setError(err.message || '사용자 정보 업데이트에 실패했습니다.');
    }
  };

  const handleRoleToggle = async (role, hasRole) => {
    try {
      if (hasRole) {
        await adminApi.removeRole(userId, role);
      } else {
        await adminApi.assignRole(userId, role);
      }
      loadUserDetail();
    } catch (err) {
      setError(err.message || '역할 변경에 실패했습니다.');
    }
  };

  if (loading) {
    return <div className="loading">사용자 정보를 불러오는 중...</div>;
  }

  if (!user) {
    return <div className="error-message">사용자를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>사용자 상세 정보</h1>
        <a href="/" className="btn btn-outline">목록으로</a>
      </div>

      <div className="user-detail">
        {error && <div className="error-message">{error}</div>}
        
        <div className="detail-section">
          <h2>기본 정보</h2>
          <form onSubmit={handleUpdate}>
            <div className="form-grid">
              <div className="form-group">
                <label>이메일</label>
                <input type="text" value={user.email} disabled />
              </div>
              <div className="form-group">
                <label>사용자 ID</label>
                <input type="text" value={user.userId} disabled />
              </div>
              <div className="form-group">
                <label htmlFor="displayName">이름</label>
                <input
                  type="text"
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label htmlFor="status">상태</label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="active">활성</option>
                  <option value="disabled">비활성</option>
                </select>
              </div>
              <div className="form-group">
                <label>이메일 인증</label>
                <span className={user.emailVerified ? 'verified' : 'unverified'}>
                  {user.emailVerified ? '완료' : '미완료'}
                </span>
              </div>
              <div className="form-group">
                <label>가입일</label>
                <span>{new Date(user.createdAt).toLocaleString()}</span>
              </div>
            </div>
            <button type="submit" className="btn btn-primary">정보 업데이트</button>
          </form>
        </div>

        <div className="detail-section">
          <h2>역할 관리</h2>
          <div className="roles-management">
            <div className="role-item">
              <span>관리자</span>
              <button
                onClick={() => handleRoleToggle('admin', user.roles?.includes('admin'))}
                className={`btn ${user.roles?.includes('admin') ? 'btn-danger' : 'btn-primary'}`}
              >
                {user.roles?.includes('admin') ? '해제' : '부여'}
              </button>
            </div>
            <div className="role-item">
              <span>일반 사용자</span>
              <button
                onClick={() => handleRoleToggle('member', user.roles?.includes('member'))}
                className={`btn ${user.roles?.includes('member') ? 'btn-danger' : 'btn-primary'}`}
              >
                {user.roles?.includes('member') ? '해제' : '부여'}
              </button>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h2>활성 세션</h2>
          {sessions.length > 0 ? (
            <div className="sessions-table">
              <table>
                <thead>
                  <tr>
                    <th>세션 ID</th>
                    <th>IP 주소</th>
                    <th>사용자 에이전트</th>
                    <th>생성일</th>
                    <th>만료일</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(session => (
                    <tr key={session.sessionId}>
                      <td>{session.sessionId}</td>
                      <td>{session.ip}</td>
                      <td>{session.ua}</td>
                      <td>{new Date(session.createdAt).toLocaleString()}</td>
                      <td>{new Date(session.expiresAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>활성 세션이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminUserDetail() {
  return (
    <ProtectedRoute requireAuth={true} requireAdmin={true}>
      <AdminUserDetailContent />
    </ProtectedRoute>
  );
}