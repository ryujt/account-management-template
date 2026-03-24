import { useState } from 'react';
import Button from '../common/Button';
import Modal from '../common/Modal';

const ALL_ROLES = ['member', 'admin'];

export default function RoleManager({ roles = [], onAdd, onRemove, loading }) {
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [confirmAdd, setConfirmAdd] = useState(null);

  const availableRoles = ALL_ROLES.filter((r) => !roles.includes(r));

  const handleAdd = async () => {
    if (confirmAdd) {
      await onAdd(confirmAdd);
      setConfirmAdd(null);
    }
  };

  const handleRemove = async () => {
    if (confirmRemove) {
      await onRemove(confirmRemove);
      setConfirmRemove(null);
    }
  };

  return (
    <div className="role-manager">
      <h3 className="section-title">Roles</h3>
      <div className="role-list">
        {roles.map((role) => (
          <div key={role} className="role-item">
            <span className="badge badge-role">{role}</span>
            <button
              className="btn btn-sm btn-danger-ghost"
              onClick={() => setConfirmRemove(role)}
              disabled={loading}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {availableRoles.length > 0 && (
        <div className="role-add">
          {availableRoles.map((role) => (
            <Button
              key={role}
              variant="default"
              size="sm"
              onClick={() => setConfirmAdd(role)}
              loading={loading}
            >
              + Add {role}
            </Button>
          ))}
        </div>
      )}

      <Modal
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        title="Remove Role"
        footer={
          <>
            <Button variant="default" onClick={() => setConfirmRemove(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRemove} loading={loading}>
              Remove
            </Button>
          </>
        }
      >
        <p>
          Are you sure you want to remove the <strong>{confirmRemove}</strong> role?
        </p>
      </Modal>

      <Modal
        open={!!confirmAdd}
        onClose={() => setConfirmAdd(null)}
        title="Add Role"
        footer={
          <>
            <Button variant="default" onClick={() => setConfirmAdd(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAdd} loading={loading}>
              Add
            </Button>
          </>
        }
      >
        <p>
          Are you sure you want to add the <strong>{confirmAdd}</strong> role?
        </p>
      </Modal>
    </div>
  );
}
