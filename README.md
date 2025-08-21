# Account Management Template

여러 프로젝트에서 재사용 가능한 사용자 관리 템플릿 프로젝트입니다.

## 🏗️ 프로젝트 구조

```
account-management-template/
├── backend/          # Node.js API 서버
├── service/          # 사용자 서비스 React 앱
├── admin/            # 관리자 React 앱
├── docs/             # 프로젝트 문서
├── docker-compose.yml # Docker 구성
└── README.md
```

## 🚀 빠른 시작

### Docker를 사용한 전체 시스템 실행

1. **환경 변수 설정**
   ```bash
   # 백엔드 환경변수 설정
   cp backend/.env.example backend/.env
   # 필요한 값들 수정 (JWT 시크릿, 이메일 설정 등)
   
   # 프론트엔드 환경변수 설정
   cp service/.env.example service/.env
   cp admin/.env.example admin/.env
   ```

2. **전체 시스템 실행**
   ```bash
   docker-compose up -d
   ```

3. **서비스 접근**
   - **사용자 서비스**: http://localhost:3000
   - **백엔드 API**: http://localhost:3001
   - **관리자 패널**: http://localhost:3002

### 개별 개발 모드 실행

#### 1. 데이터베이스 실행
```bash
docker-compose up mysql -d
```

#### 2. 백엔드 실행
```bash
cd backend
npm install
npm run dev
```

#### 3. 서비스 프론트엔드 실행
```bash
cd service  
npm install
npm start
```

#### 4. 관리자 프론트엔드 실행
```bash
cd admin
npm install
npm start
```

## 🔐 기본 계정 정보

### 관리자 계정
- **이메일**: admin@example.com
- **임시 비밀번호**: TempAdminPass123!
- **첫 로그인 시 비밀번호 변경 필수**

## 📋 주요 기능

### 인증 시스템
- ✅ 이메일/비밀번호 로그인
- ✅ 구글 OAuth 로그인
- ✅ 회원가입 (이메일 인증)
- ✅ 비밀번호 재설정
- ✅ JWT 기반 토큰 인증
- ✅ 자동 토큰 갱신

### 사용자 관리
- ✅ 프로필 조회/수정
- ✅ 비밀번호 변경
- ✅ 계정 삭제
- ✅ 세션 관리

### 관리자 기능
- ✅ 대시보드 및 통계
- ✅ 사용자 목록 (검색/필터/정렬/페이지네이션)
- ✅ 사용자 상태 관리 (활성화/비활성화)
- ✅ 역할 관리 (부여/해제)
- ✅ 감사 로그 조회

## 🛠️ 기술 스택

### 백엔드
- **Node.js** + **Express.js**
- **MySQL 8.0** 데이터베이스
- **JWT** 인증 시스템
- **Argon2id** 비밀번호 해싱
- **Google OAuth 2.0**

### 프론트엔드
- **React 18** + **React Router 6**
- **Zustand** 상태 관리
- **Axios** HTTP 클라이언트
- **Recharts** 차트 라이브러리

### 인프라
- **Docker** & **Docker Compose**
- **Nginx** (프론트엔드 서빙)
- **MySQL** 컨테이너

## 🔧 개발 설정

### 필수 요구사항
- Node.js 18+
- Docker & Docker Compose
- MySQL 8.0 (로컬 개발시)

### 환경 변수

#### Backend (.env)
```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_NAME=account_management
DB_USER=app_user
DB_PASSWORD=app_password
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
ADMIN_EMAIL=admin@example.com
ADMIN_TEMP_PASSWORD=TempAdminPass123!
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

#### Service (.env)
```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
REACT_APP_VERSION=1.0.0
```

#### Admin (.env)  
```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_ENV=development
REACT_APP_VERSION=1.0.0
```

## 📊 데이터베이스 스키마

### 주요 테이블
- **users**: 사용자 기본 정보
- **roles**: 역할 메타데이터
- **user_roles**: 사용자-역할 매핑
- **sessions**: 리프레시 토큰 기반 세션
- **email_verifications**: 이메일 인증 토큰
- **password_resets**: 비밀번호 재설정 토큰

자세한 스키마는 `docs/PRD.md` 참조.

## 🧪 테스트

```bash
# 백엔드 테스트
cd backend
npm test

# 프론트엔드 테스트
cd service
npm test

cd admin  
npm test
```

## 📝 API 문서

### 인증
- `POST /api/auth/login` - 로그인
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/refresh` - 토큰 갱신
- `POST /api/auth/logout` - 로그아웃

### 사용자
- `GET /api/user/profile` - 프로필 조회
- `PATCH /api/user/profile` - 프로필 수정

### 관리자  
- `GET /api/admin/dashboard/stats` - 대시보드 통계
- `GET /api/admin/users` - 사용자 목록
- `GET /api/admin/users/:id` - 사용자 상세
- `PATCH /api/admin/users/:id` - 사용자 수정

## 🚢 배포

### Production 환경 설정
1. 환경변수에서 `NODE_ENV=production` 설정
2. JWT 시크릿키 변경
3. 데이터베이스 연결 정보 업데이트
4. HTTPS 설정 (권장)

### Docker를 사용한 배포
```bash
# Production 빌드
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 로그 확인
docker-compose logs -f
```

## 🔒 보안

### 구현된 보안 기능
- Argon2id 비밀번호 해싱
- JWT 토큰 기반 인증
- httpOnly 쿠키 사용
- CORS 설정
- 보안 헤더 (Helmet.js)
- SQL Injection 방지
- XSS 방지

### 보안 권장사항
- 정기적인 의존성 업데이트
- 강한 JWT 시크릿 사용
- HTTPS 사용 (Production)
- 정기적인 보안 감사

## 📄 라이선스

MIT License - 자세한 내용은 LICENSE 파일 참조

## 🤝 기여하기

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 지원

문제가 발생하거나 기능 요청이 있으시면 GitHub Issues를 통해 알려주세요.