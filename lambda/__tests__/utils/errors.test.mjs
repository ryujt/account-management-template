import { describe, it, expect } from 'vitest';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
} from '../../utils/errors.mjs';

describe('AppError', () => {
  it('sets statusCode, code, message, and details', () => {
    const err = new AppError(418, 'Teapot', 'I am a teapot', { field: 'x' });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AppError');
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe('Teapot');
    expect(err.message).toBe('I am a teapot');
    expect(err.details).toEqual({ field: 'x' });
  });

  it('defaults details to null', () => {
    const err = new AppError(500, 'Err', 'msg');
    expect(err.details).toBeNull();
  });
});

describe('BadRequestError', () => {
  it('has 400 status and BadRequest code', () => {
    const err = new BadRequestError('bad input');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BadRequest');
    expect(err.message).toBe('bad input');
  });

  it('uses default message', () => {
    const err = new BadRequestError();
    expect(err.message).toBe('Bad request');
  });

  it('accepts details', () => {
    const err = new BadRequestError('fail', { fields: ['a'] });
    expect(err.details).toEqual({ fields: ['a'] });
  });
});

describe('UnauthorizedError', () => {
  it('has 401 status and Unauthorized code', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('Unauthorized');
    expect(err.message).toBe('Unauthorized');
  });

  it('accepts custom message', () => {
    const err = new UnauthorizedError('Token expired');
    expect(err.message).toBe('Token expired');
  });
});

describe('ForbiddenError', () => {
  it('has 403 status and Forbidden code', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('Forbidden');
    expect(err.message).toBe('Forbidden');
  });
});

describe('NotFoundError', () => {
  it('has 404 status and NotFound code', () => {
    const err = new NotFoundError('resource missing');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NotFound');
    expect(err.message).toBe('resource missing');
  });

  it('uses default message', () => {
    expect(new NotFoundError().message).toBe('Not found');
  });
});

describe('ConflictError', () => {
  it('has 409 status and Conflict code', () => {
    const err = new ConflictError('duplicate');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('Conflict');
    expect(err.message).toBe('duplicate');
  });
});

describe('TooManyRequestsError', () => {
  it('has 429 status and TooManyRequests code', () => {
    const err = new TooManyRequestsError();
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('TooManyRequests');
    expect(err.message).toBe('Too many requests');
  });
});

describe('inheritance chain', () => {
  it('all errors are instances of AppError and Error', () => {
    const errors = [
      new BadRequestError(),
      new UnauthorizedError(),
      new ForbiddenError(),
      new NotFoundError(),
      new ConflictError(),
      new TooManyRequestsError(),
    ];
    for (const err of errors) {
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(Error);
    }
  });
});
