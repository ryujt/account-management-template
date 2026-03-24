import { describe, it, expect } from 'vitest';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '../../utils/errors.js';

describe('AppError', () => {
  it('should set statusCode, code, message, and details', () => {
    const err = new AppError(418, 'TEAPOT', 'I am a teapot', { extra: 1 });
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe('TEAPOT');
    expect(err.message).toBe('I am a teapot');
    expect(err.details).toEqual({ extra: 1 });
    expect(err.name).toBe('AppError');
  });

  it('should be an instance of Error', () => {
    const err = new AppError(500, 'ERR', 'fail');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });
});

describe('BadRequestError', () => {
  it('should default to 400 BAD_REQUEST', () => {
    const err = new BadRequestError();
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.message).toBe('Bad request');
    expect(err.name).toBe('BadRequestError');
    expect(err).toBeInstanceOf(AppError);
  });

  it('should accept custom message and details', () => {
    const err = new BadRequestError('Invalid input', [{ path: 'email' }]);
    expect(err.message).toBe('Invalid input');
    expect(err.details).toEqual([{ path: 'email' }]);
  });
});

describe('UnauthorizedError', () => {
  it('should default to 401 UNAUTHORIZED', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.message).toBe('Unauthorized');
    expect(err.name).toBe('UnauthorizedError');
    expect(err).toBeInstanceOf(AppError);
  });
});

describe('ForbiddenError', () => {
  it('should default to 403 FORBIDDEN', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
    expect(err.message).toBe('Forbidden');
    expect(err.name).toBe('ForbiddenError');
    expect(err).toBeInstanceOf(AppError);
  });
});

describe('NotFoundError', () => {
  it('should default to 404 NOT_FOUND', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Not found');
    expect(err.name).toBe('NotFoundError');
    expect(err).toBeInstanceOf(AppError);
  });
});

describe('ConflictError', () => {
  it('should default to 409 CONFLICT', () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
    expect(err.message).toBe('Conflict');
    expect(err.name).toBe('ConflictError');
    expect(err).toBeInstanceOf(AppError);
  });
});
