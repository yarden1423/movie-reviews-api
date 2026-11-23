import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';

interface RequestSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export function zodIssuesToDetails(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

/**
 * Validates and coerces req.body / req.query / req.params against Zod schemas.
 * All issues from all parts are collected and returned together.
 */
export function validate(schemas: RequestSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const details: { field: string; message: string }[] = [];

    for (const part of ['params', 'query', 'body'] as const) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (!result.success) {
        details.push(
          ...zodIssuesToDetails(result.error).map((d) => ({
            ...d,
            field: part === 'body' ? d.field : `${part}.${d.field}`,
          })),
        );
        continue;
      }
      // req.query is a getter in Express 5, so it must be redefined rather than assigned.
      Object.defineProperty(req, part, { value: result.data, writable: true, configurable: true });
    }

    if (details.length > 0) return next(AppError.validation(details));
    next();
  };
}
