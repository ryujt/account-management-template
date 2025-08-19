import React from 'react';
import { Link } from 'react-router-dom';
import '@styles/Landing.css';

export default function Landing() {
  return (
    <div className="landing">
      <div className="landing-hero">
        <h1>Account Management Template</h1>
        <p>여러 프로젝트에서 재사용 가능한 사용자 관리 템플릿</p>
        <div className="landing-actions">
          <Link to="/auth/login" className="btn btn-primary">
            로그인
          </Link>
          <Link to="/auth/register" className="btn btn-secondary">
            회원가입
          </Link>
        </div>
      </div>
      
      <div className="landing-features">
        <h2>주요 기능</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>🔐 인증 시스템</h3>
            <p>JWT 기반 액세스 토큰과 리프레시 토큰을 사용한 안전한 인증</p>
          </div>
          <div className="feature-card">
            <h3>👥 사용자 관리</h3>
            <p>프로필 관리, 이메일 인증, 비밀번호 재설정 기능</p>
          </div>
          <div className="feature-card">
            <h3>🛡️ 역할 기반 권한</h3>
            <p>member, admin 역할을 통한 세밀한 권한 관리</p>
          </div>
          <div className="feature-card">
            <h3>📊 관리자 대시보드</h3>
            <p>사용자 목록, 역할 관리, 초대 시스템, 감사 로그</p>
          </div>
        </div>
      </div>
    </div>
  );
}