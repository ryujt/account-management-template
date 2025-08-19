import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAdminStore } from '@stores/adminStore';
import { ROLE_LABELS, STATUS_LABELS } from '@constants/ui';
import '@styles/UserList.css';

export default function UserList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { users, usersCursor, listUsers, clearUsers, error } = useAdminStore();
  const [filters, setFilters] = useState({
    query: searchParams.get('query') || '',
    role: searchParams.get('role') || '',
    status: searchParams.get('status') || ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUsers(true);
  }, []);

  const loadUsers = async (reset = false) => {
    setIsLoading(true);
    try {
      if (reset) {
        clearUsers();
      }
      await listUsers(
        filters.query,
        filters.role,
        filters.status,
        reset ? null : usersCursor
      );
    } catch (err) {
      console.error('Load users error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, val]) => {
      if (val) params.set(key, val);
    });
    setSearchParams(params);
  };

  const handleSearch = () => {
    clearUsers();
    loadUsers(true);
  };

  const handleLoadMore = () => {
    if (usersCursor && !isLoading) {
      loadUsers(false);
    }
  };

  const formatDate = dateString => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getRoleLabels = roles => {
    return roles?.map(role => ROLE_LABELS[role] || role).join(', ') || '-';
  };

  const getStatusLabel = status => {
    return STATUS_LABELS[status] || status;
  };

  return (
    <div className="user-list-page">
      <div className="page-header">
        <h1>사용자 관리</h1>
        <p>등록된 모든 사용자를 조회하고 관리하세요.</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label htmlFor="query">검색</label>
            <input
              type="text"
              id="query"
              value={filters.query}
              onChange={e => handleFilterChange('query', e.target.value)}
              placeholder="이메일, 이름, 사용자 ID 검색"
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="role">역할</label>
            <select
              id="role"
              value={filters.role}
              onChange={e => handleFilterChange('role', e.target.value)}
            >
              <option value="">전체</option>
              <option value="member">일반 사용자</option>
              <option value="admin">관리자</option>
              <option value="manager">매니저</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="status">상태</label>
            <select
              id="status"
              value={filters.status}
              onChange={e => handleFilterChange('status', e.target.value)}
            >
              <option value="">전체</option>
              <option value="active">활성</option>
              <option value="disabled">비활성</option>
            </select>
          </div>
          
          <div className="filter-actions">
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? '검색 중...' : '검색'}
            </button>
          </div>
        </div>
      </div>

      <div className="users-section">
        <div className="section-header">
          <h2>사용자 목록 ({users.length}명)</h2>
        </div>

        {users.length === 0 && !isLoading ? (
          <div className="empty-state">
            <p>조건에 맞는 사용자가 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="users-table">
              <div className="table-header">
                <div className="header-cell">사용자 정보</div>
                <div className="header-cell">역할</div>
                <div className="header-cell">상태</div>
                <div className="header-cell">가입일</div>
                <div className="header-cell">작업</div>
              </div>
              
              {users.map(user => (
                <div key={user.userId} className="table-row">
                  <div className="cell user-info">
                    <div className="user-name">{user.displayName}</div>
                    <div className="user-email">{user.email}</div>
                    <div className="user-id">{user.userId}</div>
                    {!user.emailVerified && (
                      <div className="unverified-badge">미인증</div>
                    )}
                  </div>
                  
                  <div className="cell">
                    <div className="roles-list">
                      {getRoleLabels(user.roles)}
                    </div>
                  </div>
                  
                  <div className="cell">
                    <span className={`status-badge ${user.status}`}>
                      {getStatusLabel(user.status)}
                    </span>
                  </div>
                  
                  <div className="cell">
                    {formatDate(user.createdAt)}
                  </div>
                  
                  <div className="cell">
                    <Link
                      to={`/admin/users/${user.userId}`}
                      className="btn btn-sm btn-secondary"
                    >
                      상세보기
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {usersCursor && (
              <div className="load-more-section">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="btn btn-secondary"
                >
                  {isLoading ? '로딩 중...' : '더 보기'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}