import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useLoadingStore } from '../stores/loadingStore';
import { authApi } from '../api/authApi';
import LoadingSpinner from '../components/LoadingSpinner';

const ServiceLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isActionLoading, setActionLoading } = useLoadingStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    setActionLoading('logout', true);
    setShowUserMenu(false);

    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      setActionLoading('logout', false);
      navigate('/login', { replace: true });
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  // 클릭 외부 영역 클릭시 메뉴 닫기
  const handleClickOutside = (e) => {
    if (!e.target.closest('.user-menu-container')) {
      setShowUserMenu(false);
    }
  };

  React.useEffect(() => {
    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

  return (
    <div className="service-layout">
      {/* Header */}
      <header className="service-header">
        <div className="header-content">
          <div className="header-left">
            <Link to="/" className="logo">
              <h1>Account Service</h1>
            </Link>
          </div>

          <nav className="header-nav">
            <Link 
              to="/" 
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
            >
              홈
            </Link>
            <Link 
              to="/profile" 
              className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
            >
              프로필
            </Link>
            {user?.roles?.includes('admin') && (
              <a 
                href="/admin" 
                className="nav-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                관리자
              </a>
            )}
          </nav>

          <div className="header-right">
            <div className="user-menu-container">
              <button 
                className="user-menu-trigger"
                onClick={toggleUserMenu}
                disabled={isActionLoading('logout')}
              >
                <div className="user-avatar">
                  {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="user-name">{user?.displayName}</span>
                <svg 
                  className={`dropdown-icon ${showUserMenu ? 'rotate' : ''}`}
                  width="16" 
                  height="16" 
                  viewBox="0 0 16 16"
                >
                  <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                </svg>
              </button>

              {showUserMenu && (
                <div className="user-menu-dropdown">
                  <div className="user-menu-header">
                    <div className="user-info">
                      <div className="user-name">{user?.displayName}</div>
                      <div className="user-email">{user?.email}</div>
                    </div>
                  </div>
                  
                  <div className="user-menu-divider"></div>
                  
                  <div className="user-menu-items">
                    <Link 
                      to="/profile" 
                      className="user-menu-item"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16">
                        <path d="M8 8C9.65685 8 11 6.65685 11 5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5C5 6.65685 6.34315 8 8 8ZM8 9C5.79086 9 2 10.7909 2 13V14H14V13C14 10.7909 10.2091 9 8 9Z" fill="currentColor"/>
                      </svg>
                      내 프로필
                    </Link>
                    
                    {user?.roles?.includes('admin') && (
                      <a 
                        href="/admin" 
                        className="user-menu-item"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16">
                          <path d="M8 1L2 4V8C2 11.3137 4.22863 14.1575 8 15C11.7714 14.1575 14 11.3137 14 8V4L8 1Z" fill="currentColor"/>
                        </svg>
                        관리자 페이지
                      </a>
                    )}
                  </div>
                  
                  <div className="user-menu-divider"></div>
                  
                  <div className="user-menu-items">
                    <button 
                      className="user-menu-item logout-item"
                      onClick={handleLogout}
                      disabled={isActionLoading('logout')}
                    >
                      {isActionLoading('logout') ? (
                        <LoadingSpinner size="small" />
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 16 16">
                          <path d="M6 2H3C2.44772 2 2 2.44772 2 3V13C2 13.5523 2.44772 14 3 14H6M10 10L14 6M14 6L10 2M14 6H6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                        </svg>
                      )}
                      로그아웃
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="service-main">
        <div className="main-content">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="service-footer">
        <div className="footer-content">
          <div className="footer-left">
            <p>&copy; 2024 Account Management Service. All rights reserved.</p>
          </div>
          <div className="footer-right">
            <a href="/terms" className="footer-link">이용약관</a>
            <a href="/privacy" className="footer-link">개인정보처리방침</a>
            <button 
              className="footer-link" 
              onClick={() => window.location.href = 'mailto:support@example.com'}
            >
              문의하기
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ServiceLayout;