# PRD - Account Management Template

## 개요

여러 프로젝트에서 공통으로 재사용 가능한 **사용자 관리 템플릿 프로젝트**.
새 서비스를 시작할 때 이 저장소를 복제하면 인증·계정·관리 기능을 즉시 사용할 수 있도록 한다.

### 목표

* 회원가입/탈퇴, 로그인/로그아웃 등 모든 서비스에서 반복되는 사용자 관리 코드를 한 번만 작성
* 새 프로젝트에서 이 저장소를 템플릿으로 복제해 바로 사용
* 최소한의 설정 변경(환경 변수, 도메인)만으로 운영 가능

### 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React.js (Vite) |
| 백엔드 | AWS Lambda (Node.js 24.x), 단일 함수 |
| 데이터베이스 | Amazon DynamoDB (단일 테이블 설계) |
| 인증 | JWT (액세스 토큰 + 리프레시 토큰) |
| 이메일 | Amazon SES (추상화, 로컬은 스텁) |
| 인프라 | API Gateway → Lambda → DynamoDB |

---

## 대상 사용자와 역할

* **일반 사용자**: 가입, 로그인, 프로필 수정, 비밀번호 변경/재설정, 이메일 인증, 회원 탈퇴
* **관리자**: 사용자 목록 조회, 사용자 상태 변경, 역할 관리

역할 기본값: `member`, `admin`

---

## 범위

### 포함

* 이메일·비밀번호 기반 인증 (회원가입, 로그인, 로그아웃)
* 회원 탈퇴 (소프트 삭제)
* JWT 액세스 토큰 + 리프레시 토큰 기반 세션
* 이메일 인증
* 비밀번호 변경 및 재설정
* 프로필 조회/수정
* 활성 세션 관리 (조회, 개별 종료)
* 관리자: 사용자 목록/상세, 상태 변경, 역할 관리

### 제외

* 소셜 로그인, SSO
* 다중 조직/테넌트
* 결제, 구독
* 고급 감사/리포팅
* 초대 코드 시스템

---

## 기능 목록

### 인증

| 기능 | 설명 |
|------|------|
| 회원가입 | 이메일·비밀번호·표시이름으로 가입, 인증 메일 발송 |
| 로그인 | 이메일·비밀번호로 인증, 액세스·리프레시 토큰 발급 |
| 로그아웃 | 현재 세션의 리프레시 토큰 무효화 |
| 토큰 갱신 | 리프레시 토큰으로 새 액세스 토큰 발급 |
| 이메일 인증 | 가입 시 발송된 링크 클릭으로 이메일 검증 |
| 비밀번호 재설정 | 이메일로 재설정 링크 발송 → 새 비밀번호 설정 |
| 회원 탈퇴 | 계정 비활성화(소프트 삭제), 세션 전체 무효화 |

### 사용자

| 기능 | 설명 |
|------|------|
| 프로필 조회 | 내 정보(이메일, 표시이름, 역할 등) 조회 |
| 프로필 수정 | 표시이름 등 수정 |
| 비밀번호 변경 | 현재 비밀번호 확인 후 새 비밀번호로 변경 |
| 세션 목록 | 내 활성 세션 목록 조회 (기기, IP, 마지막 접속) |
| 세션 종료 | 특정 세션 강제 종료 |

### 관리자

| 기능 | 설명 |
|------|------|
| 사용자 목록 | 검색, 필터(역할/상태), 페이지네이션 |
| 사용자 상세 | 프로필, 상태, 역할, 세션 정보 |
| 사용자 상태 변경 | 활성/비활성/정지 전환 |
| 역할 부여/해제 | admin, member 역할 관리 |

---

## 사용자 여정

1. **가입**: 이메일·비밀번호 입력 → 인증 메일 수신 → 링크 클릭으로 인증 완료
2. **로그인**: 이메일·비밀번호 → 액세스·리프레시 토큰 발급 → 만료 시 리프레시로 갱신
3. **비밀번호 분실**: 재설정 요청 → 이메일 링크 → 새 비밀번호 설정
4. **비밀번호 변경**: 로그인 상태에서 현재 비밀번호 확인 후 변경
5. **회원 탈퇴**: 비밀번호 확인 → 계정 비활성화 → 전체 세션 무효화
6. **관리자**: 사용자 목록 조회 → 상세 확인 → 상태/역할 변경

---

## 화면 목록

### 공개 영역

* 랜딩 페이지
* 로그인
* 회원가입
* 이메일 인증 완료
* 비밀번호 재설정 요청
* 비밀번호 재설정 (토큰 링크)
* 비밀번호 재설정 완료

### 사용자 영역

* 대시보드 (환영 메시지, 계정 상태 요약)
* 프로필 편집
* 비밀번호 변경
* 세션 관리
* 회원 탈퇴

### 관리자 영역

* 사용자 목록 (검색·필터·정렬·페이지네이션)
* 사용자 상세 (프로필, 상태, 역할, 세션 목록)

---

## 백엔드 구성 (AWS Lambda, Node.js 24.x)

### 아키텍처

단일 Lambda 함수가 API Gateway로부터 모든 요청을 수신하고, 요청 경로에 따라 내부적으로 라우팅한다.

```
API Gateway (HTTP API)
  └─ ANY /{proxy+} → Lambda 함수 (단일)
       ├─ /auth/*    → authHandler
       ├─ /user/*    → userHandler
       └─ /admin/*   → adminHandler
```

### 내부 구조

```
lambda/
├── index.mjs              # Lambda 핸들러 엔트리포인트, 라우터
├── routes/
│   ├── auth.mjs           # 인증 라우트
│   ├── user.mjs           # 사용자 라우트
│   └── admin.mjs          # 관리자 라우트
├── services/
│   ├── authService.mjs    # 인증 비즈니스 로직
│   ├── userService.mjs    # 사용자 비즈니스 로직
│   └── adminService.mjs   # 관리자 비즈니스 로직
├── adapters/
│   ├── dynamodb.mjs       # DynamoDB 클라이언트 및 쿼리
│   └── email.mjs          # 이메일 발송 (SES/스텁)
├── middleware/
│   ├── auth.mjs           # JWT 검증, 역할 확인
│   └── validation.mjs     # 요청 스키마 검증
├── utils/
│   ├── errors.mjs         # 에러 클래스 정의
│   └── helpers.mjs        # 공통 유틸리티
└── package.json
```

### 보안

* 비밀번호: `bcrypt` 해시
* 리프레시 토큰: 서버 측 해시 저장, 사용 시 회전(rotation)
* 주요 액션(로그인, 비밀번호 변경, 역할 변경) 시 감사 로그 기록

---

## API 설계

### 공통

* 인증: `Authorization: Bearer <jwt>` (액세스 토큰)
* 리프레시 토큰: HttpOnly 쿠키 `rt`
* 페이지네이션: 커서 기반 `cursor`, `limit`
* 에러 포맷:

```json
{
  "error": {
    "code": "BadRequest",
    "message": "invalid email",
    "details": {}
  }
}
```

### 인증 API (`/auth`)

#### `POST /auth/register` — 회원가입

요청:
```json
{
  "email": "user@example.com",
  "password": "P@ssw0rd!",
  "displayName": "Ryu"
}
```

응답 `201`:
```json
{
  "userId": "u_123",
  "email": "user@example.com",
  "emailVerified": false
}
```

#### `POST /auth/login` — 로그인

요청:
```json
{
  "email": "user@example.com",
  "password": "P@ssw0rd!"
}
```

응답 `200`:
```json
{
  "accessToken": "<jwt>",
  "accessTokenExpiresIn": 900,
  "user": {
    "userId": "u_123",
    "email": "user@example.com",
    "displayName": "Ryu",
    "roles": ["member"]
  }
}
```

리프레시 토큰은 `Set-Cookie: rt=<token>; HttpOnly; Secure; SameSite=Strict` 로 전달.

#### `POST /auth/refresh` — 토큰 갱신

쿠키의 리프레시 토큰 사용. 응답 `200`:
```json
{
  "accessToken": "<jwt>",
  "accessTokenExpiresIn": 900
}
```

#### `POST /auth/logout` — 로그아웃

현재 세션의 리프레시 토큰 무효화. 응답 `200`:
```json
{
  "ok": true
}
```

#### `POST /auth/verify-email` — 이메일 인증

요청:
```json
{
  "token": "<token>"
}
```

응답 `200`:
```json
{
  "ok": true
}
```

#### `POST /auth/password/forgot` — 비밀번호 재설정 요청

요청:
```json
{
  "email": "user@example.com"
}
```

응답 `200`:
```json
{
  "ok": true
}
```

#### `POST /auth/password/reset` — 비밀번호 재설정

요청:
```json
{
  "token": "<token>",
  "newPassword": "NewP@ss!"
}
```

응답 `200`:
```json
{
  "ok": true
}
```

### 사용자 API (`/user`) — 인증 필요

#### `GET /user/info` — 내 프로필 조회

응답 `200`:
```json
{
  "userId": "u_123",
  "email": "user@example.com",
  "emailVerified": true,
  "displayName": "Ryu",
  "roles": ["member"],
  "createdAt": "2025-08-19T09:00:00Z"
}
```

#### `PATCH /user/info` — 내 프로필 수정

요청:
```json
{
  "displayName": "Ryu Park"
}
```

응답 `200`:
```json
{
  "ok": true
}
```

#### `POST /user/changepw` — 비밀번호 변경

요청:
```json
{
  "currentPassword": "P@ssw0rd!",
  "newPassword": "NewP@ss!"
}
```

응답 `200`:
```json
{
  "ok": true
}
```

#### `GET /user/sessions` — 내 세션 목록

응답 `200`:
```json
{
  "sessions": [
    {
      "sessionId": "s_abc",
      "ip": "203.0.113.10",
      "ua": "Chrome 120, macOS",
      "createdAt": "2025-08-19T09:10:00Z",
      "current": true
    }
  ]
}
```

#### `DELETE /user/sessions/:sessionId` — 세션 종료

응답 `200`:
```json
{
  "ok": true
}
```

#### `POST /user/withdraw` — 회원 탈퇴

요청:
```json
{
  "password": "P@ssw0rd!"
}
```

응답 `200`:
```json
{
  "ok": true
}
```

### 관리자 API (`/admin`) — 인증 + admin 역할 필요

#### `GET /admin/users` — 사용자 목록

쿼리 파라미터: `query`, `role`, `status`, `cursor`, `limit`

응답 `200`:
```json
{
  "items": [
    {
      "userId": "u_123",
      "email": "user@example.com",
      "displayName": "Ryu",
      "roles": ["member"],
      "status": "active",
      "createdAt": "2025-08-19T09:00:00Z"
    }
  ],
  "nextCursor": "eyJzayI6ICJQUk9GSUxFIiB9"
}
```

#### `GET /admin/users/:userId` — 사용자 상세

응답 `200`:
```json
{
  "user": {
    "userId": "u_123",
    "email": "user@example.com",
    "displayName": "Ryu",
    "roles": ["member"],
    "status": "active",
    "emailVerified": true,
    "createdAt": "2025-08-19T09:00:00Z"
  },
  "sessions": [
    {
      "sessionId": "s_abc",
      "ip": "203.0.113.10",
      "ua": "Chrome 120, macOS",
      "createdAt": "2025-08-19T09:10:00Z"
    }
  ]
}
```

#### `PATCH /admin/users/:userId` — 사용자 상태 변경

요청:
```json
{
  "status": "disabled"
}
```

응답 `200`:
```json
{
  "ok": true
}
```

#### `POST /admin/users/:userId/roles` — 역할 부여

요청:
```json
{
  "role": "admin"
}
```

응답 `200`:
```json
{
  "ok": true
}
```

#### `DELETE /admin/users/:userId/roles/:role` — 역할 해제

응답 `200`:
```json
{
  "ok": true
}
```

---

## 데이터베이스 설계 (DynamoDB 단일 테이블)

테이블 이름: `ums-main`

### 파티션 키 설계

| Item 타입 | PK | SK | 비고 |
|-----------|----|----|------|
| User | `USER#<userId>` | `PROFILE` | 사용자 기본 정보 |
| EmailIndex | `EMAIL#<email>` | `USER#<userId>` | 이메일 → 사용자 역참조 |
| Session | `USER#<userId>` | `SESSION#<sessionId>` | 리프레시 토큰, TTL |
| EmailVerify | `USER#<userId>` | `VERIFY#<tokenId>` | TTL |
| PwdReset | `USER#<userId>` | `PWRST#<tokenId>` | TTL |
| UserRole | `USER#<userId>` | `ROLE#<roleName>` | 사용자 역할 |
| AuditLog | `AUDIT#<yyyy-mm-dd>` | `<timestamp>#<id>` | 감사 로그 |

### GSI

| GSI | PK | SK | 용도 |
|-----|----|----|------|
| GSI1 | `EMAIL#<email>` | `USER#<userId>` | 이메일로 사용자 조회 |
| GSI2 | `TOKEN#<tokenId>` | `TYPE#<Verify\|PwdReset\|Session>` | 토큰으로 아이템 조회 |
| GSI3 | `ROLE#<roleName>` | `USER#<userId>` | 역할별 사용자 조회 |

### 공통 속성

* `createdAt`, `updatedAt`: ISO 8601
* TTL 대상: 세션, 이메일 인증, 비밀번호 재설정 → `expiresAt` (epoch seconds)

### 예시 아이템

**User**
```json
{
  "PK": "USER#u_123",
  "SK": "PROFILE",
  "userId": "u_123",
  "email": "ryu@example.com",
  "emailVerified": false,
  "passwordHash": "<bcrypt>",
  "displayName": "Ryu",
  "status": "active",
  "createdAt": "2025-08-19T09:00:00Z",
  "updatedAt": "2025-08-19T09:00:00Z",
  "GSI1PK": "EMAIL#ryu@example.com",
  "GSI1SK": "USER#u_123"
}
```

**Session**
```json
{
  "PK": "USER#u_123",
  "SK": "SESSION#s_abc",
  "sessionId": "s_abc",
  "refreshTokenHash": "<hash>",
  "ip": "203.0.113.10",
  "ua": "Chrome 120, macOS",
  "createdAt": "2025-08-19T09:10:00Z",
  "expiresAt": 1766200000,
  "GSI2PK": "TOKEN#s_abc",
  "GSI2SK": "TYPE#Session",
  "TTL": 1766200000
}
```

---

## 권한 정책

| 역할 | 접근 범위 |
|------|----------|
| `member` | `/user/*` (본인 정보만) |
| `admin` | `/user/*` + `/admin/*` |

JWT 클레임:
```json
{
  "sub": "u_123",
  "roles": ["member"],
  "iat": 1692430000,
  "exp": 1692430900
}
```

---

## 토큰·세션 수명

| 항목 | 수명 | 비고 |
|------|------|------|
| 액세스 토큰 | 15분 | JWT |
| 리프레시 토큰/세션 | 14일 (환경변수 설정) | DynamoDB TTL 자동 만료 |
| 이메일 인증 토큰 | 24시간 | DynamoDB TTL |
| 비밀번호 재설정 토큰 | 1시간 | DynamoDB TTL |

---

## 프론트엔드 (React.js)

### 공통

* Vite 기반 빌드
* 공통 레이아웃: 헤더(내비·프로필 드롭다운), 메인, 알림 토스트
* 상태 관리: Zustand
* HTTP 클라이언트: Axios (인터셉터로 토큰 자동 갱신)

### 주요 컴포넌트

* 인증 폼: 이메일·비밀번호 유효성 검사, 제출·로딩 상태, 에러 표시
* 보호된 라우트: 미인증 시 로그인 페이지로 리다이렉트
* 관리자 라우트: admin 역할 없으면 접근 차단
* 테이블 컴포넌트: 정렬, 필터, 커서 기반 페이지네이션

### 도메인 분리

서비스 페이지와 관리자 페이지는 별도의 도메인으로 운영한다.
* 서비스: `app.example.com`
* 관리자: `admin.example.com`

---

## 환경 변수

```
APP_ENV=local
JWT_SECRET=<secret>
JWT_EXPIRES_IN=900
SESSION_TTL_DAYS=14
DDB_TABLE=ums-main
AWS_REGION=ap-northeast-2
EMAIL_FROM=no-reply@example.com
EMAIL_PROVIDER=stub
FRONTEND_URL=http://localhost:5173
ADMIN_FRONTEND_URL=http://localhost:5174
```

---

## 성공 기준 (MVP)

* 이메일 인증을 포함한 가입/로그인/로그아웃이 정상 동작
* 비밀번호 변경 및 재설정이 정상 동작
* 회원 탈퇴 시 계정 비활성화 및 세션 전체 무효화
* 토큰 갱신과 세션 관리(조회/종료)가 정상 동작
* 관리자 화면에서 사용자 목록/상세/상태 변경/역할 관리 가능
* Lambda 단일 함수에서 모든 API가 경로 기반으로 정상 라우팅

---

## 백로그

* 소셜 로그인 (Google, GitHub)
* 계정 잠금·휴면 처리
* 2단계 인증 (TOTP)
* 로그인 이력/알림
* 초대 코드 시스템
