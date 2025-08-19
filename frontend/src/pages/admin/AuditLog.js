import React, { useState, useEffect } from 'react';
import { useAdminStore } from '@stores/adminStore';
import { ACTION_LABELS, AUDIT_ACTIONS } from '@constants/ui';
import '@styles/AuditLog.css';

export default function AuditLog() {
  const { auditLogs, auditCursor, getAuditLogs, clearAuditLogs, error } = useAdminStore();
  const [filters, setFilters] = useState({
    actor: '',
    action: '',
    from: '',
    to: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAuditLogs(true);
  }, []);

  const loadAuditLogs = async (reset = false) => {
    setIsLoading(true);
    try {
      if (reset) {
        clearAuditLogs();
      }
      await getAuditLogs(
        filters.actor,
        filters.action,
        filters.from,
        filters.to,
        reset ? null : auditCursor
      );
    } catch (err) {
      console.error('Load audit logs error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    clearAuditLogs();
    loadAuditLogs(true);
  };

  const handleClearFilters = () => {
    setFilters({
      actor: '',
      action: '',
      from: '',
      to: ''
    });
  };

  const handleLoadMore = () => {
    if (auditCursor && !isLoading) {
      loadAuditLogs(false);
    }
  };

  const formatDate = dateString => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const getActionLabel = action => {
    return ACTION_LABELS[action] || action;
  };

  const formatResource = resource => {
    if (resource.startsWith('USER#')) {
      return `사용자: ${resource.replace('USER#', '')}`;
    }
    if (resource.startsWith('INVITE#')) {
      return `초대: ${resource.replace('INVITE#', '')}`;
    }
    return resource;
  };

  const formatMetadata = metadata => {
    if (!metadata || Object.keys(metadata).length === 0) {
      return null;
    }
    
    return Object.entries(metadata).map(([key, value]) => (
      <div key={key} className="metadata-item">
        <span className="metadata-key">{key}:</span>
        <span className="metadata-value">{JSON.stringify(value)}</span>
      </div>
    ));
  };

  return (
    <div className="audit-log-page">
      <div className="page-header">
        <h1>감사 로그</h1>
        <p>시스템의 모든 중요한 활동을 추적하고 모니터링하세요.</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label htmlFor="actor">사용자 ID</label>
            <input
              type="text"
              id="actor"
              value={filters.actor}
              onChange={e => handleFilterChange('actor', e.target.value)}
              placeholder="특정 사용자의 활동 검색"
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="action">액션</label>
            <select
              id="action"
              value={filters.action}
              onChange={e => handleFilterChange('action', e.target.value)}
            >
              <option value="">전체</option>
              {Object.values(AUDIT_ACTIONS).map(action => (
                <option key={action} value={action}>
                  {ACTION_LABELS[action]}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="from">시작일</label>
            <input
              type="date"
              id="from"
              value={filters.from}
              onChange={e => handleFilterChange('from', e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="to">종료일</label>
            <input
              type="date"
              id="to"
              value={filters.to}
              onChange={e => handleFilterChange('to', e.target.value)}
            />
          </div>
        </div>
        
        <div className="filter-actions">
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? '검색 중...' : '검색'}
          </button>
          <button
            onClick={handleClearFilters}
            className="btn btn-secondary"
          >
            필터 초기화
          </button>
        </div>
      </div>

      <div className="logs-section">
        <div className="section-header">
          <h2>감사 로그 ({auditLogs.length})</h2>
        </div>

        {auditLogs.length === 0 && !isLoading ? (
          <div className="empty-state">
            <p>조건에 맞는 로그가 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="logs-list">
              {auditLogs.map(log => (
                <div key={`${log.id}-${log.createdAt}`} className="log-card">
                  <div className="log-header">
                    <div className="log-action">
                      <span className="action-label">{getActionLabel(log.action)}</span>
                      <span className="log-id">#{log.id}</span>
                    </div>
                    <div className="log-time">{formatDate(log.createdAt)}</div>
                  </div>
                  
                  <div className="log-details">
                    <div className="log-actor">
                      <span className="detail-label">수행자:</span>
                      <span className="detail-value">{log.actorUserId}</span>
                    </div>
                    
                    <div className="log-resource">
                      <span className="detail-label">대상:</span>
                      <span className="detail-value">{formatResource(log.resource)}</span>
                    </div>
                    
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="log-metadata">
                        <span className="detail-label">세부정보:</span>
                        <div className="metadata-content">
                          {formatMetadata(log.metadata)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {auditCursor && (
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