# PRD - Account Management Template

## 개요

* 여러 프로젝트에서 공통으로 재사용 가능한 **사용자 관리 샘플 프로젝트**.
* 구성
  * 백엔드: Node.js (서비스/관리 사이트 공용 API)
  * 프론트엔드: React.js (서비스 사이트, 관리 사이트)
  * 초기 관리자 부트스트랩: **환경변수로 관리자 이메일·임시비밀번호 주입**, 첫 로그인 시 **비밀번호 강제 변경**

## 기능 목록

* 인증
  * 회원가입: 이메일, 이름, 암호/암호확인
  * 로그인: 자체 로그인, **구글 OAuth**
    * 아이디 저장 선택 가능하도록
  * 토큰 갱신
  * 로그아웃(서버 세션 무효화)
  * 이메일 인증
  * 비밀번호 재설정(요청·토큰·변경)
* 사용자
  * 내 프로필 조회/수정
* 관리자
  * 사용자 목록(검색/필터/정렬/페이지네이션)
  * 사용자 상세(속성·역할·상태 변경)
  * 역할 관리(부여/해제)

## 데이터베이스 설계(MySQL)

### 테이블 개요

| 테이블                   | 목적               |
| --------------------- | ---------------- |
| `users`               | 사용자 기본 정보        |
| `roles`               | 역할 메타            |
| `user_roles`          | 사용자-역할 매핑        |
| `sessions`            | 리프레시 토큰 기반 서버 세션 |
| `email_verifications` | 이메일 인증 토큰        |
| `password_resets`     | 비밀번호 재설정 토큰      |

### DDL (수정)

```sql
CREATE TABLE users (
  user_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(254) NOT NULL,
  email_verified TINYINT(1)  NOT NULL DEFAULT 0,
  password_hash VARCHAR(255) NULL,
  display_name  VARCHAR(255) NOT NULL,
  status        ENUM('active','disabled') NOT NULL DEFAULT 'active',
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE roles (
  role_name   VARCHAR(32) PRIMARY KEY,
  description VARCHAR(255),
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_roles (
  user_id     BIGINT UNSIGNED NOT NULL,
  role_name   VARCHAR(32) NOT NULL,
  assigned_by BIGINT UNSIGNED NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, role_name),
  CONSTRAINT fk_user_roles_user        FOREIGN KEY (user_id)   REFERENCES users(user_id)   ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role        FOREIGN KEY (role_name) REFERENCES roles(role_name) ON DELETE RESTRICT,
  CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sessions (
  session_id         VARCHAR(128) PRIMARY KEY,
  user_id            BIGINT UNSIGNED NOT NULL,
  refresh_token_hash VARCHAR(255) NOT NULL,
  ip                 VARCHAR(64),
  ua                 VARCHAR(255),
  created_at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at         DATETIME(3) NOT NULL,
  revoked_at         DATETIME(3) NULL,
  UNIQUE KEY uq_sessions_token_hash (refresh_token_hash),
  KEY idx_sessions_user_expires (user_id, expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE email_verifications (
  token_id    VARCHAR(128) PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  VARCHAR(255) NOT NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at  DATETIME(3) NOT NULL,
  consumed_at DATETIME(3) NULL,
  UNIQUE KEY uq_email_verifications_token_hash (token_hash),
  KEY idx_email_verifications_user (user_id),
  CONSTRAINT fk_email_verifications_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE password_resets (
  token_id    VARCHAR(128) PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  VARCHAR(255) NOT NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at  DATETIME(3) NOT NULL,
  consumed_at DATETIME(3) NULL,
  UNIQUE KEY uq_password_resets_token_hash (token_hash),
  KEY idx_password_resets_user (user_id),
  CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## API 설계

### 인증

* 회원가입: `POST /auth/register`
* 로그인: `POST /auth/login`
* 구글 OAuth 시작: `GET /auth/oauth/google`
* 구글 OAuth 콜백: `GET /auth/oauth/google/callback`
* 토큰 갱신: `POST /auth/refresh`
* 로그아웃: `POST /auth/logout`
* 이메일 인증: `POST /auth/verify-email`
* 비밀번호 재설정 요청: `POST /auth/password/forgot`
* 비밀번호 재설정: `POST /auth/password/reset`

### 사용자

* 내 프로필 조회: `GET /me`
* 내 프로필 수정: `PATCH /me`

### 관리자

* 사용자 목록: `GET /admin/users?query=&role=&status=&cursor=&limit=`
* 사용자 상세: `GET /admin/users/:userId`
* 사용자 수정: `PATCH /admin/users/:userId`
* 역할 부여: `POST /admin/users/:userId/roles`
* 역할 해제: `DELETE /admin/users/:userId/roles/:role`

## 권한 정책

* `member`: 본인 정보만 접근
* `admin`: 관리자 API 접근 가능

## 이메일·토큰 수명

* 액세스 토큰: 15분
* 리프레시 토큰/세션: 7\~30일(환경변수), 만료는 `sessions.expires_at` 기준으로 정기 정리
* 이메일 인증 토큰: 24시간
* 비밀번호 재설정 토큰: 1시간

## 구현 메모(간단)

* 비밀번호 해시: **Argon2id**(권장) 또는 bcrypt.
* 리프레시 토큰: **httpOnly + Secure + SameSite=Lax** 쿠키 저장 권장. 로테이션은 선택.
* OAuth: 구글에서 검증된 이메일은 `email_verified=1`로 동기화.
* 계정 상태 `disabled`면 액세스 토큰이 있어도 **403** 처리.
* 초기 관리자: 예시

```bash
ADMIN_EMAIL=admin@example.com
ADMIN_TEMP_PASSWORD='강한임시비밀번호'
```

필요 시 이 버전을 기준으로 세부(예: 인덱스 튜닝, 초대 기능 추가)를 얹으면 됩니다.
