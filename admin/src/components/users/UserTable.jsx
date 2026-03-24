import { useNavigate } from 'react-router-dom';
import Table from '../common/Table';
import StatusBadge from './StatusBadge';

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const columns = [
  { key: 'email', label: 'Email' },
  { key: 'displayName', label: 'Display Name' },
  {
    key: 'roles',
    label: 'Roles',
    render: (roles) =>
      (roles || []).map((r) => (
        <span key={r} className="badge badge-role">
          {r}
        </span>
      )),
  },
  {
    key: 'status',
    label: 'Status',
    render: (status) => <StatusBadge status={status} />,
  },
  {
    key: 'createdAt',
    label: 'Created',
    render: (val) => formatDate(val),
  },
];

export default function UserTable({ users }) {
  const navigate = useNavigate();

  const handleRowClick = (user) => {
    navigate(`/users/${user.userId}`);
  };

  return <Table columns={columns} data={users} onRowClick={handleRowClick} />;
}
