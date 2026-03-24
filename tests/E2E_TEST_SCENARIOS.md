# E2E Test Scenarios

> Account Management Template - E2E 테스트 시나리오 문서
>
> 작성일: 2026-03-24

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
| Backend (User API) | `http://localhost:3000` | 사용자용 Express 서버 |
| Backend-Admin (Admin API) | `http://localhost:3001` | 관리자용 Express 서버 |
| Frontend (User App) | `http://localhost:5173` | React 사용자 앱 |
| Admin (Admin App) | `http://localhost:5174` | React 관리자 앱 |

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
| 세션 정리 주기 | 10분 |

---

## 1. 인증 (Authentication)

### 1.1 회원가입

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status |
|---|---------|--------|----------|------|-----------|--------|
| 1.1.1 | 정상 회원가입 | POST | `/auth/register` | `{ email, password, displayName }` | `{ userId: "u_*" }` 반환, member 역할 부여 | 201 |
| 1.1.2 | 중복 이메일로 가입 시도 | POST | `/auth/register` | 이미 등록된 email 사용 | ConflictError | 409 |
| 1.1.3 | 짧은 비밀번호 (8자 미만) | POST | `/auth/register` | `{ password: "short" }` | ValidationError | 400 |
| 1.1.4 | 이메일 형식 오류 | POST | `/auth/register` | `{ email: "invalid" }` | ValidationError | 400 |
| 1.1.5 | displayName 누락 | POST | `/auth/register` | displayName 없음 | ValidationError | 400 |
| 1.1.6 | displayName 100자 초과 | POST | `/auth/register` | 101자 이상 | ValidationError | 400 |
| 1.1.7 | 가입 후 audit_log 기록 확인 | - | - | 가입 수행 | `user.register` 액션 기록 | - |

### 1.2 로그인

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status |
|---|---------|--------|----------|------|-----------|--------|
| 1.2.1 | 정상 로그인 | POST | `/auth/login` | `{ email, password }` | `{ accessToken, user: { userId, email, displayName, roles } }` + `rt` 쿠키 | 200 |
| 1.2.2 | 잘못된 비밀번호 | POST | `/auth/login` | 틀린 password | UnauthorizedError | 401 |
| 1.2.3 | 존재하지 않는 이메일 | POST | `/auth/login` | 미등록 email | UnauthorizedError | 401 |
| 1.2.4 | 비활성(disabled) 계정 로그인 | POST | `/auth/login` | disabled 상태 사용자 | UnauthorizedError | 401 |
| 1.2.5 | 정지(suspended) 계정 로그인 | POST | `/auth/login` | suspended 상태 사용자 | UnauthorizedError | 401 |
| 1.2.6 | 탈퇴(withdrawn) 계정 로그인 | POST | `/auth/login` | withdrawn 상태 사용자 | UnauthorizedError | 401 |
| 1.2.7 | 로그인 시 세션 생성 확인 | - | - | 로그인 수행 | sessions 테이블에 레코드 생성 | - |
| 1.2.8 | 로그인 후 audit_log 기록 확인 | - | - | 로그인 수행 | `user.login` 액션 기록 (IP 포함) | - |

### 1.3 로그아웃

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status |
|---|---------|--------|----------|------|-----------|--------|
| 1.3.1 | 정상 로그아웃 | POST | `/auth/logout` | Authorization 헤더 필요 | `{ message: "Logged out" }`, 세션 삭제, 쿠키 제거 | 200 |
| 1.3.2 | 미인증 상태에서 로그아웃 | POST | `/auth/logout` | 토큰 없음 | UnauthorizedError | 401 |

---

## 2. 토큰 관리 (Token Management)

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status |
|---|---------|--------|----------|------|-----------|--------|
| 2.1 | Access Token으로 보호된 API 호출 | GET | `/user/info` | 유효한 Bearer 토큰 | 정상 응답 | 200 |
| 2.2 | 만료된 Access Token으로 API 호출 | GET | `/user/info` | 만료된 토큰 | UnauthorizedError | 401 |
| 2.3 | 정상 토큰 갱신 | POST | `/auth/refresh` | 유효한 `rt` 쿠키 | 새 accessToken 반환 + 새 `rt` 쿠키 (토큰 로테이션) | 200 |
| 2.4 | 만료된 Refresh Token으로 갱신 | POST | `/auth/refresh` | 만료된 `rt` 쿠키 | UnauthorizedError | 401 |
| 2.5 | 잘못된 Refresh Token으로 갱신 | POST | `/auth/refresh` | 조작된 `rt` 쿠키 | UnauthorizedError | 401 |
| 2.6 | Refresh Token 로테이션 후 이전 토큰 사용 | POST | `/auth/refresh` | 갱신 전의 `rt` 쿠키 | 해시 불일치로 실패 | 401 |
| 2.7 | Refresh Token 쿠키 없이 갱신 시도 | POST | `/auth/refresh` | 쿠키 없음 | UnauthorizedError | 401 |
| 2.8 | 비활성 사용자의 Refresh Token 갱신 | POST | `/auth/refresh` | disabled 사용자의 유효한 `rt` | 사용자 상태 확인 후 거부 | 401 |

---

## 3. 사용자 프로필 (User Profile)

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status |
|---|---------|--------|----------|------|-----------|--------|
| 3.1 | 프로필 조회 | GET | `/user/info` | 인증 필요 | `{ userId, email, displayName, roles, status, createdAt }` | 200 |
| 3.2 | 프로필 조회 (미인증) | GET | `/user/info` | 토큰 없음 | UnauthorizedError | 401 |
| 3.3 | displayName 변경 | PATCH | `/user/info` | `{ displayName: "새이름" }` | 업데이트된 프로필 반환 | 200 |
| 3.4 | displayName 빈 문자열로 변경 | PATCH | `/user/info` | `{ displayName: "" }` | ValidationError | 400 |
| 3.5 | displayName 100자 초과로 변경 | PATCH | `/user/info` | 101자 이상 | ValidationError | 400 |

---

## 4. 비밀번호 (Password)

### 4.1 비밀번호 변경 (Change Password)

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status |
|---|---------|--------|----------|------|-----------|--------|
| 4.1.1 | 정상 비밀번호 변경 | POST | `/user/changepw` | `{ currentPassword, newPassword }` | 성공 메시지 | 200 |
| 4.1.2 | 현재 비밀번호 틀림 | POST | `/user/changepw` | 잘못된 currentPassword | UnauthorizedError | 401 |
| 4.1.3 | 새 비밀번호 8자 미만 | POST | `/user/changepw` | `{ newPassword: "short" }` | ValidationError | 400 |

### 4.2 비밀번호 초기화 (Reset Password)

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status |
|---|---------|--------|----------|------|-----------|--------|
| 4.2.1 | 정상 비밀번호 초기화 | POST | `/auth/password/reset` | 인증 필요 + `{ newPassword }` | 성공 메시지, 모든 세션 삭제 | 200 |
| 4.2.2 | 초기화 후 기존 Refresh Token 무효화 확인 | POST | `/auth/refresh` | 초기화 전의 `rt` 쿠키 | 세션 삭제로 실패 | 401 |
| 4.2.3 | 초기화 후 새 비밀번호로 로그인 | POST | `/auth/login` | 새 비밀번호 사용 | 정상 로그인 | 200 |
| 4.2.4 | 초기화 후 audit_log 확인 | - | - | - | `user.password_reset` 액션 기록 | - |

---

## 5. 세션 관리 (Session Management)

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status |
|---|---------|--------|----------|------|-----------|--------|
| 5.1 | 세션 목록 조회 | GET | `/user/sessions` | 인증 필요 | 활성 세션 목록 (IP, UA, 생성일, isCurrent 표시) | 200 |
| 5.2 | 다중 디바이스 로그인 후 세션 확인 | GET | `/user/sessions` | 여러 번 로그인 후 | 모든 세션 표시 | 200 |
| 5.3 | 다른 세션 종료 | DELETE | `/user/sessions/:sessionId` | 현재가 아닌 세션 ID | 해당 세션 삭제 | 200 |
| 5.4 | 현재 세션 종료 시도 | DELETE | `/user/sessions/:sessionId` | 현재 세션 ID | BadRequestError (자기 세션 삭제 불가) | 400 |
| 5.5 | 존재하지 않는 세션 종료 | DELETE | `/user/sessions/:sessionId` | 잘못된 세션 ID | NotFoundError 또는 적절한 에러 | 404 |
| 5.6 | 다른 사용자의 세션 종료 시도 | DELETE | `/user/sessions/:sessionId` | 타인의 세션 ID | 본인 세션이 아니므로 실패 | 403/404 |

---

## 6. 회원 탈퇴 (Account Withdrawal)

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status |
|---|---------|--------|----------|------|-----------|--------|
| 6.1 | 정상 회원 탈퇴 | POST | `/user/withdraw` | `{ password }` (현재 비밀번호) | `{ message: "Account withdrawn" }`, 상태 → withdrawn, 전체 세션 삭제 | 200 |
| 6.2 | 잘못된 비밀번호로 탈퇴 시도 | POST | `/user/withdraw` | 틀린 password | UnauthorizedError | 401 |
| 6.3 | 탈퇴 후 로그인 시도 | POST | `/auth/login` | 탈퇴한 계정 | UnauthorizedError (withdrawn 상태) | 401 |
| 6.4 | 탈퇴 후 audit_log 확인 | - | - | - | `user.withdraw` 액션 기록 | - |

---

## 7. 관리자 - 사용자 목록 (Admin - User List)

> **전제조건**: admin 역할을 가진 사용자로 인증 (Backend-Admin, port 3001)

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status |
|---|---------|--------|----------|------|-----------|--------|
| 7.1 | 전체 사용자 조회 (필터 없음) | GET | `/admin/users` | - | 페이지네이션된 사용자 목록 (기본 20건) | 200 |
| 7.2 | 이메일/이름으로 검색 | GET | `/admin/users?query=test` | 검색어 | 매칭되는 사용자만 반환 | 200 |
| 7.3 | 역할로 필터 | GET | `/admin/users?role=admin` | role 파라미터 | admin 역할 사용자만 반환 | 200 |
| 7.4 | 상태로 필터 | GET | `/admin/users?status=active` | status 파라미터 | active 사용자만 반환 | 200 |
| 7.5 | 복합 필터 | GET | `/admin/users?query=x&role=member&status=active` | 복합 조건 | 모든 조건 AND로 필터 | 200 |
| 7.6 | 커서 기반 페이지네이션 | GET | `/admin/users?cursor=...&limit=5` | cursor + limit | 다음 페이지 반환, nextCursor 포함 | 200 |
| 7.7 | limit 범위 초과 (101 이상) | GET | `/admin/users?limit=101` | 범위 벗어남 | ValidationError | 400 |
| 7.8 | 비관리자가 사용자 목록 접근 | GET | `/admin/users` | member 역할 토큰 | ForbiddenError | 403 |
| 7.9 | 미인증 상태에서 접근 | GET | `/admin/users` | 토큰 없음 | UnauthorizedError | 401 |

---

## 8. 관리자 - 사용자 상세 (Admin - User Detail)

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status |
|---|---------|--------|----------|------|-----------|--------|
| 8.1 | 사용자 상세 조회 | GET | `/admin/users/:userId` | 유효한 userId | 사용자 정보 + 활성 세션 목록 | 200 |
| 8.2 | 존재하지 않는 사용자 조회 | GET | `/admin/users/:userId` | 없는 userId | NotFoundError | 404 |

---

## 9. 관리자 - 상태 변경 (Admin - Status Change)

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status |
|---|---------|--------|----------|------|-----------|--------|
| 9.1 | active → disabled | PATCH | `/admin/users/:userId` | `{ status: "disabled" }` | 상태 변경, 해당 사용자 전체 세션 삭제 | 200 |
| 9.2 | active → suspended | PATCH | `/admin/users/:userId` | `{ status: "suspended" }` | 상태 변경, 해당 사용자 전체 세션 삭제 | 200 |
| 9.3 | disabled → active | PATCH | `/admin/users/:userId` | `{ status: "active" }` | 상태 복구, 다시 로그인 가능 | 200 |
| 9.4 | suspended → active | PATCH | `/admin/users/:userId` | `{ status: "active" }` | 상태 복구 | 200 |
| 9.5 | disabled 후 로그인 시도 | POST | `/auth/login` | disabled 사용자 | UnauthorizedError | 401 |
| 9.6 | suspended 후 Refresh Token 사용 | POST | `/auth/refresh` | suspended 사용자의 rt | 세션 삭제로 실패 | 401 |
| 9.7 | 상태 변경 후 audit_log 확인 | - | - | - | `admin.update_status` 기록 (actor_id = 관리자) | - |

---

## 10. 관리자 - 역할 관리 (Admin - Role Management)

| # | 시나리오 | Method | Endpoint | 요청 | 기대 결과 | Status |
|---|---------|--------|----------|------|-----------|--------|
| 10.1 | admin 역할 부여 | POST | `/admin/users/:userId/roles` | `{ role: "admin" }` | 역할 추가, 사용자 상세 반환 | 200 |
| 10.2 | 중복 역할 부여 (멱등성) | POST | `/admin/users/:userId/roles` | 이미 있는 역할 | 에러 없이 성공 | 200 |
| 10.3 | admin 역할 제거 | DELETE | `/admin/users/:userId/roles/admin` | - | 역할 제거, 사용자 상세 반환 | 200 |
| 10.4 | member 역할 제거 시도 | DELETE | `/admin/users/:userId/roles/member` | - | BadRequestError (member 제거 불가) | 400 |
| 10.5 | 자기 자신의 admin 역할 제거 | DELETE | `/admin/users/:userId/roles/admin` | 본인 userId | ForbiddenError (자기 강등 불가) | 403 |
| 10.6 | admin 부여 후 관리자 API 접근 확인 | GET | `/admin/users` | 새 admin 토큰 | 정상 접근 가능 | 200 |
| 10.7 | admin 제거 후 관리자 API 접근 차단 확인 | GET | `/admin/users` | 제거된 admin 토큰 | ForbiddenError | 403 |

---

## 11. 에러 및 예외 (Error & Edge Cases)

| # | 시나리오 | 요청 | 기대 결과 | Status |
|---|---------|------|-----------|--------|
| 11.1 | 잘못된 JSON 형식 | Content-Type: application/json + 잘못된 JSON | BadRequestError | 400 |
| 11.2 | 필수 필드 누락 | 필수 값 없이 요청 | ValidationError (Zod) | 400 |
| 11.3 | 조작된 JWT | 변조된 Authorization 헤더 | UnauthorizedError | 401 |
| 11.4 | Authorization 헤더 누락 | 헤더 없이 보호된 API 호출 | UnauthorizedError | 401 |
| 11.5 | 잘못된 Bearer 형식 | `Authorization: InvalidFormat` | UnauthorizedError | 401 |
| 11.6 | Health check | GET `/health` | 정상 응답 | 200 |

---

## 12. 보안 (Security)

| # | 시나리오 | 검증 방법 | 기대 결과 |
|---|---------|----------|-----------|
| 12.1 | 비밀번호 bcrypt 해시 저장 | DB 직접 조회 | password_hash가 bcrypt 형식 (`$2b$...`) |
| 12.2 | Refresh Token 해시 저장 | DB 직접 조회 | refresh_token_hash가 SHA256 해시 |
| 12.3 | CORS 설정 | 허용되지 않은 Origin에서 요청 | CORS 에러 |
| 12.4 | Admin 엔드포인트 역할 보호 | member 역할로 admin API 호출 | ForbiddenError (403) |
| 12.5 | 타 사용자 데이터 접근 불가 | 다른 사용자 정보 요청 | 본인 데이터만 반환 |
| 12.6 | 세션 IP/UA 기록 | 로그인 후 세션 확인 | IP, User-Agent 기록됨 |
| 12.7 | HttpOnly 쿠키 | 로그인 응답 쿠키 확인 | `rt` 쿠키가 HttpOnly, SameSite 설정 |

---

## 13. 프론트엔드 통합 플로우 (Frontend Integration Flows)

### 13.1 사용자 앱 플로우 (port 5173)

| # | 시나리오 | 경로 | 검증 포인트 |
|---|---------|------|------------|
| 13.1.1 | 전체 사용자 플로우 | `/register` → `/login` → `/dashboard` → `/profile` → `/change-password` → `/sessions` → 로그아웃 | 각 페이지 정상 렌더링 및 기능 동작 |
| 13.1.2 | 회원가입 후 로그인 | `/register` → `/login` | 가입 → 가입한 정보로 로그인 성공 |
| 13.1.3 | 대시보드 정보 표시 | `/dashboard` | 사용자 이름, 이메일, 역할, ID 표시 |
| 13.1.4 | 프로필 수정 | `/profile` | displayName 변경 → 저장 → 반영 확인 |
| 13.1.5 | 비밀번호 변경 | `/change-password` | 현재 비밀번호 입력 → 새 비밀번호 → 변경 성공 |
| 13.1.6 | 세션 관리 | `/sessions` | 세션 목록 표시, 현재 세션 마크, 다른 세션 종료 |
| 13.1.7 | 회원 탈퇴 | `/withdraw` | 비밀번호 확인 → 탈퇴 → 로그인 페이지 이동 |
| 13.1.8 | 미인증 접근 차단 | `/dashboard` 직접 접근 | 로그인 페이지로 리다이렉트 (ProtectedRoute) |
| 13.1.9 | 토큰 자동 갱신 | Access Token 만료 후 API 호출 | 인터셉터가 자동 refresh → 원래 요청 재시도 |
| 13.1.10 | Refresh 실패 시 로그아웃 | Refresh Token도 만료 | 인증 정보 클리어 → 로그인 페이지 이동 |
| 13.1.11 | Toast 알림 | 성공/실패 액션 수행 | 적절한 토스트 메시지 표시 |

### 13.2 관리자 앱 플로우 (port 5174)

| # | 시나리오 | 경로 | 검증 포인트 |
|---|---------|------|------------|
| 13.2.1 | 관리자 로그인 | `/login` | admin 역할 계정으로 로그인 성공 |
| 13.2.2 | 사용자 목록 조회 | `/` | 사용자 테이블 (email, displayName, status, roles, 생성일) |
| 13.2.3 | 사용자 검색 | `/` | 검색어 입력 → 필터링된 결과 |
| 13.2.4 | 역할 필터 | `/` | role 드롭다운 선택 → 필터링 |
| 13.2.5 | 상태 필터 | `/` | status 드롭다운 선택 → 필터링 |
| 13.2.6 | 페이지네이션 | `/` | "더 보기" 버튼 → 다음 페이지 로드 |
| 13.2.7 | 사용자 상세 이동 | `/users/:userId` | 테이블에서 사용자 클릭 → 상세 페이지 |
| 13.2.8 | 사용자 상태 변경 | `/users/:userId` | 상태 변경 → 즉시 반영 |
| 13.2.9 | 역할 추가/제거 | `/users/:userId` | 역할 관리 UI에서 추가/제거 |
| 13.2.10 | 세션 정보 확인 | `/users/:userId` | 해당 사용자의 활성 세션 표시 (ID, IP, UA, 생성일) |

---

## 부록: API 엔드포인트 요약

### Backend (port 3000)

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

### Backend-Admin (port 3001)

| Method | Endpoint | 인증 | 역할 | 설명 |
|--------|----------|------|------|------|
| POST | `/auth/login` | X | - | 관리자 로그인 |
| POST | `/auth/refresh` | X (쿠키) | - | 토큰 갱신 |
| POST | `/auth/logout` | O | - | 로그아웃 |
| GET | `/user/info` | O | - | 관리자 프로필 |
| GET | `/admin/users` | O | admin | 사용자 목록 |
| GET | `/admin/users/:userId` | O | admin | 사용자 상세 |
| PATCH | `/admin/users/:userId` | O | admin | 상태 변경 |
| POST | `/admin/users/:userId/roles` | O | admin | 역할 부여 |
| DELETE | `/admin/users/:userId/roles/:role` | O | admin | 역할 제거 |

---

## 부록: DB 스키마

```sql
-- users
CREATE TABLE users (
  user_id   TEXT PRIMARY KEY,       -- u_<uuid>
  email     TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  status    TEXT DEFAULT 'active',   -- active | disabled | suspended | withdrawn
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- user_roles
CREATE TABLE user_roles (
  user_id    TEXT REFERENCES users(user_id),
  role       TEXT,                    -- member | admin
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, role)
);

-- sessions
CREATE TABLE sessions (
  session_id        TEXT PRIMARY KEY,  -- s_<uuid>
  user_id           TEXT REFERENCES users(user_id),
  refresh_token_hash TEXT NOT NULL,
  ip                TEXT,
  ua                TEXT,
  created_at        TEXT DEFAULT (datetime('now')),
  expires_at        INTEGER            -- epoch seconds
);

-- audit_logs
CREATE TABLE audit_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  action     TEXT NOT NULL,           -- user.register, user.login, admin.update_status, ...
  actor_id   TEXT,
  target_id  TEXT,
  detail     TEXT,
  ip         TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```
