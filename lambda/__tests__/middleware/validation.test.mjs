import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateDisplayName,
  validateStatus,
  validateRole,
  parseBody,
  parseQueryParams,
} from '../../middleware/validation.mjs';
import { BadRequestError } from '../../utils/errors.mjs';

describe('validateEmail', () => {
  it('returns lowercased trimmed email for valid input', () => {
    expect(validateEmail('  User@Example.COM  ')).toBe('user@example.com');
  });

  it('accepts typical email formats', () => {
    expect(validateEmail('a@b.c')).toBe('a@b.c');
    expect(validateEmail('user.name+tag@domain.co.kr')).toBe('user.name+tag@domain.co.kr');
  });

  it('throws for null/undefined/empty', () => {
    expect(() => validateEmail(null)).toThrow(BadRequestError);
    expect(() => validateEmail(undefined)).toThrow(BadRequestError);
    expect(() => validateEmail('')).toThrow(BadRequestError);
  });

  it('throws for non-string', () => {
    expect(() => validateEmail(123)).toThrow(BadRequestError);
  });

  it('throws for invalid format', () => {
    expect(() => validateEmail('notanemail')).toThrow('Invalid email format');
    expect(() => validateEmail('@no-local.com')).toThrow('Invalid email format');
    expect(() => validateEmail('no-domain@')).toThrow('Invalid email format');
    expect(() => validateEmail('has space@a.com')).toThrow('Invalid email format');
  });

  it('throws for email longer than 254 chars', () => {
    const long = 'a'.repeat(243) + '@example.com'; // 255 chars
    expect(() => validateEmail(long)).toThrow('Email too long');
  });
});

describe('validatePassword', () => {
  it('returns valid password', () => {
    expect(validatePassword('password123')).toBe('password123');
  });

  it('throws for null/undefined/empty', () => {
    expect(() => validatePassword(null)).toThrow(BadRequestError);
    expect(() => validatePassword(undefined)).toThrow(BadRequestError);
    expect(() => validatePassword('')).toThrow(BadRequestError);
  });

  it('throws for non-string', () => {
    expect(() => validatePassword(12345678)).toThrow(BadRequestError);
  });

  it('throws for too short password', () => {
    expect(() => validatePassword('short')).toThrow('at least 8 characters');
  });

  it('throws for too long password', () => {
    const long = 'a'.repeat(129);
    expect(() => validatePassword(long)).toThrow('at most 128 characters');
  });

  it('accepts exactly 8 characters', () => {
    expect(validatePassword('12345678')).toBe('12345678');
  });

  it('accepts exactly 128 characters', () => {
    const pw = 'x'.repeat(128);
    expect(validatePassword(pw)).toBe(pw);
  });

  it('uses custom field name in error message', () => {
    expect(() => validatePassword('short', 'newPassword')).toThrow(
      'newPassword must be at least 8 characters'
    );
  });

  it('uses custom field name for missing password', () => {
    expect(() => validatePassword(null, 'currentPassword')).toThrow(
      'currentPassword is required'
    );
  });
});

describe('validateDisplayName', () => {
  it('returns trimmed display name', () => {
    expect(validateDisplayName('  Alice  ')).toBe('Alice');
  });

  it('throws for null/undefined/empty', () => {
    expect(() => validateDisplayName(null)).toThrow(BadRequestError);
    expect(() => validateDisplayName(undefined)).toThrow(BadRequestError);
    expect(() => validateDisplayName('')).toThrow(BadRequestError);
  });

  it('throws for whitespace-only string', () => {
    expect(() => validateDisplayName('   ')).toThrow('cannot be empty');
  });

  it('throws for name longer than 100 chars', () => {
    const long = 'a'.repeat(101);
    expect(() => validateDisplayName(long)).toThrow('at most 100 characters');
  });

  it('accepts exactly 100 characters', () => {
    const name = 'b'.repeat(100);
    expect(validateDisplayName(name)).toBe(name);
  });
});

describe('validateStatus', () => {
  it('returns valid statuses', () => {
    expect(validateStatus('active')).toBe('active');
    expect(validateStatus('disabled')).toBe('disabled');
    expect(validateStatus('suspended')).toBe('suspended');
  });

  it('throws for invalid status', () => {
    expect(() => validateStatus('deleted')).toThrow(BadRequestError);
    expect(() => validateStatus('withdrawn')).toThrow(BadRequestError);
    expect(() => validateStatus('')).toThrow(BadRequestError);
  });
});

describe('validateRole', () => {
  it('returns valid roles', () => {
    expect(validateRole('member')).toBe('member');
    expect(validateRole('admin')).toBe('admin');
  });

  it('throws for invalid role', () => {
    expect(() => validateRole('superadmin')).toThrow(BadRequestError);
    expect(() => validateRole('')).toThrow(BadRequestError);
  });
});

describe('parseBody', () => {
  it('parses JSON string body', () => {
    const event = { body: '{"key":"val"}' };
    expect(parseBody(event)).toEqual({ key: 'val' });
  });

  it('returns object body as-is', () => {
    const event = { body: { key: 'val' } };
    expect(parseBody(event)).toEqual({ key: 'val' });
  });

  it('returns empty object when body is null/undefined', () => {
    expect(parseBody({})).toEqual({});
    expect(parseBody({ body: null })).toEqual({});
  });

  it('throws BadRequestError for invalid JSON', () => {
    expect(() => parseBody({ body: '{invalid}' })).toThrow(BadRequestError);
    expect(() => parseBody({ body: '{invalid}' })).toThrow('Invalid JSON body');
  });
});

describe('parseQueryParams', () => {
  it('returns query string parameters', () => {
    const event = { queryStringParameters: { page: '1', limit: '10' } };
    expect(parseQueryParams(event)).toEqual({ page: '1', limit: '10' });
  });

  it('returns empty object when queryStringParameters is null', () => {
    expect(parseQueryParams({})).toEqual({});
    expect(parseQueryParams({ queryStringParameters: null })).toEqual({});
  });
});
