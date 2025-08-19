import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';
import '@styles/Header.css';

export default function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, isAdmin } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-left">
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="logo">
            Account Management
          </Link>
          
          {isAuthenticated && (
            <nav className="main-nav">
              <Link to="/dashboard" className="nav-link">
                대시보드
              </Link>
              <Link to="/profile" className="nav-link">
                프로필
              </Link>
              {isAdmin() && (
                <Link to="/admin" className="nav-link admin-link">
                  관리자
                </Link>
              )}
            </nav>
          )}
        </div>

        <div className="header-right">
          {isAuthenticated ? (
            <div className="user-menu" ref={userMenuRef}>
              <button
                className="user-menu-trigger"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <span className="user-name">{user?.displayName}</span>
                <span className="user-avatar">👤</span>
              </button>
              
              {showUserMenu && (
                <div className="user-menu-dropdown">
                  <div className="user-menu-header">
                    <div className="user-info">
                      <div className="user-display-name">{user?.displayName}</div>
                      <div className="user-email">{user?.email}</div>
                    </div>
                  </div>
                  
                  <div className="user-menu-items">
                    <Link
                      to="/dashboard"
                      className="user-menu-item"
                      onClick={() => setShowUserMenu(false)}
                    >
                      대시보드
                    </Link>
                    <Link
                      to="/profile"
                      className="user-menu-item"
                      onClick={() => setShowUserMenu(false)}
                    >
                      프로필 관리
                    </Link>
                    <Link
                      to="/profile/sessions"
                      className="user-menu-item"
                      onClick={() => setShowUserMenu(false)}
                    >
                      세션 관리
                    </Link>
                    
                    {isAdmin() && (
                      <>
                        <hr className="user-menu-divider" />
                        <Link
                          to="/admin"
                          className="user-menu-item admin-item"
                          onClick={() => setShowUserMenu(false)}
                        >
                          관리자 대시보드
                        </Link>
                        <Link
                          to="/admin/users"
                          className="user-menu-item admin-item"
                          onClick={() => setShowUserMenu(false)}
                        >
                          사용자 관리
                        </Link>
                      </>
                    )}
                    
                    <hr className="user-menu-divider" />
                    <button
                      className="user-menu-item logout-item"
                      onClick={() => {
                        setShowUserMenu(false);
                        handleLogout();
                      }}
                    >
                      로그아웃
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-links">
              <Link to="/auth/login" className="auth-link">
                로그인
              </Link>
              <Link to="/auth/register" className="auth-link register-link">
                회원가입
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}