import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/authApi';
import { 
  LayoutDashboard, 
  Users, 
  Shield, 
  FileText, 
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  User
} from 'lucide-react';

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  
  // 사이드바 상태
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // 네비게이션 메뉴 정의
  const navigationItems = [
    {
      name: '대시보드',
      href: '/dashboard',
      icon: LayoutDashboard,
      description: '시스템 현황 및 통계'
    },
    {
      name: '사용자 관리',
      href: '/users',
      icon: Users,
      description: '사용자 목록 및 관리'
    },
    {
      name: '역할 관리',
      href: '/roles',
      icon: Shield,
      description: '권한 및 역할 설정'
    },
    {
      name: '감사 로그',
      href: '/audit-logs',
      icon: FileText,
      description: '시스템 활동 기록'
    },
    {
      name: '설정',
      href: '/settings',
      icon: Settings,
      description: '시스템 설정'
    }
  ];

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('로그아웃 실패:', error);
    } finally {
      logout();
      navigate('/login');
    }
  };

  // 현재 활성 메뉴 확인
  const isActiveRoute = (href) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  // 현재 페이지 제목 가져오기
  const getCurrentPageTitle = () => {
    const currentItem = navigationItems.find(item => isActiveRoute(item.href));
    return currentItem ? currentItem.name : '관리자 대시보드';
  };

  return (
    <div className="admin-layout">
      {/* 사이드바 */}
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">
              <Shield size={24} />
            </div>
            {sidebarOpen && (
              <div className="logo-text">
                <h2>Admin</h2>
                <span>Dashboard</span>
              </div>
            )}
          </div>
          
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.href);
              
              return (
                <li key={item.name} className="nav-item">
                  <Link
                    to={item.href}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    title={!sidebarOpen ? item.name : ''}
                  >
                    <Icon size={20} className="nav-icon" />
                    {sidebarOpen && (
                      <div className="nav-content">
                        <span className="nav-name">{item.name}</span>
                        <span className="nav-description">{item.description}</span>
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 사이드바 푸터 */}
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              <User size={16} />
            </div>
            {sidebarOpen && (
              <div className="user-details">
                <span className="user-name">{user?.display_name}</span>
                <span className="user-role">관리자</span>
              </div>
            )}
          </div>
          
          {sidebarOpen && (
            <button
              className="logout-button"
              onClick={handleLogout}
              title="로그아웃"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 메인 컨텐츠 영역 */}
      <div className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {/* 헤더 */}
        <header className="main-header">
          <div className="header-left">
            <button
              className="mobile-menu-button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={20} />
            </button>
            <h1 className="page-title">{getCurrentPageTitle()}</h1>
          </div>

          <div className="header-right">
            {/* 알림 (향후 구현) */}
            {/* <button className="notification-button">
              <Bell size={20} />
            </button> */}

            {/* 사용자 메뉴 */}
            <div className="user-menu-container">
              <button
                className="user-menu-button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="user-info-header">
                  <div className="user-avatar-header">
                    {user?.display_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-details-header">
                    <span className="user-name-header">{user?.display_name}</span>
                    <span className="user-email-header">{user?.email}</span>
                  </div>
                </div>
                <ChevronDown size={16} className={`chevron ${userMenuOpen ? 'open' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="user-menu-dropdown">
                  <Link 
                    to="/profile" 
                    className="menu-item"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User size={16} />
                    내 프로필
                  </Link>
                  <Link 
                    to="/settings" 
                    className="menu-item"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings size={16} />
                    설정
                  </Link>
                  <div className="menu-separator" />
                  <button 
                    className="menu-item logout"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 페이지 컨텐츠 */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>

      {/* 모바일용 사이드바 오버레이 */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;