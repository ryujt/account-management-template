import { useState, useEffect } from 'react';

export default function UserFilters({ filters, onChange }) {
  const [query, setQuery] = useState(filters.query || '');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== (filters.query || '')) {
        onChange({ ...filters, query, cursor: undefined });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleRoleChange = (e) => {
    onChange({ ...filters, role: e.target.value || undefined, cursor: undefined });
  };

  const handleStatusChange = (e) => {
    onChange({ ...filters, status: e.target.value || undefined, cursor: undefined });
  };

  return (
    <div className="filters">
      <div className="filter-group">
        <input
          type="text"
          className="form-input"
          placeholder="Search by email or name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="filter-group">
        <select
          className="form-select"
          value={filters.role || ''}
          onChange={handleRoleChange}
        >
          <option value="">All Roles</option>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div className="filter-group">
        <select
          className="form-select"
          value={filters.status || ''}
          onChange={handleStatusChange}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
          <option value="suspended">Suspended</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
      </div>
    </div>
  );
}
