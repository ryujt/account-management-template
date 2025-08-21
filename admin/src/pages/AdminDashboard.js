import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import { useLoadingStore } from '../stores/loadingStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Users, UserCheck, UserX, Activity, TrendingUp, Clock } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { setLoading, isLoading } = useLoadingStore();

  // Dashboard 상태
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    disabledUsers: 0,
    totalSessions: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0
  });
  
  const [chartData, setChartData] = useState({
    userGrowth: [],
    userStatus: [],
    roleDistribution: [],
    activityData: []
  });

  const [recentActivities, setRecentActivities] = useState([]);

  // 대시보드 데이터 로드
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // 실제 API에서는 대시보드 전용 엔드포인트가 있어야 함
      const response = await adminApi.getDashboardStats();
      const { stats: dashboardStats, charts, activities } = response;

      setStats(dashboardStats);
      setChartData(charts);
      setRecentActivities(activities || []);

    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
      
      // 데모 데이터 설정 (실제 환경에서는 제거)
      setStats({
        totalUsers: 1247,
        activeUsers: 1189,
        disabledUsers: 58,
        totalSessions: 342,
        newUsersToday: 23,
        newUsersThisWeek: 156
      });

      setChartData({
        userGrowth: [
          { name: '1월', users: 400 },
          { name: '2월', users: 600 },
          { name: '3월', users: 800 },
          { name: '4월', users: 1000 },
          { name: '5월', users: 1200 },
          { name: '6월', users: 1247 }
        ],
        userStatus: [
          { name: '활성', value: 1189, color: '#10B981' },
          { name: '비활성', value: 58, color: '#EF4444' }
        ],
        roleDistribution: [
          { name: '일반 사용자', users: 1200 },
          { name: '관리자', users: 47 }
        ],
        activityData: [
          { name: '월', logins: 240 },
          { name: '화', logins: 139 },
          { name: '수', logins: 320 },
          { name: '목', logins: 280 },
          { name: '금', logins: 390 },
          { name: '토', logins: 200 },
          { name: '일', logins: 180 }
        ]
      });

      setRecentActivities([
        { id: 1, action: '사용자 생성', user: 'admin@example.com', target: 'john.doe@example.com', timestamp: '2024-01-15 10:30:00' },
        { id: 2, action: '역할 변경', user: 'admin@example.com', target: 'jane.smith@example.com', timestamp: '2024-01-15 09:15:00' },
        { id: 3, action: '계정 비활성화', user: 'admin@example.com', target: 'disabled.user@example.com', timestamp: '2024-01-15 08:45:00' },
        { id: 4, action: '비밀번호 재설정', user: 'user@example.com', target: '본인', timestamp: '2024-01-15 08:20:00' }
      ]);
      
    } finally {
      setLoading(false);
    }
  };

  // 통계 카드 컴포넌트
  const StatsCard = ({ title, value, icon: Icon, color, change, onClick }) => (
    <div 
      className={`stats-card ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      <div className="stats-card-header">
        <div className="stats-card-title">{title}</div>
        <Icon className={`stats-card-icon ${color}`} size={24} />
      </div>
      <div className="stats-card-value">{value?.toLocaleString()}</div>
      {change && (
        <div className={`stats-card-change ${change.type}`}>
          <TrendingUp size={16} />
          <span>{change.value}</span>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="loading-container">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>관리자 대시보드</h1>
        <p>시스템 현황을 한눈에 확인하세요</p>
      </div>

      {/* 통계 카드들 */}
      <div className="stats-grid">
        <StatsCard
          title="전체 사용자"
          value={stats.totalUsers}
          icon={Users}
          color="blue"
          change={{ type: 'positive', value: `+${stats.newUsersThisWeek} 이번 주` }}
          onClick={() => navigate('/users')}
        />
        <StatsCard
          title="활성 사용자"
          value={stats.activeUsers}
          icon={UserCheck}
          color="green"
          onClick={() => navigate('/users?status=active')}
        />
        <StatsCard
          title="비활성 사용자"
          value={stats.disabledUsers}
          icon={UserX}
          color="red"
          onClick={() => navigate('/users?status=disabled')}
        />
        <StatsCard
          title="활성 세션"
          value={stats.totalSessions}
          icon={Activity}
          color="purple"
        />
      </div>

      {/* 차트 섹션 */}
      <div className="charts-section">
        <div className="chart-container">
          <div className="chart-header">
            <h3>사용자 증가 추이</h3>
          </div>
          <div className="chart-content">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-container">
          <div className="chart-header">
            <h3>사용자 상태</h3>
          </div>
          <div className="chart-content">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.userStatus}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.userStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-container full-width">
          <div className="chart-header">
            <h3>주간 로그인 활동</h3>
          </div>
          <div className="chart-content">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="logins" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 최근 활동 섹션 */}
      <div className="recent-activity-section">
        <div className="section-header">
          <h3>최근 관리 활동</h3>
          <button 
            className="view-all-button"
            onClick={() => navigate('/audit-logs')}
          >
            전체 보기
          </button>
        </div>
        
        <div className="activity-list">
          {recentActivities.map(activity => (
            <div key={activity.id} className="activity-item">
              <div className="activity-icon">
                <Clock size={16} />
              </div>
              <div className="activity-content">
                <div className="activity-main">
                  <span className="activity-action">{activity.action}</span>
                  <span className="activity-user">by {activity.user}</span>
                </div>
                <div className="activity-details">
                  <span className="activity-target">{activity.target}</span>
                  <span className="activity-time">{activity.timestamp}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;