import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { BadRequestError } from '../../utils/errors.js';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

describe('validate middleware', () => {
  it('should call next() and replace body with parsed data on valid input', () => {
    const middleware = validate(schema);
    const req = { body: { email: 'a@b.com', password: '12345678', extra: 'stripped' } };
    const next = vi.fn();

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ email: 'a@b.com', password: '12345678' });
    expect(req.body.extra).toBeUndefined();
  });

  it('should call next with BadRequestError on invalid input', () => {
    const middleware = validate(schema);
    const req = { body: { email: 'not-an-email', password: 'short' } };
    const next = vi.fn();

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
    const err = next.mock.calls[0][0];
    expect(err.details).toBeInstanceOf(Array);
    expect(err.details.length).toBeGreaterThan(0);
    expect(err.details[0]).toHaveProperty('path');
    expect(err.details[0]).toHaveProperty('message');
  });

  it('should call next with BadRequestError on missing fields', () => {
    const middleware = validate(schema);
    const req = { body: {} };
    const next = vi.fn();

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
  });

  it('should validate query params when source is "query"', () => {
    const querySchema = z.object({ page: z.coerce.number().min(1) });
    const middleware = validate(querySchema, 'query');
    const req = { query: { page: '3' } };
    const next = vi.fn();

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query).toEqual({ page: 3 });
  });
});
