# Account Management Template

MySQL 기반의 계정 관리 시스템입니다. JWT 인증, 역할 기반 접근 제어, 이메일 인증, 초대 시스템, 감사 로그 기능을 제공합니다.

## 기술 스택

### 백엔드
- **Node.js** + **Express.js** - REST API 서버
- **MySQL** - 관계형 데이터베이스
- **Sequelize** - ORM
- **JWT** - 인증 토큰
- **bcryptjs** - 패스워드 해싱
- **Docker** - 컨테이너화

### 프론트엔드
- **React** - UI 라이브러리
- **Zustand** - 상태 관리
- **React Router** - 라우팅
- **Axios** - HTTP 클라이언트

## 프로젝트 구조

```
account-management-template/
├── backend/                    # 백엔드 API 서버
│   ├── src/
│   │   ├── adapters/          # 데이터베이스, 이메일 어댑터
│   │   ├── config/            # 설정 파일
│   │   ├── middleware/        # Express 미들웨어
│   │   ├── models/            # Sequelize 모델
│   │   ├── routes/            # API 라우터
│   │   ├── services/          # 비즈니스 로직
│   │   ├── utils/             # 유틸리티 함수
│   │   └── server.js          # 서버 진입점
│   ├── database/              # 데이터베이스 초기화 스크립트
│   ├── Dockerfile             # Docker 설정
│   └── package.json           # Node.js 의존성
├── frontend/                   # React 프론트엔드
│   ├── src/
│   │   ├── api/               # API 클라이언트
│   │   ├── components/        # React 컴포넌트
│   │   ├── pages/             # 페이지 컴포넌트
│   │   ├── stores/            # Zustand 스토어
│   │   └── styles/            # CSS 스타일
│   └── package.json
├── docker-compose.yml         # Docker Compose 설정
└── README.md                  # 프로젝트 문서
```

## 빠른 시작

### 1. 전체 시스템 실행 (Docker 사용)

```bash
# 프로젝트 클론 후
cd account-management-template

# Docker Compose로 전체 시스템 실행
docker-compose up --build

# 백그라운드 실행
docker-compose up --build -d
```

### 2. 개별 실행

#### 백엔드 실행

```bash
cd backend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일 편집

# MySQL 데이터베이스 준비 (별도 설치 필요)
# 또는 Docker로 MySQL만 실행:
docker run --name mysql-dev -e MYSQL_ROOT_PASSWORD=rootpassword -e MYSQL_DATABASE=account_management -p 3306:3306 -d mysql:8.0

# 서버 실행
npm start

# 개발 모드 (nodemon)
npm run dev
```

#### 프론트엔드 실행

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm start

# 빌드
npm run build
```

## API 엔드포인트

### 인증 (Auth)
- `POST /api/v1/auth/register` - 사용자 등록
- `POST /api/v1/auth/login` - 로그인
- `POST /api/v1/auth/logout` - 로그아웃
- `POST /api/v1/auth/refresh` - 토큰 갱신
- `POST /api/v1/auth/verify-email` - 이메일 인증
- `POST /api/v1/auth/forgot-password` - 비밀번호 재설정 요청
- `POST /api/v1/auth/reset-password` - 비밀번호 재설정
- `GET /api/v1/auth/invite/:code` - 초대 코드 확인

### 사용자 (User)
- `GET /api/v1/user/profile` - 프로필 조회
- `PUT /api/v1/user/profile` - 프로필 수정
- `POST /api/v1/user/change-password` - 비밀번호 변경
- `GET /api/v1/user/sessions` - 세션 목록 조회
- `DELETE /api/v1/user/sessions/:id` - 세션 해제
- `GET /api/v1/user/stats` - 사용자 통계

### 관리자 (Admin)
- `GET /api/v1/admin/dashboard` - 대시보드 통계
- `GET /api/v1/admin/users` - 사용자 목록
- `GET /api/v1/admin/users/:id` - 사용자 상세 정보
- `PUT /api/v1/admin/users/:id` - 사용자 정보 수정
- `DELETE /api/v1/admin/users/:id` - 사용자 삭제
- `POST /api/v1/admin/invites` - 초대 생성
- `GET /api/v1/admin/invites` - 초대 목록
- `DELETE /api/v1/admin/invites/:id` - 초대 취소
- `GET /api/v1/admin/audit-logs` - 감사 로그

## 데이터베이스 스키마

### 주요 테이블
- `users` - 사용자 정보
- `sessions` - 사용자 세션
- `invites` - 초대 코드
- `audit_logs` - 감사 로그

### 기본 사용자 계정
- **관리자**: `admin@example.com` / `admin123`
- **일반 사용자**: `user@example.com` / `admin123`

## 기능

### 인증 및 권한
- JWT 기반 인증
- 액세스 토큰 + 리프레시 토큰
- 역할 기반 접근 제어 (RBAC)
- 이메일 인증
- 비밀번호 재설정

### 사용자 관리
- 사용자 등록/로그인
- 프로필 관리
- 세션 관리
- 계정 삭제

### 관리자 기능
- 사용자 관리 (CRUD)
- 초대 시스템
- 감사 로그
- 대시보드 통계

### 보안 기능
- 비밀번호 해싱 (bcrypt)
- Rate limiting
- CORS 설정
- 헬멧 보안 헤더
- SQL 인젝션 방지 (Sequelize)

## 환경 변수

### 백엔드 (.env)
```bash
APP_ENV=development
PORT=3000
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=900
SESSION_TTL_DAYS=14

DB_HOST=localhost
DB_PORT=3306
DB_NAME=account_management
DB_USER=root
DB_PASSWORD=password

EMAIL_FROM=no-reply@example.com
EMAIL_PROVIDER=stub
FRONTEND_BASE_URL=http://localhost:5173
```

### 프론트엔드 (.env)
```bash
REACT_APP_API_BASE_URL=http://localhost:3000/api/v1
REACT_APP_APP_NAME=Account Management
```

## 개발 가이드

### 코딩 스타일
- **가독성 우선**: 명확하고 이해하기 쉬운 코드
- **단일 책임 원칙**: 각 파일과 함수는 하나의 책임만
- **CSS 분리**: 각 컴포넌트마다 별도의 CSS 파일

### 테스트
```bash
# 백엔드 테스트
cd backend
npm test

# 프론트엔드 테스트
cd frontend
npm test
```

### 빌드
```bash
# 백엔드 (이미 빌드된 상태로 실행)
cd backend
npm start

# 프론트엔드 빌드
cd frontend
npm run build
```

## 배포

### Docker를 사용한 배포
```bash
# 프로덕션 빌드 및 실행
docker-compose -f docker-compose.yml up --build -d

# 로그 확인
docker-compose logs -f

# 정리
docker-compose down
```

### 수동 배포
1. 데이터베이스 설정 (MySQL 8.0+)
2. 환경 변수 설정
3. 백엔드 빌드 및 실행
4. 프론트엔드 빌드 및 정적 파일 서빙

## 문제 해결

### 자주 발생하는 문제

1. **MySQL 연결 실패**
   - MySQL 서버 실행 확인
   - 데이터베이스 및 사용자 권한 확인

2. **JWT 토큰 오류**
   - JWT_SECRET 환경 변수 설정 확인
   - 토큰 만료 시간 확인

3. **CORS 오류**
   - 백엔드 CORS 설정 확인
   - 프론트엔드 API URL 확인

### 로그 확인
```bash
# Docker 로그
docker-compose logs backend
docker-compose logs mysql

# 개별 컨테이너 로그
docker logs account-management-backend
docker logs account-management-mysql
```

## 라이선스

MIT License

## 기여

1. Fork the project
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
