export const USER_STATUS = {
  ACTIVE: 'active',
  DISABLED: 'disabled'
};

export const USER_ROLES = {
  MEMBER: 'member',
  ADMIN: 'admin',
  MANAGER: 'manager'
};

export const ROLE_LABELS = {
  [USER_ROLES.MEMBER]: '일반 사용자',
  [USER_ROLES.ADMIN]: '관리자',
  [USER_ROLES.MANAGER]: '매니저'
};

export const STATUS_LABELS = {
  [USER_STATUS.ACTIVE]: '활성',
  [USER_STATUS.DISABLED]: '비활성'
};

export const AUDIT_ACTIONS = {
  USER_LOGGED_IN: 'UserLoggedIn',
  USER_LOGGED_OUT: 'UserLoggedOut',
  USER_UPDATED: 'UserUpdated',
  USER_ROLE_ASSIGNED: 'UserRoleAssigned',
  USER_ROLE_REVOKED: 'UserRoleRevoked',
  PROFILE_UPDATED: 'ProfileUpdated',
  PASSWORD_RESET: 'PasswordReset',
  INVITE_CREATED: 'InviteCreated',
  SESSION_REVOKED: 'SessionRevoked'
};

export const ACTION_LABELS = {
  [AUDIT_ACTIONS.USER_LOGGED_IN]: '로그인',
  [AUDIT_ACTIONS.USER_LOGGED_OUT]: '로그아웃',
  [AUDIT_ACTIONS.USER_UPDATED]: '사용자 정보 수정',
  [AUDIT_ACTIONS.USER_ROLE_ASSIGNED]: '역할 부여',
  [AUDIT_ACTIONS.USER_ROLE_REVOKED]: '역할 해제',
  [AUDIT_ACTIONS.PROFILE_UPDATED]: '프로필 수정',
  [AUDIT_ACTIONS.PASSWORD_RESET]: '비밀번호 재설정',
  [AUDIT_ACTIONS.INVITE_CREATED]: '초대 생성',
  [AUDIT_ACTIONS.SESSION_REVOKED]: '세션 해제'
};

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};