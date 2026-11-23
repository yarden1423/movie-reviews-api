import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { zodIssuesToDetails } from './validate';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
}

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof ZodError) return AppError.validation(zodIssuesToDetails(err));
  if (err instanceof mongoose.Error.CastError) {
    return AppError.badRequest(`Invalid value for ${err.path}`, [
      { field: err.path, message: 'Invalid identifier' },
    ]);
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return AppError.validation(
      Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
    );
  }
  if (typeof err === 'object' && err !== null) {
    const e = err as { code?: number; type?: string; keyValue?: Record<string, unknown> };
    if (e.code === 11000) {
      const fields = Object.keys(e.keyValue ?? {}).join(', ');
      return AppError.conflict(`Duplicate value for: ${fields}`);
    }
    if (e.type === 'entity.parse.failed') return AppError.badRequest('Malformed JSON body');
    if (e.type === 'entity.too.large')
      return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Body too large');
  }
  return new AppError(500, 'INTERNAL_ERROR', 'Something went wrong');
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const appError = toAppError(err);
  if (appError.statusCode >= 500 && process.env.NODE_ENV !== 'test') {
    console.error(err);
  }
  res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details ? { details: appError.details } : {}),
    },
  });
}
