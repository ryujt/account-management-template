# PRD - Account Management Template

## 개요

여러 프로젝트에서 공통으로 재사용 가능한 **사용자 관리 샘플 프로젝트**를 만든다.
목표는 최소 기능으로 빠르게 붙여 쓸 수 있는 인증·계정·관리 기능과 UI 템플릿을 제공하는 것이다.

---

## 대상 사용자와 역할

* 일반 사용자: 가입, 로그인, 프로필 수정, 비밀번호 재설정, 이메일 인증
* 관리자: 사용자 검색/열람/편집, 역할 부여/해제, 초대 코드 발급, 감사 로그 열람

역할 기본값: `member`, `admin`
세분화가 필요하면 `manager`를 추가할 수 있다.

---

## 범위

* 포함

  * 이메일·비밀번호 기반 인증
  * JWT 액세스 토큰, 리프레시 토큰 기반 세션
  * 이메일 인증, 비밀번호 재설정
  * 관리자 대시보드: 사용자 목록/상세, 역할 관리, 초대, 감사 로그
* 제외

  * 소셜 로그인, SSO, 다중 조직, 결제, 고급 감사/리포팅

---

## 기능 목록

* 인증

  * 회원가입
  * 로그인
  * 토큰 갱신
  * 로그아웃(서버측 세션 무효화)
  * 이메일 인증
  * 비밀번호 재설정(요청·토큰·변경)
* 사용자

  * 내 프로필 조회/수정
* 관리자

  * 사용자 목록(검색/필터/정렬/페이지네이션)
  * 사용자 상세(속성·역할·상태 변경)
  * 역할 관리(부여/해제)
  * 초대 코드 발급·사용
  * 감사 로그 조회

---

## 사용자 여정 요약

1. 사용자는 이메일·비밀번호로 가입 → 인증 메일 수신 → 링크 클릭으로 인증 완료
2. 로그인 시 액세스·리프레시 토큰 발급 → 만료 시 리프레시로 갱신
3. 비밀번호를 잊으면 재설정 메일 링크로 초기화
4. 관리자는 대시보드에서 사용자 검색/편집/역할/초대/감사 로그를 수행

---

## 화면 목록

* 공개 영역

  * 랜딩, 로그인, 회원가입, 이메일 인증 완료, 비밀번호 재설정 요청, 비밀번호 재설정
* 사용자 영역

  * 내 대시보드(환영/상태), 프로필 편집
* 관리자 영역

  * 사용자 목록 테이블(검색·필터·정렬·페이지네이션)
  * 사용자 상세(프로필, 상태, 역할, 활동 요약)
  * 역할 관리 탭
  * 초대 관리(발급·상태)
  * 감사 로그(필터: 사용자, 액션, 기간)

---

## 데이터베이스 설계(DynamoDB 단일 테이블)

테이블 이름: `ums-main`

### 파티션 키 설계

* PK: 파티션 키, SK: 정렬 키
* 아이템 유형을 접두사로 구분

| Item 타입     | PK 예시                   | SK 예시               | 비고            |
| ----------- | ----------------------- | ------------------- | ------------- |
| User        | USER#<userId>           | PROFILE             | 사용자 기본 정보     |
| EmailIndex  | EMAIL#<lowercasedEmail> | USER#<userId>       | 이메일 → 사용자 역참조 |
| Session     | USER#<userId>           | SESSION#<sessionId> | 리프레시 토큰, TTL  |
| EmailVerify | USER#<userId>           | VERIFY#<tokenId>    | TTL           |
| PwdReset    | USER#<userId>           | PWRST#<tokenId>     | TTL           |
| Role        | ROLE#<roleName>         | META                | 역할 설명         |
| UserRole    | USER#<userId>           | ROLE#<roleName>     | 사용자 역할 부여     |
| Invite      | INVITE#<code>           | META                | 초대 코드, TTL    |
| AuditLog    | AUDIT#<yyyy-mm-dd>      | <timestamp>#<id>    | 검색용 GSI 병행 권장 |

### GSI 제안

* GSI1: `GSI1PK`, `GSI1SK`

  * 이메일 조회: GSI1PK=`EMAIL#<email>`, GSI1SK=`USER#<userId>`
  * 감사 로그 조회: GSI1PK=`AUDIT#<actorUserId>`, GSI1SK=`<timestamp>#<id>`
* GSI2: 토큰 조회: GSI2PK=`TOKEN#<tokenId>`, GSI2SK=`TYPE#<Verify|PwdReset|Session>`
* GSI3: 역할별 사용자: GSI3PK=`ROLE#<roleName>`, GSI3SK=`USER#<userId>`

### 공통 속성

* `createdAt`, `updatedAt` ISO8601
* TTL 대상: 세션, 이메일 인증, 비밀번호 재설정, 초대 `expiresAt`(epoch seconds)

### 예시 아이템

```
{
  "PK": "USER#u_123",
  "SK": "PROFILE",
  "userId": "u_123",
  "email": "ryu@example.com",
  "emailLower": "ryu@example.com",
  "emailVerified": false,
  "passwordHash": "<bcrypt>",  "displayName": "Ryu",
  "status": "active",
  "createdAt": "2025-08-19T09:00:00Z",
  "updatedAt": "2025-08-19T09:00:00Z",
  "GSI1PK": "EMAIL#ryu@example.com",
  "GSI1SK": "USER#u_123"
}
```

```
{
  "PK": "USER#u_123",
  "SK": "SESSION#s_abc",
  "sessionId": "s_abc",
  "refreshTokenHash": "<hash>",
  "ip": "203.0.113.10",
  "ua": "Chrome",
  "createdAt": "2025-08-19T09:10:00Z",
  "expiresAt": 1766200000,
  "GSI2PK": "TOKEN#s_abc",
  "GSI2SK": "TYPE#Session",
  "TTL": 1766200000
}
```

```
{
  "PK": "USER#u_123",
  "SK": "ROLE#admin",
  "role": "admin",
  "assignedBy": "u_admin",
  "createdAt": "2025-08-19T09:20:00Z",
  "GSI3PK": "ROLE#admin",
  "GSI3SK": "USER#u_123"
}
```

```
{
  "PK": "AUDIT#2025-08-19",
  "SK": "2025-08-19T09:21:02.100Z#a1",
  "id": "a1",
  "actorUserId": "u_admin",
  "action": "UserRoleAssigned",
  "resource": "USER#u_123",
  "metadata": {"role": "admin"},
  "createdAt": "2025-08-19T09:21:02.100Z",
  "GSI1PK": "AUDIT#u_admin",
  "GSI1SK": "2025-08-19T09:21:02.100Z#a1"
}
```

---

## API 설계

### 공통

* 베이스 URL: `/api/v1`
* 인증

  * 액세스 토큰: `Authorization: Bearer <jwt>`
  * 리프레시 토큰: HttpOnly 쿠키 `rt` 또는 바디 필드
* 페이지네이션: 커서 기반 `cursor`, `limit`
* 에러 포맷

```
{
  "error": {
    "code": "BadRequest",
    "message": "invalid email",
    "details": {}
  }
}
```

### 인증

* 회원가입

  * `POST /auth/register`
  * 요청

  ```
  {
    "email": "user@example.com",
    "password": "P@ssw0rd!",
    "displayName": "Ryu"
  }
  ```

  * 응답

  ```
  {
    "userId": "u_123",
    "email": "user@example.com",
    "emailVerified": false
  }
  ```
* 로그인

  * `POST /auth/login`
  * 요청

  ```
  {
    "email": "user@example.com",
    "password": "P@ssw0rd!"
  }
  ```

  * 응답

  ```
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
* 토큰 갱신

  * `POST /auth/refresh`
  * 응답

  ```
  {
    "accessToken": "<jwt>",
    "accessTokenExpiresIn": 900
  }
  ```
* 로그아웃

  * `POST /auth/logout`
  * 응답

  ```
  {
    "ok": true
  }
  ```
* 이메일 인증

  * 링크 예시: `/auth/verify-email?token=<token>`
  * `POST /auth/verify-email`
  * 요청

  ```
  {
    "token": "<token>"
  }
  ```

  * 응답

  ```
  {
    "ok": true
  }
  ```
* 비밀번호 재설정 요청

  * `POST /auth/password/forgot`
  * 요청

  ```
  {
    "email": "user@example.com"
  }
  ```

  * 응답

  ```
  {
    "ok": true
  }
  ```
* 비밀번호 재설정

  * `POST /auth/password/reset`
  * 요청

  ```
  {
    "token": "<token>",
    "newPassword": "NewP@ss!"
  }
  ```

  * 응답

  ```
  {
    "ok": true
  }
  ```

### 사용자

* 내 프로필 조회

  * `GET /me` (Auth 필요)
  * 응답

  ```
  {
    "userId": "u_123",
    "email": "user@example.com",
    "emailVerified": true,
    "displayName": "Ryu",
    "roles": ["member"],
    "createdAt": "2025-08-19T09:00:00Z"
  }
  ```
* 내 프로필 수정

  * `PATCH /me`
  * 요청

  ```
  {
    "displayName": "Ryu Park"
  }
  ```

  * 응답

  ```
  {
    "ok": true
  }
  ```

### 관리자

* 사용자 목록

  * `GET /admin/users?query=&role=&status=&cursor=&limit=`
  * 응답

  ```
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
* 사용자 상세

  * `GET /admin/users/:userId`
  * 응답

  ```
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
        "createdAt": "2025-08-19T09:10:00Z",
        "expiresAt": 1766200000,
        "ip": "203.0.113.10",
        "ua": "Chrome"
      }
    ]
  }
  ```
* 사용자 수정

  * `PATCH /admin/users/:userId`
  * 요청

  ```
  {
    "displayName": "New Name",
    "status": "disabled"
  }
  ```

  * 응답

  ```
  {
    "ok": true
  }
  ```
* 역할 부여

  * `POST /admin/users/:userId/roles`
  * 요청

  ```
  {
    "role": "admin"
  }
  ```

  * 응답

  ```
  {
    "ok": true
  }
  ```
* 역할 해제

  * `DELETE /admin/users/:userId/roles/:role`
  * 응답

  ```
  {
    "ok": true
  }
  ```
* 초대 발급

  * `POST /admin/invites`
  * 요청

  ```
  {
    "role": "member",
    "expiresInHours": 72
  }
  ```

  * 응답

  ```
  {
    "code": "INV-ABCD1234",
    "expiresAt": 1766200000
  }
  ```
* 초대 사용

  * `POST /invites/redeem`
  * 요청

  ```
  {
    "code": "INV-ABCD1234",
    "email": "user@example.com",
    "password": "P@ssw0rd!",
    "displayName": "Ryu"
  }
  ```

  * 응답

  ```
  {
    "userId": "u_124",
    "email": "user@example.com"
  }
  ```
* 감사 로그 조회

  * `GET /admin/audit?actor=&action=&from=&to=&cursor=&limit=`
  * 응답

  ```
  {
    "items": [
      {
        "id": "a1",
        "actorUserId": "u_admin",
        "action": "UserRoleAssigned",
        "resource": "USER#u_123",
        "metadata": {"role": "admin"},
        "createdAt": "2025-08-19T09:21:02.100Z"
      }
    ],
    "nextCursor": null
  }
  ```

---

## 권한 정책

* 기본
  * `member`: 본인 정보만 접근
  * `admin`: 관리자 API 접근 가능
* JWT 클레임 예시

```
{
  "sub": "u_123",
  "roles": ["member"],
  "iat": 1692430000,
  "exp": 1692430900
}
```

---

## 이메일·토큰 수명

* 액세스 토큰: 15분
* 리프레시 토큰/세션: 7\~30일(환경변수 설정), DynamoDB TTL로 자동 만료
* 이메일 인증 토큰: 24시간
* 비밀번호 재설정 토큰: 1시간
* 초대 코드: 기본 72시간

---

## 프론트엔드 템플릿(React)

* 공통 레이아웃: 헤더(내비·프로필), 메인, 알림 토스트
* 인증 폼: 이메일·비밀번호 유효성, 제출·로딩 상태, 에러 표시
* 표 컴포넌트: 컬럼 정렬, 필터, 페이지네이션
* 관리자 상세 뷰: 좌측 기본 정보, 우측 탭(역할, 세션, 활동 요약, 감사 로그 링크)
* 서비스 페이지와 관리자 페이지는 별도의 도메인으로 운영하도록 한다.

---

## 백엔드 구성(Node.js)

* 구조
  * 라우팅: `/auth`, `/me`, `/admin`
  * 서비스: 사용자, 세션, 역할, 초대, 감사
  * 어댑터: DynamoDB SDK, 이메일 발송(추상화)
  * 미들웨어: 인증, 권한, 요청 스키마 검증
  * 백엔드는 하나의 서버에서 동작하도록 한다.
* 보안
  * 비밀번호 `bcrypt` 해시
  * 리프레시 토큰 서버 저장(해시) 및 회전
  * 로그인·역할 변경·비번 변경 시 감사 로그 기록

---

## 환경 변수

```
APP_ENV=local
PORT=3000
JWT_SECRET=<secret>
JWT_EXPIRES_IN=900
SESSION_TTL_DAYS=14
DDB_TABLE=ums-main
AWS_REGION=ap-northeast-2
EMAIL_FROM=no-reply@example.com
EMAIL_PROVIDER=<stub|ses|smtp>
FRONTEND_BASE_URL=http://localhost:5173
```

---

## 성공 기준(MVP)

* 이메일 인증을 포함한 가입/로그인이 정상 동작
* 토큰 갱신과 세션 무효화가 정상 동작
* 관리자 화면에서 사용자 검색/상세/역할 변경 가능
* 감사 로그가 주요 액션에 대해 기록·조회 가능

---

## 백로그 제안

* 소셜 로그인(Google)
* 계정 잠금·휴면 처리
* 세션 위치 알림·강제 로그아웃
