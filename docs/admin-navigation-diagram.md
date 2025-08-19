# Admin 프로젝트 네비게이션 다이어그램 (수정 버전 – # 파라미터)

## 전체 네비게이션 플로우

```navigation
AdminLogin --> AdminDashboard : 관리자 로그인 성공
AdminDashboard --> AdminUserDetail : 사용자 상세 버튼 클릭
AdminDashboard --> AdminAuditLog : 감사 로그 탭 클릭
AdminUserDetail --> AdminDashboard : 목록으로 버튼 클릭
AdminAuditLog --> AdminDashboard : 사용자 관리 탭 클릭
```

## 1. 관리자 로그인 플로우

```navigation
AdminLogin --> (/auth/login)
(/auth/login) --> AdminLogin : error - 로그인 실패
(/auth/login) --> (admin_role_check) : success - 로그인 성공
(admin_role_check) --> AdminLogin : error - 관리자 권한 없음
(admin_role_check) --> (set_auth_token) : success - 관리자 권한 확인
(set_auth_token) --> AdminDashboard
```

## 2. 관리자 대시보드 플로우

```navigation
AdminDashboard --> (auth_check) : 인증 및 관리자 권한 확인
(auth_check) --> AdminLogin : 권한 없음
(auth_check) --> AdminDashboardContent : 권한 확인됨
AdminDashboardContent --> (/admin/users) : 사용자 목록 로드
(/admin/users) --> AdminDashboardContent : success - 사용자 목록 표시
(/admin/users) --> AdminDashboardContent : error - 로드 실패

AdminDashboardContent --> (search_filter) : 검색/필터 적용
(search_filter) --> (/admin/users) : 필터 파라미터와 함께 재요청

AdminDashboardContent --> (/admin/users/#userId) : 상태 변경 요청
(/admin/users/#userId) --> AdminDashboardContent : success - 상태 변경 완료
(/admin/users/#userId) --> AdminDashboardContent : error - 상태 변경 실패

AdminDashboardContent --> (/admin/users/#userId/roles) : 역할 부여 요청
(/admin/users/#userId/roles) --> AdminDashboardContent : success - 역할 변경 완료
(/admin/users/#userId/roles) --> AdminDashboardContent : error - 역할 변경 실패

AdminDashboardContent --> (/admin/users/#userId/roles/#role) : 역할 제거 요청
(/admin/users/#userId/roles/#role) --> AdminDashboardContent : success - 역할 제거 완료
(/admin/users/#userId/roles/#role) --> AdminDashboardContent : error - 역할 제거 실패

AdminDashboardContent --> AdminUserDetail : 상세 보기 링크 클릭
AdminDashboardContent --> AdminAuditLog : 감사 로그 탭 클릭
```

## 3. 사용자 상세 관리 플로우

```navigation
AdminUserDetail --> (auth_check) : 인증 및 관리자 권한 확인
(auth_check) --> AdminLogin : 권한 없음
(auth_check) --> AdminUserDetailContent : 권한 확인됨
AdminUserDetailContent --> (/admin/users/#userId) : 사용자 정보 로드
(/admin/users/#userId) --> AdminUserDetailContent : success - 상세 정보 표시
(/admin/users/#userId) --> AdminUserDetailContent : error - 사용자 정보 로드 실패

AdminUserDetailContent --> (/admin/users/#userId) : 사용자 정보 업데이트
(/admin/users/#userId) --> AdminUserDetailContent : success - 정보 업데이트 완료
(/admin/users/#userId) --> AdminUserDetailContent : error - 업데이트 실패

AdminUserDetailContent --> (/admin/users/#userId/roles) : 역할 부여
(/admin/users/#userId/roles) --> AdminUserDetailContent : success - 역할 부여 완료
(/admin/users/#userId/roles) --> AdminUserDetailContent : error - 역할 부여 실패

AdminUserDetailContent --> (/admin/users/#userId/roles/#role) : 역할 제거
(/admin/users/#userId/roles/#role) --> AdminUserDetailContent : success - 역할 제거 완료
(/admin/users/#userId/roles/#role) --> AdminUserDetailContent : error - 역할 제거 실패

AdminUserDetailContent --> AdminDashboard : 목록으로 버튼 클릭
```

## 4. 감사 로그 조회 플로우

```navigation
AdminAuditLog --> (auth_check) : 인증 및 관리자 권한 확인
(auth_check) --> AdminLogin : 권한 없음
(auth_check) --> AdminAuditLogContent : 권한 확인됨
AdminAuditLogContent --> (/admin/audit) : 감사 로그 로드
(/admin/audit) --> AdminAuditLogContent : success - 감사 로그 표시
(/admin/audit) --> AdminAuditLogContent : error - 로그 로드 실패

AdminAuditLogContent --> (filter_change) : 필터 조건 변경
(filter_change) --> (/admin/audit) : 필터 파라미터와 함께 재요청

AdminAuditLogContent --> (clear_filters) : 필터 초기화
(clear_filters) --> (/admin/audit) : 기본 조건으로 재요청

AdminAuditLogContent --> AdminDashboard : 사용자 관리 탭 클릭
```

## 6. API 엔드포인트

### 인증 관련

* `(/auth/login)`: 관리자 로그인
* `(/auth/refresh)`: 토큰 갱신
* `(/auth/logout)`: 로그아웃

### 사용자 관리

* `(/admin/users)`: 사용자 목록 조회 (필터링 지원)
* `(/admin/users/#userId)`: 특정 사용자 정보 조회/업데이트
* `(/admin/users/#userId/roles)`: 사용자 역할 부여
* `(/admin/users/#userId/roles/#role)`: 사용자 역할 제거

### 초대 관리

* `(/admin/invites)`: 초대 링크 생성

### 감사 로그

* `(/admin/audit)`: 감사 로그 조회 (필터링 지원)
