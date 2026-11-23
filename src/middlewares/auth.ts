import type { NextFunction, Request, Response } from 'express';
import { User, type UserRole } from '../models/user.model';
import { AppError } from '../utils/AppError';
import { verifyToken } from '../utils/jwt';

export interface AuthUser {
  id: string;
  role: UserRole;
  username: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Requires a valid `Authorization: Bearer <token>` header and loads the user. */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Missing or malformed Authorization header'));
  }

  const payload = verifyToken(header.slice('Bearer '.length).trim());
  // Re-read the user so deleted users or changed roles take effect immediately.
  const user = await User.findById(payload.sub);
  if (!user) return next(AppError.unauthorized('User no longer exists'));

  req.user = { id: user.id, role: user.role, username: user.username };
  next();
}

/** Restricts a route to the given roles. Must run after `authenticate`. */
export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden());
    next();
  };
}

/** Throws 403 unless the user owns the resource or is an admin. */
export function assertOwnerOrAdmin(user: AuthUser, ownerId: unknown) {
  if (user.role === 'admin') return;
  if (String(ownerId) !== user.id) throw AppError.forbidden();
}

/** Returns the authenticated user or throws 401 — for use in controllers. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}
