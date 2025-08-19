import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/adminApi';
import ProtectedRoute from '../components/ProtectedRoute';
import '../styles/admin.css';

function AdminAuditLogContent() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    actor: '',
    action: '',
    from: '',
    to: ''
  });

  useEffect(() => {
    loadAuditLogs();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      Object.keys(filters).forEach(key => {
        if (filters[key]) params[key] = filters[key];
      });
      
      const result = await adminApi.getAuditLogs(params);
      setLogs(result.items || []);
    } catch (err) {
      setError(err.message || '감사 로그를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      actor: '',
      action: '',
      from: '',
      to: ''
    });
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>감사 로그</h1>
        <div className="admin-nav">
          <a href="/users" className="nav-tab">사용자 관리</a>
          <a href="/audit" className="nav-tab active">감사 로그</a>
        </div>
      </div>

      <div className="admin-content">
        <div className="audit-filters">
          <div className="filter-row">
            <input
              type="text"
              placeholder="행위자 사용자 ID"
              value={filters.actor}
              onChange={(e) => handleFilterChange('actor', e.target.value)}
              className="filter-input"
            />
            <input
              type="text"
              placeholder="액션"
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-row">
            <input
              type="datetime-local"
              placeholder="시작일"
              value={filters.from}
              onChange={(e) => handleFilterChange('from', e.target.value)}
              className="filter-input"
            />
            <input
              type="datetime-local"
              placeholder="종료일"
              value={filters.to}
              onChange={(e) => handleFilterChange('to', e.target.value)}
              className="filter-input"
            />
            <button onClick={clearFilters} className="btn btn-outline">
              필터 초기화
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading">감사 로그를 불러오는 중...</div>
        ) : (
          <div className="audit-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>행위자</th>
                  <th>액션</th>
                  <th>리소스</th>
                  <th>메타데이터</th>
                  <th>발생시간</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td>{log.id}</td>
                    <td>{log.actorUserId}</td>
                    <td>
                      <span className={`action-badge ${log.action.toLowerCase()}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.resource}</td>
                    <td>
                      {log.metadata && (
                        <details>
                          <summary>메타데이터</summary>
                          <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                        </details>
                      )}
                    </td>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {logs.length === 0 && (
              <div className="no-data">감사 로그가 없습니다.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminAuditLog() {
  return (
    <ProtectedRoute requireAuth={true} requireAdmin={true}>
      <AdminAuditLogContent />
    </ProtectedRoute>
  );
}