import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { UserRole } from '../models/user.model';
import { AppError } from './AppError';

export interface TokenPayload {
  sub: string;
  role: UserRole;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
      throw new Error('Unexpected token payload');
    }
    return { sub: decoded.sub, role: decoded.role as UserRole };
  } catch {
    throw AppError.unauthorized('Invalid or expired token');
  }
}
