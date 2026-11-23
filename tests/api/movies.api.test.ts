import request from 'supertest';
import { createApp } from '../../src/app';
import { useTestDatabase } from '../helpers/db';
import { createAdmin, registerUser } from '../helpers/auth';
import { movieData } from '../helpers/movies';

useTestDatabase();
const app = createApp();

async function createMovie(token: string, overrides = {}) {
  return request(app)
    .post('/api/movies')
    .set('Authorization', `Bearer ${token}`)
    .send(movieData(overrides));
}

describe('Movies API', () => {
  describe('POST /api/movies', () => {
    it('creates a movie for an authenticated user', async () => {
      const { token, user } = await registerUser(app);
      const res = await createMovie(token, { title: 'Inception' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(String),
        title: 'Inception',
        averageRating: 0,
        reviewsCount: 0,
        createdBy: { id: user.id, username: user.username },
      });
    });

    it('returns 401 without a token', async () => {
      const res = await request(app).post('/api/movies').send(movieData());
      expect(res.status).toBe(401);
    });

    it('returns 400 with field details for invalid data', async () => {
      const { token } = await registerUser(app);
      const res = await createMovie(token, { title: '', releaseYear: 1500 });
      expect(res.status).toBe(400);
      const fields = res.body.error.details.map((d: { field: string }) => d.field);
      expect(fields).toEqual(expect.arrayContaining(['title', 'releaseYear']));
    });

    it('returns 409 for a duplicate movie', async () => {
      const { token } = await registerUser(app);
      await createMovie(token, { title: 'Dup', releaseYear: 2000 });
      const res = await createMovie(token, { title: 'Dup', releaseYear: 2000 });
      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/movies', () => {
    it('is public and returns a paginated list', async () => {
      const { token } = await registerUser(app);
      await createMovie(token);
      await createMovie(token);

      const res = await request(app).get('/api/movies?limit=1');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ page: 1, limit: 1, total: 2, totalPages: 2 });
      expect(res.body.items).toHaveLength(1);
    });

    it('supports search and filters via query string', async () => {
      const { token } = await registerUser(app);
      await createMovie(token, { title: 'Interstellar', genres: ['Sci-Fi'] });
      await createMovie(token, { title: 'Notting Hill', genres: ['Romance'] });

      const res = await request(app).get('/api/movies?q=stellar&genre=Sci-Fi');
      expect(res.body.items.map((m: { title: string }) => m.title)).toEqual(['Interstellar']);
    });

    it('returns 400 for an invalid query parameter', async () => {
      const res = await request(app).get('/api/movies?minRating=20');
      expect(res.status).toBe(400);
      expect(res.body.error.details[0].field).toBe('query.minRating');
    });
  });

  describe('GET /api/movies/:id', () => {
    it('returns movie details including rating stats', async () => {
      const { token } = await registerUser(app);
      const created = await createMovie(token);

      const res = await request(app).get(`/api/movies/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: created.body.id, averageRating: 0, reviewsCount: 0 });
    });

    it('returns 400 for a malformed id and 404 for a missing one', async () => {
      expect((await request(app).get('/api/movies/not-an-id')).status).toBe(400);
      expect((await request(app).get('/api/movies/64b7f9f9f9f9f9f9f9f9f9f9')).status).toBe(404);
    });
  });

  describe('PATCH /api/movies/:id', () => {
    it('lets the creator update the movie', async () => {
      const { token } = await registerUser(app);
      const created = await createMovie(token);

      const res = await request(app)
        .patch(`/api/movies/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body.description).toBe('Updated');
    });

    it('returns 403 for another user', async () => {
      const { token } = await registerUser(app);
      const other = await registerUser(app);
      const created = await createMovie(token);

      const res = await request(app)
        .patch(`/api/movies/${created.body.id}`)
        .set('Authorization', `Bearer ${other.token}`)
        .send({ description: 'Hacked' });
      expect(res.status).toBe(403);
    });

    it('does not allow changing the rating directly', async () => {
      const { token } = await registerUser(app);
      const created = await createMovie(token);

      const res = await request(app)
        .patch(`/api/movies/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'ok', averageRating: 8 });
      expect(res.body.averageRating).toBe(0);
    });
  });

  describe('DELETE /api/movies/:id', () => {
    it('lets an admin delete any movie', async () => {
      const { token } = await registerUser(app);
      const admin = await createAdmin();
      const created = await createMovie(token);

      const res = await request(app)
        .delete(`/api/movies/${created.body.id}`)
        .set('Authorization', `Bearer ${admin.token}`);
      expect(res.status).toBe(204);
      expect((await request(app).get(`/api/movies/${created.body.id}`)).status).toBe(404);
    });

    it('returns 403 for a non-owner', async () => {
      const { token } = await registerUser(app);
      const other = await registerUser(app);
      const created = await createMovie(token);

      const res = await request(app)
        .delete(`/api/movies/${created.body.id}`)
        .set('Authorization', `Bearer ${other.token}`);
      expect(res.status).toBe(403);
    });
  });
});
