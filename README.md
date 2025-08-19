# Account Management Template

계정 관리를 위한 템플릿 프로젝트입니다. 사용자 인증, 관리자 대시보드, 그리고 기본적인 사용자 관리 기능을 제공합니다.

## 프로젝트 구조

```
account-management-template/
├── backend/          # Node.js 백엔드 (Docker)
├── service/          # 사용자 서비스 (React, 포트 3001)
├── admin/           # 관리자 대시보드 (React, 포트 3002)
└── docs/            # 문서
```

## 기술 스택

- **Backend**: Node.js, Express, MySQL
- **Frontend**: React 18, Zustand, React Router
- **Database**: MySQL 8.0
- **Infrastructure**: Docker Compose (백엔드만)

## 빠른 시작

### 1. 백엔드 및 데이터베이스 실행

```bash
# Docker로 백엔드와 MySQL 실행
docker-compose up -d

# 백엔드 로그 확인
docker-compose logs -f backend
```

### 2. 서비스 페이지 실행 (포트 3001)

```bash
cd service
npm install
npm start
```

브라우저에서 http://localhost:3001 접속

### 3. 관리자 대시보드 실행 (포트 3002)

```bash
cd admin
npm install
npm start
```

브라우저에서 http://localhost:3002 접속

## 주요 기능

### 서비스 페이지 (포트 3001)
- 회원가입 및 이메일 인증
- 로그인/로그아웃
- 비밀번호 재설정
- 사용자 프로필 관리

### 관리자 대시보드 (포트 3002)
- 사용자 목록 조회 및 검색
- 사용자 상태 관리 (활성/비활성)
- 역할 부여/해제 (admin/member)
- 사용자 상세 정보 조회
- 세션 관리
- 감사 로그 조회

## 접근 권한

- **일반 사용자**: 서비스 페이지만 접근 가능
- **관리자**: 서비스 페이지 + 관리자 대시보드 접근 가능

## API 엔드포인트

백엔드 API는 `http://localhost:3000/api/v1`에서 실행됩니다.

자세한 API 문서는 `docs/PRD.md`를 참조하세요.

## 환경 설정

각 프로젝트의 `.env` 파일을 수정하여 환경을 설정할 수 있습니다:

- `service/.env`: 서비스 페이지 설정
- `admin/.env`: 관리자 대시보드 설정
- `backend/`: Docker Compose 환경 변수 사용

## 개발 가이드

### 코딩 스타일
- 단일 책임 원칙 적용
- CSS는 별도 파일로 분리
- React.js 가이드에 따른 개발 (docs/reactjs-guide.md 참조)

### 테스트
```bash
# 서비스 테스트
cd service && npm test

# 관리자 테스트  
cd admin && npm test

# 빌드 테스트
cd service && npm run build
cd admin && npm run build
```

