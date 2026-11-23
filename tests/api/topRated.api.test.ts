import request from 'supertest';
import { createApp } from '../../src/app';
import { useTestDatabase } from '../helpers/db';
import { registerUser } from '../helpers/auth';
import { movieData } from '../helpers/movies';

useTestDatabase();
const app = createApp();

describe('GET /api/movies/top', () => {
  it('is public and returns the highest rated movies first', async () => {
    const { token } = await registerUser(app);
    const auth = { Authorization: `Bearer ${token}` };
    const low = await request(app).post('/api/movies').set(auth).send(movieData());
    const high = await request(app).post('/api/movies').set(auth).send(movieData());
    await request(app)
      .post(`/api/movies/${low.body.id}/reviews`)
      .set(auth)
      .send({ rating: 3, text: 'meh' });
    await request(app)
      .post(`/api/movies/${high.body.id}/reviews`)
      .set(auth)
      .send({ rating: 8, text: 'wow' });

    const res = await request(app).get('/api/movies/top');
    expect(res.status).toBe(200);
    expect(res.body.map((m: { id: string }) => m.id)).toEqual([high.body.id, low.body.id]);
    expect(res.body[0]).toMatchObject({ averageRating: 8, reviewsCount: 1 });
  });

  it('is not mistaken for a movie id', async () => {
    const res = await request(app).get('/api/movies/top');
    expect(res.status).not.toBe(400);
  });

  it('returns 400 for an invalid limit', async () => {
    const res = await request(app).get('/api/movies/top?limit=500');
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('query.limit');
  });
});
