import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import { useLoadingStore } from '../stores/loadingStore';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX,
  Shield,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminUserList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setActionLoading, isActionLoading } = useLoadingStore();

  // 상태 관리
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [roles, setRoles] = useState([]);
  
  // 필터 및 검색 상태
  const [filters, setFilters] = useState({
    query: searchParams.get('query') || '',
    role: searchParams.get('role') || '',
    status: searchParams.get('status') || '',
    sortBy: searchParams.get('sortBy') || 'created_at',
    sortOrder: searchParams.get('sortOrder') || 'desc'
  });

  // 페이지네이션
  const [pagination, setPagination] = useState({
    cursor: null,
    limit: 20,
    hasNext: false,
    hasPrevious: false
  });

  // UI 상태
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [actionMenus, setActionMenus] = useState({});

  // 초기 데이터 로드
  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  // URL 파라미터 변경시 데이터 로드
  useEffect(() => {
    const newFilters = {
      query: searchParams.get('query') || '',
      role: searchParams.get('role') || '',
      status: searchParams.get('status') || '',
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: searchParams.get('sortOrder') || 'desc'
    };
    setFilters(newFilters);
    loadUsers(newFilters);
  }, [searchParams]);

  // 사용자 목록 로드
  const loadUsers = async (customFilters = null) => {
    try {
      setActionLoading('loadUsers', true);

      const params = {
        ...(customFilters || filters),
        cursor: pagination.cursor,
        limit: pagination.limit
      };

      const response = await adminApi.getUsers(params);
      
      setUsers(response.users || []);
      setTotalCount(response.totalCount || 0);
      setPagination(prev => ({
        ...prev,
        hasNext: response.hasNext || false,
        hasPrevious: response.hasPrevious || false
      }));

    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
      
      // 데모 데이터 (실제 환경에서는 제거)
      const demoUsers = [
        {
          user_id: 1,
          email: 'admin@example.com',
          display_name: '시스템 관리자',
          status: 'active',
          email_verified: true,
          roles: ['admin'],
          created_at: '2024-01-01T00:00:00Z',
          last_login: '2024-01-15T10:30:00Z'
        },
        {
          user_id: 2,
          email: 'john.doe@example.com',
          display_name: 'John Doe',
          status: 'active',
          email_verified: true,
          roles: ['member'],
          created_at: '2024-01-10T00:00:00Z',
          last_login: '2024-01-15T09:15:00Z'
        },
        {
          user_id: 3,
          email: 'jane.smith@example.com',
          display_name: 'Jane Smith',
          status: 'disabled',
          email_verified: false,
          roles: ['member'],
          created_at: '2024-01-12T00:00:00Z',
          last_login: null
        }
      ];
      
      setUsers(demoUsers);
      setTotalCount(demoUsers.length);
      
    } finally {
      setActionLoading('loadUsers', false);
    }
  };

  // 역할 목록 로드
  const loadRoles = async () => {
    try {
      const response = await adminApi.getRoles();
      setRoles(response.roles || []);
    } catch (error) {
      console.error('역할 목록 로드 실패:', error);
      setRoles([
        { role_name: 'admin', description: '관리자' },
        { role_name: 'member', description: '일반 사용자' }
      ]);
    }
  };

  // 검색 및 필터 적용
  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    setSearchParams(params);
  }, [filters, setSearchParams]);

  // 검색어 변경
  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, query: e.target.value }));
  };

  // 검색 실행
  const handleSearch = (e) => {
    e.preventDefault();
    applyFilters();
  };

  // 필터 변경
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // 정렬 변경
  const handleSort = (column) => {
    const newOrder = filters.sortBy === column && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    setFilters(prev => ({
      ...prev,
      sortBy: column,
      sortOrder: newOrder
    }));
    applyFilters();
  };

  // 사용자 상태 변경
  const handleStatusChange = async (userId, newStatus) => {
    try {
      setActionLoading(`status-${userId}`, true);
      
      await adminApi.updateUserStatus(userId, newStatus);
      
      // 목록 새로고침
      loadUsers();
      
    } catch (error) {
      console.error('사용자 상태 변경 실패:', error);
      alert('상태 변경에 실패했습니다.');
    } finally {
      setActionLoading(`status-${userId}`, false);
    }
  };

  // 사용자 삭제
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      return;
    }

    try {
      setActionLoading(`delete-${userId}`, true);
      
      await adminApi.deleteUser(userId);
      
      // 목록 새로고침
      loadUsers();
      
    } catch (error) {
      console.error('사용자 삭제 실패:', error);
      alert('사용자 삭제에 실패했습니다.');
    } finally {
      setActionLoading(`delete-${userId}`, false);
    }
  };

  // 액션 메뉴 토글
  const toggleActionMenu = (userId) => {
    setActionMenus(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // 사용자 선택 토글
  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // 모든 사용자 선택/해제
  const toggleAllUsers = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.user_id));
    }
  };

  // 상태 배지 렌더링
  const renderStatusBadge = (status, isVerified) => (
    <div className={`status-badges`}>
      <span className={`status-badge ${status}`}>
        {status === 'active' ? '활성' : '비활성'}
      </span>
      {!isVerified && (
        <span className="status-badge unverified">미인증</span>
      )}
    </div>
  );

  // 역할 배지 렌더링
  const renderRoleBadges = (userRoles) => (
    <div className="role-badges">
      {userRoles.map(role => (
        <span key={role} className={`role-badge ${role}`}>
          {role === 'admin' ? '관리자' : '사용자'}
        </span>
      ))}
    </div>
  );

  return (
    <div className="user-list-container">
      {/* 헤더 */}
      <div className="page-header">
        <div className="header-main">
          <h1>사용자 관리</h1>
          <p>전체 {totalCount.toLocaleString()}명의 사용자</p>
        </div>
        <div className="header-actions">
          <button 
            className="button secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} />
            필터
          </button>
          <button 
            className="button primary"
            onClick={() => navigate('/users/create')}
          >
            <Plus size={20} />
            사용자 추가
          </button>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-group">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="이름, 이메일로 검색..."
              value={filters.query}
              onChange={handleSearchChange}
              className="search-input"
            />
          </div>
          <button type="submit" className="button primary">
            검색
          </button>
        </form>

        {showFilters && (
          <div className="filters-panel">
            <div className="filter-group">
              <label>역할</label>
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
              >
                <option value="">전체</option>
                {roles.map(role => (
                  <option key={role.role_name} value={role.role_name}>
                    {role.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>상태</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">전체</option>
                <option value="active">활성</option>
                <option value="disabled">비활성</option>
              </select>
            </div>

            <div className="filter-actions">
              <button 
                type="button"
                className="button secondary"
                onClick={() => {
                  setFilters({
                    query: '',
                    role: '',
                    status: '',
                    sortBy: 'created_at',
                    sortOrder: 'desc'
                  });
                  setSearchParams({});
                }}
              >
                초기화
              </button>
              <button 
                type="button"
                className="button primary"
                onClick={applyFilters}
              >
                적용
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 사용자 테이블 */}
      <div className="table-container">
        {isActionLoading('loadUsers') ? (
          <div className="loading-container">
            <LoadingSpinner />
          </div>
        ) : (
          <table className="user-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={toggleAllUsers}
                  />
                </th>
                <th 
                  className="sortable"
                  onClick={() => handleSort('display_name')}
                >
                  사용자 정보
                  {filters.sortBy === 'display_name' && (
                    <span className={`sort-indicator ${filters.sortOrder}`} />
                  )}
                </th>
                <th>역할</th>
                <th>상태</th>
                <th 
                  className="sortable"
                  onClick={() => handleSort('created_at')}
                >
                  가입일
                  {filters.sortBy === 'created_at' && (
                    <span className={`sort-indicator ${filters.sortOrder}`} />
                  )}
                </th>
                <th>마지막 로그인</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.user_id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.user_id)}
                      onChange={() => toggleUserSelection(user.user_id)}
                    />
                  </td>
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">
                        {user.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-details">
                        <div className="user-name">{user.display_name}</div>
                        <div className="user-email">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {renderRoleBadges(user.roles)}
                  </td>
                  <td>
                    {renderStatusBadge(user.status, user.email_verified)}
                  </td>
                  <td>
                    {format(new Date(user.created_at), 'yyyy.MM.dd', { locale: ko })}
                  </td>
                  <td>
                    {user.last_login 
                      ? format(new Date(user.last_login), 'yyyy.MM.dd HH:mm', { locale: ko })
                      : '로그인 기록 없음'
                    }
                  </td>
                  <td>
                    <div className="action-menu-container">
                      <button
                        className="action-menu-button"
                        onClick={() => toggleActionMenu(user.user_id)}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {actionMenus[user.user_id] && (
                        <div className="action-menu">
                          <button
                            onClick={() => navigate(`/users/${user.user_id}`)}
                          >
                            <Edit size={16} />
                            상세보기
                          </button>
                          
                          <button
                            onClick={() => handleStatusChange(
                              user.user_id, 
                              user.status === 'active' ? 'disabled' : 'active'
                            )}
                            disabled={isActionLoading(`status-${user.user_id}`)}
                          >
                            {user.status === 'active' ? (
                              <>
                                <UserX size={16} />
                                비활성화
                              </>
                            ) : (
                              <>
                                <UserCheck size={16} />
                                활성화
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => navigate(`/users/${user.user_id}/roles`)}
                          >
                            <Shield size={16} />
                            역할 관리
                          </button>

                          <button
                            onClick={() => handleDeleteUser(user.user_id)}
                            disabled={isActionLoading(`delete-${user.user_id}`)}
                            className="danger"
                          >
                            <Trash2 size={16} />
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {users.length === 0 && !isActionLoading('loadUsers') && (
          <div className="empty-state">
            <p>조건에 맞는 사용자가 없습니다.</p>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {(pagination.hasNext || pagination.hasPrevious) && (
        <div className="pagination">
          <button
            className="pagination-button"
            disabled={!pagination.hasPrevious}
            onClick={() => {
              // 이전 페이지 로직
              setPagination(prev => ({ ...prev, cursor: null })); // 실제로는 이전 커서 사용
              loadUsers();
            }}
          >
            <ChevronLeft size={16} />
            이전
          </button>

          <button
            className="pagination-button"
            disabled={!pagination.hasNext}
            onClick={() => {
              // 다음 페이지 로직
              const lastUser = users[users.length - 1];
              setPagination(prev => ({ ...prev, cursor: lastUser?.user_id }));
              loadUsers();
            }}
          >
            다음
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* 선택된 사용자 일괄 작업 */}
      {selectedUsers.length > 0 && (
        <div className="bulk-actions">
          <div className="bulk-actions-info">
            {selectedUsers.length}명 선택됨
          </div>
          <div className="bulk-actions-buttons">
            <button className="button secondary">
              일괄 활성화
            </button>
            <button className="button secondary">
              일괄 비활성화
            </button>
            <button className="button danger">
              일괄 삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserList;