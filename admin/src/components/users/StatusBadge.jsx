const STATUS_CLASSES = {
  active: 'badge-success',
  disabled: 'badge-muted',
  suspended: 'badge-warning',
  withdrawn: 'badge-danger',
};

export default function StatusBadge({ status }) {
  const cls = STATUS_CLASSES[status] || 'badge-muted';

  return <span className={`badge ${cls}`}>{status}</span>;
}
