import { useState, useEffect, useCallback } from 'react';
import UserFilters from '../components/users/UserFilters';
import UserTable from '../components/users/UserTable';
import Pagination from '../components/common/Pagination';
import { listUsers } from '../api/admin';
import useUiStore from '../stores/uiStore';

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ query: '', role: undefined, status: undefined });
  const { error: showError } = useUiStore();

  const fetchUsers = useCallback(
    async (cursor) => {
      setLoading(true);
      try {
        const params = { limit: 20 };
        if (filters.query) params.query = filters.query;
        if (filters.role) params.role = filters.role;
        if (filters.status) params.status = filters.status;
        if (cursor) params.cursor = cursor;

        const data = await listUsers(params);

        if (cursor) {
          setUsers((prev) => [...prev, ...data.items]);
        } else {
          setUsers(data.items);
        }
        setNextCursor(data.nextCursor || null);
      } catch (err) {
        showError(err.response?.data?.error?.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    },
    [filters, showError],
  );

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleLoadMore = () => {
    if (nextCursor) fetchUsers(nextCursor);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Users</h1>
        <span className="page-count">{users.length} loaded</span>
      </div>
      <UserFilters filters={filters} onChange={setFilters} />
      <UserTable users={users} />
      <Pagination
        hasMore={!!nextCursor}
        loading={loading}
        onLoadMore={handleLoadMore}
      />
    </div>
  );
}
