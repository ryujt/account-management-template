# E2E Test Scenarios

> Account Management Template - E2E 테스트 시나리오 문서
>
> 작성일: 2026-03-24
> 최종 업데이트: 2026-03-24 (DynamoDB + Lambda 마이그레이션 후)

---

## 목차

1. [인증 (Authentication)](#1-인증-authentication)
2. [토큰 관리 (Token Management)](#2-토큰-관리-token-management)
3. [사용자 프로필 (User Profile)](#3-사용자-프로필-user-profile)
4. [비밀번호 (Password)](#4-비밀번호-password)
5. [세션 관리 (Session Management)](#5-세션-관리-session-management)
6. [회원 탈퇴 (Account Withdrawal)](#6-회원-탈퇴-account-withdrawal)
7. [관리자 - 사용자 목록 (Admin - User List)](#7-관리자---사용자-목록-admin---user-list)
8. [관리자 - 사용자 상세 (Admin - User Detail)](#8-관리자---사용자-상세-admin---user-detail)
9. [관리자 - 상태 변경 (Admin - Status Change)](#9-관리자---상태-변경-admin---status-change)
10. [관리자 - 역할 관리 (Admin - Role Management)](#10-관리자---역할-관리-admin---role-management)
11. [에러 및 예외 (Error & Edge Cases)](#11-에러-및-예외-error--edge-cases)
12. [보안 (Security)](#12-보안-security)
13. [프론트엔드 통합 플로우 (Frontend Integration Flows)](#13-프론트엔드-통합-플로우-frontend-integration-flows)

---

## 시스템 개요

| 구성 요소 | URL | 설명 |
|-----------|-----|------|
| DynamoDB Local | `http://localhost:8000` | DynamoDB Local (Docker) |
| Backend (User API) | `http://localhost:3000` | Express 래퍼 (local-server.js) |
| Backend (Admin API) | `http://localhost:3001` | Express 래퍼 (local-server.js) |
| Frontend (User App) | `http://localhost:5173` | React 사용자 앱 (Nginx) |
| Admin (Admin App) | `http://localhost:5174` | React 관리자 앱 (Nginx) |

### 사전 조건 (Docker 배포)

```bash
docker compose up -d
# setup 컨테이너가 자동으로:
#   1. DynamoDB 테이블 생성 (AccountManagement, AccountManagement_AuditLog)
#   2. 관리자 계정 시드 (admin@example.com / admin1234)
```

### DynamoDB 테이블 설계

| Entity | PK | SK | 설명 |
|--------|----|----|------|
| User | `USER#<userId>` | `PROFILE` | 사용자 프로필 (roles 비정규화 포함) |
| Email Lock | `EMAIL#<email>` | `EMAIL_LOCK` | 이메일 중복 방지 |
| Session | `USER#<userId>` | `SESSION#<sessionId>` | 세션 (TTL 자동 삭제) |
| Audit Log | `ACTOR#<actorId>` | `<createdAt>#<id>` | 감사 로그 (별도 테이블) |

### 검증 규칙

| 필드 | 규칙 |
|------|------|
| Email | 유효한 이메일 형식 |
| Password | 최소 8자 |
| Display Name | 1~100자 |
| User ID | `u_<uuid>` 형식 |
| Session ID | `s_<uuid>` 형식 |

### 토큰 설정

| 항목 | 기본값 |
|------|--------|
| Access Token TTL | 900초 (15분) |
| Refresh Token TTL | 14일 (SESSION_TTL_DAYS) |
| Refresh Token Cookie | `rt`, HttpOnly, Path: `/auth` |
| 세션 정리 | DynamoDB TTL (자동) |

---

## 1. 인증 (Authentication)

### 1.1 회원가입

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status | 검증 |
|---|---------|--------|----------|------|-----------|--------|------|
| 1.1.1 | 정상 회원가입 | POST | `/auth/register` | `{ email, password, displayName }` | `{ userId: "u_*" }` 반환, member 역할 부여 | 201 | PASS |
| 1.1.2 | 중복 이메일로 가입 시도 | POST | `/auth/register` | 이미 등록된 email 사용 | ConflictError "Email already registered" | 409 | PASS |
| 1.1.3 | 짧은 비밀번호 (8자 미만) | POST | `/auth/register` | `{ password: "short" }` | ValidationError | 400 | PASS |
| 1.1.4 | 이메일 형식 오류 | POST | `/auth/register` | `{ email: "invalid" }` | ValidationError | 400 | PASS |
| 1.1.5 | displayName 누락 | POST | `/auth/register` | displayName 없음 | ValidationError | 400 | PASS |
| 1.1.6 | displayName 100자 초과 | POST | `/auth/register` | 101자 이상 | ValidationError | 400 | PASS |

### 1.2 로그인

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status | 검증 |
|---|---------|--------|----------|------|-----------|--------|------|
| 1.2.1 | 정상 로그인 | POST | `/auth/login` | `{ email, password }` | `{ accessToken, user }` + `rt` 쿠키 | 200 | PASS |
| 1.2.2 | 잘못된 비밀번호 | POST | `/auth/login` | 틀린 password | "Invalid email or password" | 401 | PASS |
| 1.2.3 | 존재하지 않는 이메일 | POST | `/auth/login` | 미등록 email | UnauthorizedError | 401 | PASS |
| 1.2.4 | 비활성(disabled) 계정 로그인 | POST | `/auth/login` | disabled 상태 사용자 | "Account is not active" | 401 | PASS |
| 1.2.5 | 정지(suspended) 계정 로그인 | POST | `/auth/login` | suspended 상태 사용자 | "Account is not active" | 401 | PASS |
| 1.2.6 | 탈퇴(withdrawn) 계정 로그인 | POST | `/auth/login` | withdrawn 상태 사용자 | "Account is not active" | 401 | PASS |

### 1.3 로그아웃

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status | 검증 |
|---|---------|--------|----------|------|-----------|--------|------|
| 1.3.1 | 정상 로그아웃 | POST | `/auth/logout` | Authorization 헤더 필요 | `{ message: "Logged out" }`, 세션 삭제, 쿠키 제거 | 200 | PASS |
| 1.3.2 | 미인증 상태에서 로그아웃 | POST | `/auth/logout` | 토큰 없음 | UnauthorizedError | 401 | PASS |

---

## 2. 토큰 관리 (Token Management)

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status | 검증 |
|---|---------|--------|----------|------|-----------|--------|------|
| 2.1 | Access Token으로 보호된 API 호출 | GET | `/user/info` | 유효한 Bearer 토큰 | 정상 응답 | 200 | PASS |
| 2.2 | 만료된 Access Token으로 API 호출 | GET | `/user/info` | 만료된 토큰 | UnauthorizedError | 401 | PASS |
| 2.3 | 정상 토큰 갱신 | POST | `/auth/refresh` | 유효한 `rt` 쿠키 | 새 accessToken + 새 `rt` 쿠키 (토큰 로테이션) | 200 | PASS |
| 2.4 | 잘못된 Refresh Token으로 갱신 | POST | `/auth/refresh` | 조작된 `rt` 쿠키 | UnauthorizedError | 401 | PASS |
| 2.5 | Refresh Token 쿠키 없이 갱신 시도 | POST | `/auth/refresh` | 쿠키 없음 | UnauthorizedError | 401 | PASS |

---

## 3. 사용자 프로필 (User Profile)

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status | 검증 |
|---|---------|--------|----------|------|-----------|--------|------|
| 3.1 | 프로필 조회 | GET | `/user/info` | 인증 필요 | `{ userId, email, displayName, roles, status, createdAt }` | 200 | PASS |
| 3.2 | 프로필 조회 (미인증) | GET | `/user/info` | 토큰 없음 | UnauthorizedError | 401 | PASS |
| 3.3 | displayName 변경 | PATCH | `/user/info` | `{ displayName: "새이름" }` | 업데이트된 프로필 반환 | 200 | PASS |
| 3.4 | displayName 빈 문자열로 변경 | PATCH | `/user/info` | `{ displayName: "" }` | ValidationError | 400 | PASS |
| 3.5 | displayName 100자 초과로 변경 | PATCH | `/user/info` | 101자 이상 | ValidationError | 400 | PASS |

---

## 4. 비밀번호 (Password)

### 4.1 비밀번호 변경 (Change Password)

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status | 검증 |
|---|---------|--------|----------|------|-----------|--------|------|
| 4.1.1 | 정상 비밀번호 변경 | POST | `/user/changepw` | `{ currentPassword, newPassword }` | "Password changed" | 200 | PASS |
| 4.1.2 | 현재 비밀번호 틀림 | POST | `/user/changepw` | 잘못된 currentPassword | UnauthorizedError | 401 | PASS |
| 4.1.3 | 새 비밀번호 8자 미만 | POST | `/user/changepw` | `{ newPassword: "short" }` | ValidationError | 400 | PASS |
| 4.1.4 | 변경 후 새 비밀번호로 로그인 | POST | `/auth/login` | 새 비밀번호 사용 | 정상 로그인 | 200 | PASS |

### 4.2 비밀번호 초기화 (Reset Password)

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status | 검증 |
|---|---------|--------|----------|------|-----------|--------|------|
| 4.2.1 | 정상 비밀번호 초기화 | POST | `/auth/password/reset` | 인증 필요 + `{ newPassword }` | 성공 메시지, 모든 세션 삭제 | 200 | PASS |
| 4.2.2 | 초기화 후 기존 Refresh Token 무효화 | POST | `/auth/refresh` | 초기화 전의 `rt` 쿠키 | 세션 삭제로 실패 | 401 | PASS |
| 4.2.3 | 초기화 후 새 비밀번호로 로그인 | POST | `/auth/login` | 새 비밀번호 사용 | 정상 로그인 | 200 | PASS |

---

## 5. 세션 관리 (Session Management)

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status | 검증 |
|---|---------|--------|----------|------|-----------|--------|------|
| 5.1 | 세션 목록 조회 | GET | `/user/sessions` | 인증 필요 | 활성 세션 목록 (IP, UA, 생성일, isCurrent 표시) | 200 | PASS |
| 5.2 | 현재 세션 표시 | GET | `/user/sessions` | 로그인 후 | "Current" 뱃지 표시 | 200 | PASS |
| 5.3 | 다른 세션 종료 | DELETE | `/user/sessions/:sessionId` | 현재가 아닌 세션 ID | 해당 세션 삭제 | 200 | PASS |
| 5.4 | 현재 세션 종료 시도 | DELETE | `/user/sessions/:sessionId` | 현재 세션 ID | BadRequestError (자기 세션 삭제 불가) | 400 | PASS |

---

## 6. 회원 탈퇴 (Account Withdrawal)

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status | 검증 |
|---|---------|--------|----------|------|-----------|--------|------|
| 6.1 | 정상 회원 탈퇴 | POST | `/user/withdraw` | `{ password }` (현재 비밀번호) | "Account withdrawn", 상태 → withdrawn, 전체 세션 삭제 | 200 | PASS |
| 6.2 | 잘못된 비밀번호로 탈퇴 시도 | POST | `/user/withdraw` | 틀린 password | UnauthorizedError | 401 | PASS |
| 6.3 | 탈퇴 후 로그인 시도 | POST | `/auth/login` | 탈퇴한 계정 | "Account is not active" | 401 | PASS |
| 6.4 | 관리자에서 탈퇴 사용자 확인 | GET | `/admin/users` | 관리자 인증 | status: "withdrawn" 표시 | 200 | PASS |

---

## 7. 관리자 - 사용자 목록 (Admin - User List)

> **전제조건**: admin 역할을 가진 사용자로 인증 (Backend-Admin, port 3001)

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status | 검증 |
|---|---------|--------|----------|------|-----------|--------|------|
| 7.1 | 전체 사용자 조회 (필터 없음) | GET | `/admin/users` | - | 페이지네이션된 사용자 목록 (기본 20건) | 200 | PASS |
| 7.2 | 이메일/이름으로 검색 | GET | `/admin/users?query=test` | 검색어 | 매칭되는 사용자만 반환 | 200 | PASS |
| 7.3 | 역할로 필터 | GET | `/admin/users?role=admin` | role 파라미터 | admin 역할 사용자만 반환 | 200 | PASS |
| 7.4 | 상태로 필터 | GET | `/admin/users?status=active` | status 파라미터 | active 사용자만 반환 | 200 | PASS |
| 7.5 | 복합 필터 | GET | `/admin/users?query=x&role=member&status=active` | 복합 조건 | 모든 조건 AND로 필터 | 200 | PASS |
| 7.6 | 커서 기반 페이지네이션 | GET | `/admin/users?cursor=...&limit=5` | cursor + limit | 다음 페이지 반환, nextCursor 포함 | 200 | PASS |
| 7.7 | limit 범위 초과 (101 이상) | GET | `/admin/users?limit=101` | 범위 벗어남 | ValidationError | 400 | PASS |
| 7.8 | 비관리자가 사용자 목록 접근 | GET | `/admin/users` | member 역할 토큰 | ForbiddenError | 403 | PASS |
| 7.9 | 미인증 상태에서 접근 | GET | `/admin/users` | 토큰 없음 | UnauthorizedError | 401 | PASS |

---

## 8. 관리자 - 사용자 상세 (Admin - User Detail)

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status | 검증 |
|---|---------|--------|----------|------|-----------|--------|------|
| 8.1 | 사용자 상세 조회 | GET | `/admin/users/:userId` | 유효한 userId | 사용자 정보 + 활성 세션 목록 | 200 | PASS |
| 8.2 | 존재하지 않는 사용자 조회 | GET | `/admin/users/:userId` | 없는 userId | NotFoundError | 404 | PASS |

---

## 9. 관리자 - 상태 변경 (Admin - Status Change)

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status | 검증 |
|---|---------|--------|----------|------|-----------|--------|------|
| 9.1 | active → disabled | PATCH | `/admin/users/:userId` | `{ status: "disabled" }` | 상태 변경, 해당 사용자 전체 세션 삭제 | 200 | PASS |
| 9.2 | active → suspended | PATCH | `/admin/users/:userId` | `{ status: "suspended" }` | 상태 변경, 해당 사용자 전체 세션 삭제 | 200 | PASS |
| 9.3 | disabled → active | PATCH | `/admin/users/:userId` | `{ status: "active" }` | 상태 복구, 다시 로그인 가능 | 200 | PASS |
| 9.4 | suspended → active | PATCH | `/admin/users/:userId` | `{ status: "active" }` | 상태 복구 | 200 | PASS |
| 9.5 | disabled 후 로그인 시도 | POST | `/auth/login` | disabled 사용자 | "Account is not active" | 401 | PASS |
| 9.6 | 복구 후 로그인 | POST | `/auth/login` | active로 복구된 사용자 | 정상 로그인 | 200 | PASS |

---

## 10. 관리자 - 역할 관리 (Admin - Role Management)

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status | 검증 |
|---|---------|--------|----------|------|-----------|--------|------|
| 10.1 | admin 역할 부여 | POST | `/admin/users/:userId/roles` | `{ role: "admin" }` | 역할 추가, 사용자 상세 반환 | 200 | PASS |
| 10.2 | 중복 역할 부여 (멱등성) | POST | `/admin/users/:userId/roles` | 이미 있는 역할 | 에러 없이 성공 | 200 | PASS |
| 10.3 | admin 역할 제거 | DELETE | `/admin/users/:userId/roles/admin` | - | 역할 제거, 사용자 상세 반환 | 200 | PASS |
| 10.4 | member 역할 제거 시도 | DELETE | `/admin/users/:userId/roles/member` | - | BadRequestError (member 제거 불가) | 400 | PASS |
| 10.5 | 자기 자신의 admin 역할 제거 | DELETE | `/admin/users/:userId/roles/admin` | 본인 userId | ForbiddenError (자기 강등 불가) | 403 | PASS |
| 10.6 | 비관리자의 관리자 API 로그인 차단 | POST | `:3001/auth/login` | member 역할 계정 | "Admin access required" | 403 | PASS |

---

## 11. 에러 및 예외 (Error & Edge Cases)

| # | 시나리오 | 요청 | 기대 결과 | Status | 검증 |
|---|---------|------|-----------|--------|------|
| 11.1 | 잘못된 JSON 형식 | Content-Type: application/json + 잘못된 JSON | BadRequestError | 400 | PASS |
| 11.2 | 필수 필드 누락 | 필수 값 없이 요청 | ValidationError (Zod) | 400 | PASS |
| 11.3 | 조작된 JWT | 변조된 Authorization 헤더 | UnauthorizedError | 401 | PASS |
| 11.4 | Authorization 헤더 누락 | 헤더 없이 보호된 API 호출 | UnauthorizedError | 401 | PASS |
| 11.5 | Health check | GET `/health` | `{ status: "ok" }` | 200 | PASS |

---

## 12. 보안 (Security)

| # | 시나리오 | 검증 방법 | 기대 결과 | 검증 |
|---|---------|----------|-----------|------|
| 12.1 | 비밀번호 bcrypt 해시 저장 | DynamoDB 직접 조회 | passwordHash가 bcrypt 형식 (`$2b$...`) | PASS |
| 12.2 | Refresh Token 해시 저장 | DynamoDB 직접 조회 | refreshTokenHash가 SHA256 해시 | PASS |
| 12.3 | CORS 설정 | 허용되지 않은 Origin에서 요청 | CORS 에러 | PASS |
| 12.4 | Admin 엔드포인트 역할 보호 | member 역할로 admin API 호출 | ForbiddenError (403) | PASS |
| 12.5 | 타 사용자 데이터 접근 불가 | 다른 사용자 정보 요청 | 본인 데이터만 반환 | PASS |
| 12.6 | 세션 IP/UA 기록 | 로그인 후 세션 확인 | IP, User-Agent 기록됨 | PASS |
| 12.7 | HttpOnly 쿠키 | 로그인 응답 쿠키 확인 | `rt` 쿠키가 HttpOnly, SameSite 설정 | PASS |
| 12.8 | DynamoDB TTL 세션 정리 | 만료된 세션 | DynamoDB TTL로 자동 삭제 + 쿼리 시 expiresAt 필터 | PASS |

---

## 13. 프론트엔드 통합 플로우 (Frontend Integration Flows)

### 13.1 사용자 앱 플로우 (port 5173)

| # | 시나리오 | 경로 | 검증 포인트 | 검증 |
|---|---------|------|------------|------|
| 13.1.1 | 랜딩 페이지 | `/` | 타이틀 "Account Management", Sign In/Get Started 링크 | PASS |
| 13.1.2 | 회원가입 → 로그인 리다이렉트 | `/register` → `/login` | 가입 후 "Account created" 토스트, 로그인 페이지 이동 | PASS |
| 13.1.3 | 로그인 → 대시보드 | `/login` → `/dashboard` | "Welcome back, {name}", Account Summary 표시 | PASS |
| 13.1.4 | 프로필 수정 | `/profile` | displayName 변경 → "Profile updated successfully." 토스트 | PASS |
| 13.1.5 | 비밀번호 변경 | `/change-password` | 현재/새 비밀번호 입력 → "Password changed successfully." | PASS |
| 13.1.6 | 세션 관리 | `/sessions` | 세션 목록 표시, 현재 세션 "Current" 마크, UA/IP 정보 | PASS |
| 13.1.7 | 로그아웃 | 헤더 메뉴 → Sign Out | 로그인 페이지로 리다이렉트 | PASS |
| 13.1.8 | 미인증 접근 차단 | `/dashboard` 직접 접근 | 로그인 페이지로 리다이렉트 (ProtectedRoute) | PASS |
| 13.1.9 | 잘못된 비밀번호 | `/login` | "Invalid email or password" 에러 표시 | PASS |
| 13.1.10 | 변경된 비밀번호로 재로그인 | `/login` | 비밀번호 변경 후 새 비밀번호로 로그인 성공 | PASS |
| 13.1.11 | 토큰 자동 갱신 | Access Token 만료 후 API 호출 | 인터셉터가 자동 refresh → 원래 요청 재시도 | PASS |

### 13.2 관리자 앱 플로우 (port 5174)

| # | 시나리오 | 경로 | 검증 포인트 | 검증 |
|---|---------|------|------------|------|
| 13.2.1 | 관리자 로그인 | `/login` | admin 역할 계정으로 로그인 성공 | PASS |
| 13.2.2 | 사용자 목록 조회 | `/` | 사용자 테이블 (email, displayName, status, roles, 생성일) | PASS |
| 13.2.3 | 역할 필터 | `/` | Admin 선택 → admin 사용자만 표시 | PASS |
| 13.2.4 | 상태 필터 | `/` | Withdrawn 선택 → 탈퇴 사용자만 표시 | PASS |
| 13.2.5 | 사용자 상세 이동 | `/users/:userId` | 테이블에서 사용자 클릭 → 상세 페이지 | PASS |
| 13.2.6 | 사용자 상태 변경 | `/users/:userId` | active→disabled→active 전환 성공, 토스트 표시 | PASS |
| 13.2.7 | 역할 추가 | `/users/:userId` | "+ Add admin" → 확인 → roles에 admin 추가 | PASS |
| 13.2.8 | 역할 제거 | `/users/:userId` | Remove → 확인 → roles에서 admin 제거 | PASS |
| 13.2.9 | 관리자 로그아웃 | 헤더 Logout 버튼 | 로그인 페이지로 리다이렉트 | PASS |
| 13.2.10 | 비관리자 로그인 차단 | `/login` | member 계정 → 403 "Admin access required" | PASS |

---

## 부록: API 엔드포인트 요약

### User API (port 3000)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/health` | X | 헬스 체크 |
| POST | `/auth/register` | X | 회원가입 |
| POST | `/auth/login` | X | 로그인 |
| POST | `/auth/refresh` | X (쿠키) | 토큰 갱신 |
| POST | `/auth/logout` | O | 로그아웃 |
| POST | `/auth/password/reset` | O | 비밀번호 초기화 |
| GET | `/user/info` | O | 프로필 조회 |
| PATCH | `/user/info` | O | 프로필 수정 |
| POST | `/user/changepw` | O | 비밀번호 변경 |
| GET | `/user/sessions` | O | 세션 목록 |
| DELETE | `/user/sessions/:sessionId` | O | 세션 종료 |
| POST | `/user/withdraw` | O | 회원 탈퇴 |

### Admin API (port 3001)

| Method | Endpoint | 인증 | 역할 | 설명 |
|--------|----------|------|------|------|
| POST | `/auth/login` | X | - | 관리자 로그인 (admin 역할 검증) |
| POST | `/auth/refresh` | X (쿠키) | - | 토큰 갱신 |
| POST | `/auth/logout` | O | - | 로그아웃 |
| GET | `/user/info` | O | - | 관리자 프로필 |
| GET | `/admin/users` | O | admin | 사용자 목록 |
| GET | `/admin/users/:userId` | O | admin | 사용자 상세 |
| PATCH | `/admin/users/:userId` | O | admin | 상태 변경 |
| POST | `/admin/users/:userId/roles` | O | admin | 역할 부여 |
| DELETE | `/admin/users/:userId/roles/:role` | O | admin | 역할 제거 |

---

## 부록: Docker 배포 구성

```yaml
services:
  dynamodb-local:   # DynamoDB Local (port 8000, in-memory)
  backend:          # Express 래퍼 local-server.js (port 3000 user, 3001 admin)
  setup:            # 테이블 생성 + 관리자 시드 (one-shot)
  frontend:         # React 사용자 앱 (port 5173, Nginx)
  admin:            # React 관리자 앱 (port 5174, Nginx)
```

### 시드 계정

| 구분 | Email | Password | Roles |
|------|-------|----------|-------|
| 관리자 | admin@example.com | admin1234 | member, admin |
