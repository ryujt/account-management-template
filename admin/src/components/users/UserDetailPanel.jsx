import StatusBadge from './StatusBadge';

function formatDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function UserDetailPanel({ user }) {
  if (!user) return null;

  return (
    <div className="detail-panel">
      <h2 className="detail-title">User Information</h2>
      <dl className="detail-grid">
        <dt>User ID</dt>
        <dd className="monospace">{user.userId}</dd>

        <dt>Email</dt>
        <dd>{user.email}</dd>

        <dt>Display Name</dt>
        <dd>{user.displayName || '-'}</dd>

        <dt>Status</dt>
        <dd>
          <StatusBadge status={user.status} />
        </dd>

        <dt>Roles</dt>
        <dd>
          {(user.roles || []).map((r) => (
            <span key={r} className="badge badge-role">
              {r}
            </span>
          ))}
        </dd>

        <dt>Created</dt>
        <dd>{formatDateTime(user.createdAt)}</dd>
      </dl>
    </div>
  );
}
