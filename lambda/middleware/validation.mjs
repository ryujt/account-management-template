import { BadRequestError } from '../utils/errors.mjs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const DISPLAY_NAME_MAX = 100;

export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new BadRequestError('Email is required');
  }
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) {
    throw new BadRequestError('Invalid email format');
  }
  if (trimmed.length > 254) {
    throw new BadRequestError('Email too long');
  }
  return trimmed;
}

export function validatePassword(password, fieldName = 'password') {
  if (!password || typeof password !== 'string') {
    throw new BadRequestError(`${fieldName} is required`);
  }
  if (password.length < PASSWORD_MIN) {
    throw new BadRequestError(
      `${fieldName} must be at least ${PASSWORD_MIN} characters`
    );
  }
  if (password.length > PASSWORD_MAX) {
    throw new BadRequestError(
      `${fieldName} must be at most ${PASSWORD_MAX} characters`
    );
  }
  return password;
}

export function validateDisplayName(name) {
  if (!name || typeof name !== 'string') {
    throw new BadRequestError('Display name is required');
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new BadRequestError('Display name cannot be empty');
  }
  if (trimmed.length > DISPLAY_NAME_MAX) {
    throw new BadRequestError(
      `Display name must be at most ${DISPLAY_NAME_MAX} characters`
    );
  }
  return trimmed;
}

export function validateStatus(status) {
  const allowed = ['active', 'disabled', 'suspended'];
  if (!allowed.includes(status)) {
    throw new BadRequestError(`Status must be one of: ${allowed.join(', ')}`);
  }
  return status;
}

export function validateRole(role) {
  const allowed = ['member', 'admin'];
  if (!allowed.includes(role)) {
    throw new BadRequestError(`Role must be one of: ${allowed.join(', ')}`);
  }
  return role;
}

export function parseBody(event) {
  if (!event.body) return {};
  try {
    return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    throw new BadRequestError('Invalid JSON body');
  }
}

export function parseQueryParams(event) {
  return event.queryStringParameters || {};
}
