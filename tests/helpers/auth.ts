import request from 'supertest';
import type { Express } from 'express';
import { User } from '../../src/models/user.model';
import { hashPassword } from '../../src/utils/password';
import { signToken } from '../../src/utils/jwt';

let counter = 0;

export function uniqueUser(
  overrides: Partial<{ username: string; email: string; password: string }> = {},
) {
  counter += 1;
  return {
    username: `user${counter}`,
    email: `user${counter}@example.com`,
    password: 'Passw0rd!',
    ...overrides,
  };
}

/** Registers a user through the API and returns the token + user. */
export async function registerUser(app: Express, overrides = {}) {
  const data = uniqueUser(overrides);
  const res = await request(app).post('/api/auth/register').send(data);
  return { token: res.body.token as string, user: res.body.user, credentials: data };
}

/** Creates an admin directly in the DB (admins can't self-register). */
export async function createAdmin() {
  const data = uniqueUser();
  const admin = await User.create({
    username: data.username,
    email: data.email,
    passwordHash: await hashPassword(data.password),
    role: 'admin',
  });
  return { token: signToken({ sub: admin.id, role: 'admin' }), user: admin };
}
