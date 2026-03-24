import { Link, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-left">
          <Link to="/" className="header-brand">
            Admin Panel
          </Link>
          <nav className="header-nav">
            <Link
              to="/"
              className={`header-nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              Users
            </Link>
          </nav>
        </div>
        <div className="header-right">
          <span className="header-user">{user?.displayName || user?.email}</span>
          <button className="btn btn-sm btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
