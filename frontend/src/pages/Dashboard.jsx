import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h1>Welcome back, {user?.displayName || 'User'}</h1>
        <p>Manage your account settings and security from here.</p>
      </div>

      <div className="dashboard__grid">
        <Link to="/profile" className="dashboard-card">
          <div className="dashboard-card__icon">&#128100;</div>
          <h3>Profile</h3>
          <p>View and update your display name and account details.</p>
        </Link>

        <Link to="/change-password" className="dashboard-card">
          <div className="dashboard-card__icon">&#128272;</div>
          <h3>Change Password</h3>
          <p>Update your password to keep your account secure.</p>
        </Link>

        <Link to="/sessions" className="dashboard-card">
          <div className="dashboard-card__icon">&#128187;</div>
          <h3>Active Sessions</h3>
          <p>View and manage devices currently signed in to your account.</p>
        </Link>

        <Link to="/withdraw" className="dashboard-card">
          <div className="dashboard-card__icon">&#9888;&#65039;</div>
          <h3>Delete Account</h3>
          <p>Permanently delete your account and all associated data.</p>
        </Link>
      </div>

      <div className="dashboard__info">
        <h2>Account Summary</h2>
        <dl className="info-list">
          <div className="info-list__item">
            <dt>Email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div className="info-list__item">
            <dt>Display Name</dt>
            <dd>{user?.displayName || 'Not set'}</dd>
          </div>
          <div className="info-list__item">
            <dt>User ID</dt>
            <dd className="info-list__mono">{user?.userId}</dd>
          </div>
          <div className="info-list__item">
            <dt>Roles</dt>
            <dd>{user?.roles?.join(', ') || 'user'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
