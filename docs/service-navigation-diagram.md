# Service 프로젝트 네비게이션 다이어그램

## 프로젝트 개요

이 서비스는 사용자 인증 및 계정 관리를 위한 React 기반 프론트엔드 애플리케이션입니다. 회원가입, 로그인, 프로필 관리, 비밀번호 재설정 등의 기능을 제공합니다.

## 전체 네비게이션 플로우

```navigation
Home --> Register : 회원가입 버튼 클릭 (비로그인 상태)
Home --> Login : 로그인 버튼 클릭 (비로그인 상태)
Home --> Profile : 프로필 관리 버튼 클릭 (로그인 상태)
Home --> AdminDashboard : 관리자 대시보드 버튼 클릭 (admin 역할)
```

## 1. 회원가입 플로우

```navigation
Register --> (validation) : 폼 검증 (비밀번호 확인 일치)
(validation) --> Register : error - 비밀번호 불일치
(validation) --> (/auth/register)
(/auth/register) --> Register : error - 회원가입 실패
(/auth/register) --> RegisterSuccess : success
RegisterSuccess --> Login : 로그인하기 링크 클릭
```

## 2. 로그인 플로우

```navigation
Login --> (/auth/login)
(/auth/login) --> Login : error - 로그인 실패
(/auth/login) --> (set_auth_token) : success
(set_auth_token) --> Home
```

## 3. 비밀번호 재설정 플로우

```navigation
Login --> ForgotPassword : 비밀번호 찾기 링크 클릭
ForgotPassword --> (/auth/password/forgot)
(/auth/password/forgot) --> ForgotPassword : error - 요청 실패
(/auth/password/forgot) --> ForgotPasswordSuccess : success
ForgotPasswordSuccess --> Login : 로그인하기 링크 클릭

ResetPassword --> (validation) : 비밀번호 확인 일치 검증
(validation) --> ResetPassword : error - 비밀번호 불일치
(validation) --> (/auth/password/reset)
(/auth/password/reset) --> ResetPassword : error - 재설정 실패
(/auth/password/reset) --> ResetPasswordSuccess : success
ResetPasswordSuccess --> Login : 로그인하기 링크 클릭
```

## 4. 프로필 관리 플로우

```navigation
Profile --> (auth_check) : 인증 상태 확인
(auth_check) --> Login : 비로그인 상태
(auth_check) --> ProfileContent : 로그인 상태
ProfileContent --> (/users/me) : 프로필 업데이트 요청
(/users/me) --> ProfileContent : error - 업데이트 실패
(/users/me) --> ProfileContent : success - 업데이트 완료
```

## 5. 인증 및 토큰 관리

```navigation
AuthInitializer --> (check_token) : 앱 시작 시 토큰 확인
(check_token) --> (set_auth_header) : 토큰 존재
(set_auth_header) --> ServiceLayout

ServiceLayout --> LoadingSpinner : 로딩 상태 표시
ServiceLayout --> Routes : 라우팅 처리
```

## 6. API 엔드포인트

이 다이어그램에서 사용되는 주요 API 엔드포인트:

- `(/auth/register)`: 회원가입
- `(/auth/login)`: 로그인
- `(/auth/refresh)`: 토큰 갱신
- `(/auth/logout)`: 로그아웃
- `(/auth/verify_email)`: 이메일 인증
- `(/auth/password/forgot)`: 비밀번호 재설정 요청
- `(/auth/password/reset)`: 비밀번호 재설정
- `(/users/me)`: 사용자 프로필 조회/업데이트

## 주요 특징

1. **인증 기반 라우팅**: 로그인 상태에 따라 다른 UI와 기능 제공
2. **보호된 라우트**: Profile 페이지는 인증된 사용자만 접근 가능
3. **토큰 기반 인증**: JWT 토큰을 사용한 상태 관리
4. **역할 기반 접근**: 관리자 사용자는 추가 기능(관리자 대시보드) 접근 가능
5. **완전한 비밀번호 재설정**: 이메일을 통한 안전한 비밀번호 재설정 플로우
6. **사용자 피드백**: 성공/실패 상태에 따른 적절한 메시지 표시

## 상태 관리

- **authStore**: 인증 상태, 사용자 정보, 토큰 관리
- **loadingStore**: 전역 로딩 상태 관리
- **로컬 상태**: 각 페이지의 폼 데이터, 에러, 성공 메시지 관리