import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import { useLoadingStore } from '../stores/loadingStore';
import { 
  Search, 
  Filter, 
  Download, 
  Clock, 
  User, 
  Activity,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminAuditLog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setActionLoading, isActionLoading } = useLoadingStore();

  // 상태 관리
  const [auditLogs, setAuditLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  // 필터 상태
  const [filters, setFilters] = useState({
    userId: searchParams.get('userId') || '',
    action: searchParams.get('action') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    query: searchParams.get('query') || ''
  });

  // 페이지네이션
  const [pagination, setPagination] = useState({
    cursor: null,
    limit: 50,
    hasNext: false,
    hasPrevious: false
  });

  // UI 상태
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState([]);

  // 액션 타입 정의
  const actionTypes = [
    { value: 'user_created', label: '사용자 생성' },
    { value: 'user_updated', label: '사용자 수정' },
    { value: 'user_deleted', label: '사용자 삭제' },
    { value: 'user_status_changed', label: '사용자 상태 변경' },
    { value: 'role_assigned', label: '역할 부여' },
    { value: 'role_removed', label: '역할 해제' },
    { value: 'session_revoked', label: '세션 종료' },
    { value: 'login_success', label: '로그인 성공' },
    { value: 'login_failed', label: '로그인 실패' },
    { value: 'password_changed', label: '비밀번호 변경' }
  ];

  // 초기 데이터 로드
  useEffect(() => {
    loadAuditLogs();
  }, []);

  // URL 파라미터 변경시 데이터 로드
  useEffect(() => {
    const newFilters = {
      userId: searchParams.get('userId') || '',
      action: searchParams.get('action') || '',
      startDate: searchParams.get('startDate') || '',
      endDate: searchParams.get('endDate') || '',
      query: searchParams.get('query') || ''
    };
    setFilters(newFilters);
    loadAuditLogs(newFilters);
  }, [searchParams]);

  // 감사 로그 로드
  const loadAuditLogs = async (customFilters = null) => {
    try {
      setActionLoading('loadAuditLogs', true);

      const params = {
        ...(customFilters || filters),
        cursor: pagination.cursor,
        limit: pagination.limit
      };

      const response = await adminApi.getAuditLogs(params);
      
      setAuditLogs(response.logs || []);
      setTotalCount(response.totalCount || 0);
      setPagination(prev => ({
        ...prev,
        hasNext: response.hasNext || false,
        hasPrevious: response.hasPrevious || false
      }));

    } catch (error) {
      console.error('감사 로그 로드 실패:', error);
      
      // 데모 데이터 (실제 환경에서는 제거)
      const demoLogs = [
        {
          id: 1,
          action: 'user_created',
          actor_email: 'admin@example.com',
          target_email: 'john.doe@example.com',
          details: { name: 'John Doe', roles: ['member'] },
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          timestamp: '2024-01-15T10:30:00Z'
        },
        {
          id: 2,
          action: 'role_assigned',
          actor_email: 'admin@example.com',
          target_email: 'jane.smith@example.com',
          details: { role: 'admin', previous_roles: ['member'] },
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          timestamp: '2024-01-15T09:15:00Z'
        },
        {
          id: 3,
          action: 'user_status_changed',
          actor_email: 'admin@example.com',
          target_email: 'disabled.user@example.com',
          details: { from_status: 'active', to_status: 'disabled' },
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          timestamp: '2024-01-15T08:45:00Z'
        },
        {
          id: 4,
          action: 'login_success',
          actor_email: 'user@example.com',
          target_email: 'user@example.com',
          details: {},
          ip_address: '192.168.1.200',
          user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          timestamp: '2024-01-15T08:20:00Z'
        }
      ];
      
      setAuditLogs(demoLogs);
      setTotalCount(demoLogs.length);
      
    } finally {
      setActionLoading('loadAuditLogs', false);
    }
  };

  // 필터 적용
  const applyFilters = () => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    setSearchParams(params);
  };

  // 필터 변경
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // 검색 실행
  const handleSearch = (e) => {
    e.preventDefault();
    applyFilters();
  };

  // 날짜 필터 프리셋
  const setDatePreset = (preset) => {
    const today = new Date();
    let startDate, endDate;

    switch (preset) {
      case 'today':
        startDate = startOfDay(today);
        endDate = endOfDay(today);
        break;
      case 'week':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = today;
        break;
      case 'month':
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = today;
        break;
      default:
        return;
    }

    setFilters(prev => ({
      ...prev,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    }));
  };

  // 로그 내보내기
  const handleExportLogs = async () => {
    try {
      setActionLoading('exportLogs', true);
      
      // 실제 API 호출로 CSV/Excel 파일 다운로드
      // const response = await adminApi.exportAuditLogs(filters);
      
      // 데모용 - CSV 생성
      const csvContent = [
        'Timestamp,Action,Actor,Target,IP Address,Details',
        ...auditLogs.map(log => [
          format(parseISO(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
          getActionLabel(log.action),
          log.actor_email,
          log.target_email || '',
          log.ip_address,
          JSON.stringify(log.details)
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('로그 내보내기 실패:', error);
      alert('로그 내보내기에 실패했습니다.');
    } finally {
      setActionLoading('exportLogs', false);
    }
  };

  // 액션 라벨 가져오기
  const getActionLabel = (action) => {
    const actionType = actionTypes.find(type => type.value === action);
    return actionType ? actionType.label : action;
  };

  // 로그 세부 정보 렌더링
  const renderLogDetails = (log) => {
    const details = log.details || {};
    
    switch (log.action) {
      case 'user_created':
        return `사용자 생성: ${details.name}`;
      case 'user_updated':
        return `사용자 정보 수정`;
      case 'user_status_changed':
        return `상태 변경: ${details.from_status} → ${details.to_status}`;
      case 'role_assigned':
        return `역할 부여: ${details.role}`;
      case 'role_removed':
        return `역할 해제: ${details.role}`;
      case 'session_revoked':
        return `세션 종료`;
      case 'login_success':
        return `로그인 성공`;
      case 'login_failed':
        return `로그인 실패: ${details.reason || ''}`;
      default:
        return JSON.stringify(details);
    }
  };

  // 액션 아이콘 렌더링
  const renderActionIcon = (action) => {
    switch (action) {
      case 'user_created':
      case 'user_updated':
        return <User size={16} className="text-blue-500" />;
      case 'user_deleted':
        return <User size={16} className="text-red-500" />;
      case 'role_assigned':
      case 'role_removed':
        return <Activity size={16} className="text-purple-500" />;
      case 'login_success':
        return <Clock size={16} className="text-green-500" />;
      case 'login_failed':
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return <Activity size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="audit-log-container">
      {/* 헤더 */}
      <div className="page-header">
        <div className="header-main">
          <h1>감사 로그</h1>
          <p>시스템 활동 기록 - 전체 {totalCount.toLocaleString()}건</p>
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
            onClick={handleExportLogs}
            disabled={isActionLoading('exportLogs')}
          >
            {isActionLoading('exportLogs') ? (
              <LoadingSpinner size="small" />
            ) : (
              <>
                <Download size={20} />
                내보내기
              </>
            )}
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
              placeholder="사용자 이메일로 검색..."
              value={filters.query}
              onChange={(e) => handleFilterChange('query', e.target.value)}
              className="search-input"
            />
          </div>
          <button type="submit" className="button primary">
            검색
          </button>
        </form>

        {showFilters && (
          <div className="filters-panel">
            <div className="filter-grid">
              <div className="filter-group">
                <label>액션 타입</label>
                <select
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                >
                  <option value="">전체</option>
                  {actionTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>시작 날짜</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>종료 날짜</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
            </div>

            <div className="date-presets">
              <button 
                type="button"
                className="button small secondary"
                onClick={() => setDatePreset('today')}
              >
                오늘
              </button>
              <button 
                type="button"
                className="button small secondary"
                onClick={() => setDatePreset('week')}
              >
                최근 7일
              </button>
              <button 
                type="button"
                className="button small secondary"
                onClick={() => setDatePreset('month')}
              >
                최근 30일
              </button>
            </div>

            <div className="filter-actions">
              <button 
                type="button"
                className="button secondary"
                onClick={() => {
                  setFilters({
                    userId: '',
                    action: '',
                    startDate: '',
                    endDate: '',
                    query: ''
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

      {/* 감사 로그 목록 */}
      <div className="audit-log-list">
        {isActionLoading('loadAuditLogs') ? (
          <div className="loading-container">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {auditLogs.map(log => (
              <div key={log.id} className="log-item">
                <div className="log-header">
                  <div className="log-action">
                    {renderActionIcon(log.action)}
                    <span className="action-label">{getActionLabel(log.action)}</span>
                  </div>
                  <div className="log-timestamp">
                    <Clock size={14} />
                    {format(parseISO(log.timestamp), 'yyyy.MM.dd HH:mm:ss', { locale: ko })}
                  </div>
                </div>

                <div className="log-content">
                  <div className="log-main">
                    <div className="log-actors">
                      <span className="actor">실행자: {log.actor_email}</span>
                      {log.target_email && log.target_email !== log.actor_email && (
                        <span className="target">대상: {log.target_email}</span>
                      )}
                    </div>
                    <div className="log-details">
                      {renderLogDetails(log)}
                    </div>
                  </div>
                  
                  <div className="log-meta">
                    <span className="log-ip">IP: {log.ip_address}</span>
                    {log.user_agent && (
                      <span className="log-ua" title={log.user_agent}>
                        {log.user_agent.substring(0, 50)}...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {auditLogs.length === 0 && (
              <div className="empty-state">
                <Calendar size={48} />
                <p>조건에 맞는 감사 로그가 없습니다.</p>
                <button 
                  className="button secondary"
                  onClick={() => {
                    setFilters({
                      userId: '',
                      action: '',
                      startDate: '',
                      endDate: '',
                      query: ''
                    });
                    setSearchParams({});
                  }}
                >
                  필터 초기화
                </button>
              </div>
            )}
          </>
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
              loadAuditLogs();
            }}
          >
            <ChevronLeft size={16} />
            이전
          </button>

          <div className="pagination-info">
            {auditLogs.length}건 표시 중
          </div>

          <button
            className="pagination-button"
            disabled={!pagination.hasNext}
            onClick={() => {
              // 다음 페이지 로직
              const lastLog = auditLogs[auditLogs.length - 1];
              setPagination(prev => ({ ...prev, cursor: lastLog?.id }));
              loadAuditLogs();
            }}
          >
            다음
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLog;