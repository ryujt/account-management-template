import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import { useLoadingStore } from '../stores/loadingStore';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Activity, 
  Edit3, 
  Save, 
  X,
  UserCheck,
  UserX,
  Plus,
  Trash2,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminUserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { setActionLoading, isActionLoading } = useLoadingStore();

  // 상태 관리
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // 편집 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: '',
    email: '',
    status: 'active'
  });

  // 역할 관리 상태
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');

  // 탭 상태
  const [activeTab, setActiveTab] = useState('info');

  // 초기 데이터 로드
  useEffect(() => {
    if (userId) {
      loadUserDetail();
      loadAvailableRoles();
    }
  }, [userId]);

  // 사용자 상세 정보 로드
  const loadUserDetail = async () => {
    try {
      setActionLoading('loadUser', true);

      const [userResponse, sessionsResponse] = await Promise.all([
        adminApi.getUserDetail(userId),
        adminApi.getUserSessions(userId).catch(() => ({ sessions: [] }))
      ]);

      const userData = userResponse.user || userResponse;
      setUser(userData);
      setSessions(sessionsResponse.sessions || []);

      // 편집 폼 초기화
      setEditForm({
        display_name: userData.display_name || '',
        email: userData.email || '',
        status: userData.status || 'active'
      });

    } catch (error) {
      console.error('사용자 상세 정보 로드 실패:', error);
      
      // 데모 데이터 (실제 환경에서는 제거)
      const demoUser = {
        user_id: parseInt(userId),
        email: 'john.doe@example.com',
        display_name: 'John Doe',
        status: 'active',
        email_verified: true,
        roles: ['member'],
        created_at: '2024-01-10T00:00:00Z',
        updated_at: '2024-01-15T10:30:00Z',
        last_login: '2024-01-15T09:15:00Z'
      };

      const demoSessions = [
        {
          session_id: 'session_1',
          ip: '192.168.1.100',
          ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          created_at: '2024-01-15T09:00:00Z',
          expires_at: '2024-01-22T09:00:00Z',
          revoked_at: null
        }
      ];

      setUser(demoUser);
      setSessions(demoSessions);
      setEditForm({
        display_name: demoUser.display_name,
        email: demoUser.email,
        status: demoUser.status
      });

    } finally {
      setActionLoading('loadUser', false);
    }
  };

  // 사용가능한 역할 목록 로드
  const loadAvailableRoles = async () => {
    try {
      const response = await adminApi.getRoles();
      setAvailableRoles(response.roles || []);
    } catch (error) {
      console.error('역할 목록 로드 실패:', error);
      setAvailableRoles([
        { role_name: 'admin', description: '관리자' },
        { role_name: 'member', description: '일반 사용자' }
      ]);
    }
  };

  // 사용자 정보 수정
  const handleSaveUser = async () => {
    try {
      setActionLoading('saveUser', true);

      await adminApi.updateUser(userId, editForm);
      
      // 사용자 정보 새로고침
      await loadUserDetail();
      setIsEditing(false);

    } catch (error) {
      console.error('사용자 정보 수정 실패:', error);
      alert('사용자 정보 수정에 실패했습니다.');
    } finally {
      setActionLoading('saveUser', false);
    }
  };

  // 사용자 상태 변경
  const handleStatusChange = async (newStatus) => {
    try {
      setActionLoading('changeStatus', true);

      await adminApi.updateUserStatus(userId, newStatus);
      
      // 사용자 정보 새로고침
      await loadUserDetail();

    } catch (error) {
      console.error('사용자 상태 변경 실패:', error);
      alert('상태 변경에 실패했습니다.');
    } finally {
      setActionLoading('changeStatus', false);
    }
  };

  // 역할 추가
  const handleAddRole = async () => {
    if (!selectedRole) return;

    try {
      setActionLoading('addRole', true);

      await adminApi.assignRole(userId, selectedRole);
      
      // 사용자 정보 새로고침
      await loadUserDetail();
      setShowRoleModal(false);
      setSelectedRole('');

    } catch (error) {
      console.error('역할 추가 실패:', error);
      alert('역할 추가에 실패했습니다.');
    } finally {
      setActionLoading('addRole', false);
    }
  };

  // 역할 제거
  const handleRemoveRole = async (roleName) => {
    if (!window.confirm(`'${roleName}' 역할을 제거하시겠습니까?`)) {
      return;
    }

    try {
      setActionLoading(`removeRole-${roleName}`, true);

      await adminApi.removeRole(userId, roleName);
      
      // 사용자 정보 새로고침
      await loadUserDetail();

    } catch (error) {
      console.error('역할 제거 실패:', error);
      alert('역할 제거에 실패했습니다.');
    } finally {
      setActionLoading(`removeRole-${roleName}`, false);
    }
  };

  // 세션 종료
  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm('이 세션을 종료하시겠습니까?')) {
      return;
    }

    try {
      setActionLoading(`revokeSession-${sessionId}`, true);

      await adminApi.revokeUserSession(userId, sessionId);
      
      // 세션 목록 새로고침
      const response = await adminApi.getUserSessions(userId);
      setSessions(response.sessions || []);

    } catch (error) {
      console.error('세션 종료 실패:', error);
      alert('세션 종료에 실패했습니다.');
    } finally {
      setActionLoading(`revokeSession-${sessionId}`, false);
    }
  };

  // 폼 입력 핸들러
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  if (isActionLoading('loadUser')) {
    return (
      <div className="loading-container">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="error-container">
        <p>사용자를 찾을 수 없습니다.</p>
        <button onClick={() => navigate('/users')} className="button primary">
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="user-detail-container">
      {/* 헤더 */}
      <div className="page-header">
        <div className="header-main">
          <button 
            className="back-button"
            onClick={() => navigate('/users')}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>사용자 상세</h1>
            <p>{user.email}</p>
          </div>
        </div>
        
        <div className="header-actions">
          <button
            className={`button ${user.status === 'active' ? 'danger' : 'success'}`}
            onClick={() => handleStatusChange(user.status === 'active' ? 'disabled' : 'active')}
            disabled={isActionLoading('changeStatus')}
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
          
          {isEditing ? (
            <>
              <button
                className="button success"
                onClick={handleSaveUser}
                disabled={isActionLoading('saveUser')}
              >
                <Save size={16} />
                저장
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  setIsEditing(false);
                  setEditForm({
                    display_name: user.display_name,
                    email: user.email,
                    status: user.status
                  });
                }}
              >
                <X size={16} />
                취소
              </button>
            </>
          ) : (
            <button
              className="button secondary"
              onClick={() => setIsEditing(true)}
            >
              <Edit3 size={16} />
              수정
            </button>
          )}
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          기본 정보
        </button>
        <button
          className={`tab ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          역할 관리
        </button>
        <button
          className={`tab ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          활성 세션
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="tab-content">
        {activeTab === 'info' && (
          <div className="info-section">
            <div className="info-card">
              <div className="card-header">
                <User size={20} />
                <h3>사용자 정보</h3>
              </div>
              
              <div className="card-content">
                <div className="form-grid">
                  <div className="form-group">
                    <label>표시 이름</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="display_name"
                        value={editForm.display_name}
                        onChange={handleFormChange}
                      />
                    ) : (
                      <div className="form-value">{user.display_name}</div>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label>이메일</label>
                    {isEditing ? (
                      <input
                        type="email"
                        name="email"
                        value={editForm.email}
                        onChange={handleFormChange}
                      />
                    ) : (
                      <div className="form-value">{user.email}</div>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label>상태</label>
                    {isEditing ? (
                      <select
                        name="status"
                        value={editForm.status}
                        onChange={handleFormChange}
                      >
                        <option value="active">활성</option>
                        <option value="disabled">비활성</option>
                      </select>
                    ) : (
                      <div className="form-value">
                        <span className={`status-badge ${user.status}`}>
                          {user.status === 'active' ? '활성' : '비활성'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label>이메일 인증</label>
                    <div className="form-value">
                      <span className={`status-badge ${user.email_verified ? 'verified' : 'unverified'}`}>
                        {user.email_verified ? '인증됨' : '미인증'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>가입일</label>
                    <div className="form-value">
                      {format(new Date(user.created_at), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>마지막 로그인</label>
                    <div className="form-value">
                      {user.last_login 
                        ? format(new Date(user.last_login), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })
                        : '로그인 기록 없음'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'roles' && (
          <div className="roles-section">
            <div className="roles-card">
              <div className="card-header">
                <Shield size={20} />
                <h3>사용자 역할</h3>
                <button
                  className="button primary small"
                  onClick={() => setShowRoleModal(true)}
                >
                  <Plus size={16} />
                  역할 추가
                </button>
              </div>
              
              <div className="card-content">
                <div className="roles-list">
                  {user.roles && user.roles.length > 0 ? (
                    user.roles.map(role => (
                      <div key={role} className="role-item">
                        <div className="role-info">
                          <span className={`role-badge ${role}`}>
                            {role === 'admin' ? '관리자' : '일반 사용자'}
                          </span>
                          <span className="role-name">{role}</span>
                        </div>
                        <button
                          className="button danger small"
                          onClick={() => handleRemoveRole(role)}
                          disabled={isActionLoading(`removeRole-${role}`)}
                        >
                          <Trash2 size={14} />
                          제거
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <p>할당된 역할이 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="sessions-section">
            <div className="sessions-card">
              <div className="card-header">
                <Activity size={20} />
                <h3>활성 세션</h3>
              </div>
              
              <div className="card-content">
                <div className="sessions-list">
                  {sessions && sessions.length > 0 ? (
                    sessions.map(session => (
                      <div key={session.session_id} className="session-item">
                        <div className="session-info">
                          <div className="session-header">
                            <span className="session-ip">{session.ip}</span>
                            <span className="session-status active">활성</span>
                          </div>
                          <div className="session-details">
                            <div className="session-ua">
                              {session.ua?.substring(0, 60)}...
                            </div>
                            <div className="session-times">
                              <span>시작: {format(new Date(session.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}</span>
                              <span>만료: {format(new Date(session.expires_at), 'yyyy.MM.dd HH:mm', { locale: ko })}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          className="button danger small"
                          onClick={() => handleRevokeSession(session.session_id)}
                          disabled={isActionLoading(`revokeSession-${session.session_id}`)}
                        >
                          종료
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <p>활성 세션이 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 역할 추가 모달 */}
      {showRoleModal && (
        <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>역할 추가</h3>
              <button
                className="modal-close"
                onClick={() => setShowRoleModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label>역할 선택</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="">역할을 선택하세요</option>
                  {availableRoles
                    .filter(role => !user.roles?.includes(role.role_name))
                    .map(role => (
                      <option key={role.role_name} value={role.role_name}>
                        {role.description}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            
            <div className="modal-actions">
              <button
                className="button secondary"
                onClick={() => setShowRoleModal(false)}
              >
                취소
              </button>
              <button
                className="button primary"
                onClick={handleAddRole}
                disabled={!selectedRole || isActionLoading('addRole')}
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserDetail;