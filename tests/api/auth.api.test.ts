import request from 'supertest';
import { createApp } from '../../src/app';
import { useTestDatabase } from '../helpers/db';
import { registerUser, uniqueUser } from '../helpers/auth';

useTestDatabase();
const app = createApp();

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('registers a user and returns 201 with a token, without the password', async () => {
      const res = await request(app).post('/api/auth/register').send(uniqueUser());

      expect(res.status).toBe(201);
      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({ role: 'user', id: expect.any(String) });
      expect(res.body.user).not.toHaveProperty('passwordHash');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('ignores an attempt to register as admin', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...uniqueUser(), role: 'admin' });
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('user');
    });

    it('returns 400 with all field errors for invalid input', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'a', email: 'bad', password: '1' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      const fields = res.body.error.details.map((d: { field: string }) => d.field);
      expect(fields).toEqual(expect.arrayContaining(['username', 'email', 'password']));
    });

    it('returns 409 when the email is already taken', async () => {
      const data = uniqueUser();
      await request(app).post('/api/auth/register').send(data);
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...data, username: 'someoneelse' });
      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with valid credentials', async () => {
      const { credentials } = await registerUser(app);
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: credentials.email, password: credentials.password });

      expect(res.status).toBe(200);
      expect(res.body.token).toEqual(expect.any(String));
    });

    it('returns 401 for a wrong password', async () => {
      const { credentials } = await registerUser(app);
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: credentials.email, password: 'WrongPass1' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/users/me', () => {
    it('returns the current user for a valid token', async () => {
      const { token, user } = await registerUser(app);
      const res = await request(app).get('/api/users/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(user.id);
    });

    it('returns 401 without a token', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 for a malformed Authorization header', async () => {
      const res = await request(app).get('/api/users/me').set('Authorization', 'Token abc');
      expect(res.status).toBe(401);
    });
  });
});
