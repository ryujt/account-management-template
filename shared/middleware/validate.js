import { BadRequestError } from '../utils/errors.js';

/**
 * Factory that returns middleware validating req[source] against a Zod schema.
 *
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} [source='body']
 * @returns {import('express').RequestHandler}
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return next(new BadRequestError('Validation failed', details));
    }

    // Replace with parsed (coerced / stripped) data
    req[source] = result.data;
    next();
  };
}
