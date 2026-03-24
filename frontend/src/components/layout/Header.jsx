import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="header">
      <div className="header__inner">
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="header__logo">
          Account Manager
        </Link>

        <nav className="header__nav">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="header__link">
                Dashboard
              </Link>
              <Link to="/profile" className="header__link">
                Profile
              </Link>
              <Link to="/sessions" className="header__link">
                Sessions
              </Link>
              <div className="header__dropdown" ref={dropdownRef}>
                <button
                  className="header__avatar"
                  onClick={() => setDropdownOpen((v) => !v)}
                  aria-expanded={dropdownOpen}
                >
                  {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                </button>
                {dropdownOpen && (
                  <div className="header__dropdown-menu">
                    <div className="header__dropdown-info">
                      <span className="header__dropdown-name">{user?.displayName}</span>
                      <span className="header__dropdown-email">{user?.email}</span>
                    </div>
                    <hr />
                    <Link
                      to="/change-password"
                      className="header__dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Change Password
                    </Link>
                    <Link
                      to="/withdraw"
                      className="header__dropdown-item header__dropdown-item--danger"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Delete Account
                    </Link>
                    <hr />
                    <button
                      className="header__dropdown-item header__dropdown-item--button"
                      onClick={handleLogout}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="header__link">
                Sign In
              </Link>
              <Link to="/register" className="btn btn--primary btn--sm">
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
