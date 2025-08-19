import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/adminApi';
import ProtectedRoute from '../components/ProtectedRoute';
import '../styles/admin.css';

function AdminDashboardContent() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadUsers();
  }, [searchQuery, roleFilter, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) params.query = searchQuery;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      
      const result = await adminApi.getUsers(params);
      setUsers(result.items || []);
    } catch (err) {
      setError(err.message || '사용자 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await adminApi.updateUser(userId, { status: newStatus });
      loadUsers();
    } catch (err) {
      setError(err.message || '상태 변경에 실패했습니다.');
    }
  };

  const handleRoleToggle = async (userId, role, hasRole) => {
    try {
      if (hasRole) {
        await adminApi.removeRole(userId, role);
      } else {
        await adminApi.assignRole(userId, role);
      }
      loadUsers();
    } catch (err) {
      setError(err.message || '역할 변경에 실패했습니다.');
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>관리자 대시보드</h1>
        <div className="admin-nav">
          <a href="/users" className="nav-tab active">사용자 관리</a>
          <a href="/audit" className="nav-tab">감사 로그</a>
        </div>
      </div>

      <div className="admin-content">
        <div className="filters">
          <input
            type="text"
            placeholder="이메일 또는 이름으로 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">모든 역할</option>
            <option value="admin">관리자</option>
            <option value="member">일반 사용자</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">모든 상태</option>
            <option value="active">활성</option>
            <option value="disabled">비활성</option>
          </select>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading">사용자 목록을 불러오는 중...</div>
        ) : (
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>이메일</th>
                  <th>이름</th>
                  <th>역할</th>
                  <th>상태</th>
                  <th>가입일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.userId}>
                    <td>{user.email}</td>
                    <td>{user.displayName}</td>
                    <td>
                      <div className="roles">
                        {user.roles?.map(role => (
                          <span key={role} className={`role-badge ${role}`}>
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <select
                        value={user.status}
                        onChange={(e) => handleStatusChange(user.userId, e.target.value)}
                        className={`status-select ${user.status}`}
                      >
                        <option value="active">활성</option>
                        <option value="disabled">비활성</option>
                      </select>
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="user-actions">
                        <button
                          onClick={() => handleRoleToggle(user.userId, 'admin', user.roles?.includes('admin'))}
                          className={`btn btn-sm ${user.roles?.includes('admin') ? 'btn-danger' : 'btn-primary'}`}
                        >
                          {user.roles?.includes('admin') ? '관리자 해제' : '관리자 부여'}
                        </button>
                        <a href={`/users/${user.userId}`} className="btn btn-sm btn-outline">
                          상세
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <ProtectedRoute requireAuth={true} requireAdmin={true}>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}