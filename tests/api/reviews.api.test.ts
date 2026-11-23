import request from 'supertest';
import { createApp } from '../../src/app';
import { useTestDatabase } from '../helpers/db';
import { createAdmin, registerUser } from '../helpers/auth';
import { movieData } from '../helpers/movies';

useTestDatabase();
const app = createApp();

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function setup() {
  const owner = await registerUser(app);
  const movie = await request(app).post('/api/movies').set(auth(owner.token)).send(movieData());
  return { owner, movieId: movie.body.id as string };
}

function postReview(movieId: string, token: string, body = { rating: 7, text: 'Good movie' }) {
  return request(app).post(`/api/movies/${movieId}/reviews`).set(auth(token)).send(body);
}

describe('Reviews API', () => {
  describe('POST /api/movies/:id/reviews', () => {
    it('creates a review and returns it with the author', async () => {
      const { movieId } = await setup();
      const reviewer = await registerUser(app);

      const res = await postReview(movieId, reviewer.token, { rating: 8, text: 'Masterpiece' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(String),
        movie: movieId,
        rating: 8,
        text: 'Masterpiece',
        user: { id: reviewer.user.id, username: reviewer.user.username },
      });
    });

    it('returns 401 without a token', async () => {
      const { movieId } = await setup();
      const res = await request(app)
        .post(`/api/movies/${movieId}/reviews`)
        .send({ rating: 5, text: 'x' });
      expect(res.status).toBe(401);
    });

    it('returns 400 for a rating outside 1-8', async () => {
      const { movieId, owner } = await setup();
      const res = await postReview(movieId, owner.token, { rating: 10, text: 'x' });
      expect(res.status).toBe(400);
      expect(res.body.error.details[0].field).toBe('rating');
    });

    it('returns 409 when the user already reviewed the movie', async () => {
      const { movieId, owner } = await setup();
      await postReview(movieId, owner.token);
      const res = await postReview(movieId, owner.token);
      expect(res.status).toBe(409);
    });

    it('returns 404 for a movie that does not exist', async () => {
      const { owner } = await setup();
      const res = await postReview('64b7f9f9f9f9f9f9f9f9f9f9', owner.token);
      expect(res.status).toBe(404);
    });
  });

  describe('movie rating stats', () => {
    it('shows the average rating and number of reviews on the movie', async () => {
      const { movieId } = await setup();
      const a = await registerUser(app);
      const b = await registerUser(app);
      await postReview(movieId, a.token, { rating: 8, text: 'a' });
      await postReview(movieId, b.token, { rating: 7, text: 'b' });

      const res = await request(app).get(`/api/movies/${movieId}`);
      expect(res.body).toMatchObject({ averageRating: 7.5, reviewsCount: 2 });
    });

    it('can sort and filter movies by rating', async () => {
      const { movieId, owner } = await setup();
      const low = await request(app).post('/api/movies').set(auth(owner.token)).send(movieData());
      await postReview(movieId, owner.token, { rating: 8, text: 'top' });
      await postReview(low.body.id, owner.token, { rating: 2, text: 'low' });

      const res = await request(app).get('/api/movies?sort=-averageRating&minRating=5');
      expect(res.body.items.map((m: { id: string }) => m.id)).toEqual([movieId]);
    });
  });

  describe('GET /api/movies/:id/reviews', () => {
    it('is public and paginated', async () => {
      const { movieId } = await setup();
      for (let i = 0; i < 3; i += 1) {
        const u = await registerUser(app);
        await postReview(movieId, u.token);
      }

      const res = await request(app).get(`/api/movies/${movieId}/reviews?limit=2`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ total: 3, limit: 2, totalPages: 2 });
      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0].user.username).toEqual(expect.any(String));
    });
  });

  describe('PATCH /api/reviews/:id', () => {
    it('lets the author edit the review', async () => {
      const { movieId, owner } = await setup();
      const created = await postReview(movieId, owner.token);

      const res = await request(app)
        .patch(`/api/reviews/${created.body.id}`)
        .set(auth(owner.token))
        .send({ rating: 3, text: 'Changed my mind' });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ rating: 3, text: 'Changed my mind' });
      expect((await request(app).get(`/api/movies/${movieId}`)).body.averageRating).toBe(3);
    });

    it('returns 403 for someone else', async () => {
      const { movieId, owner } = await setup();
      const other = await registerUser(app);
      const created = await postReview(movieId, owner.token);

      const res = await request(app)
        .patch(`/api/reviews/${created.body.id}`)
        .set(auth(other.token))
        .send({ rating: 1 });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    it('lets an admin remove any review', async () => {
      const { movieId, owner } = await setup();
      const admin = await createAdmin();
      const created = await postReview(movieId, owner.token);

      const res = await request(app)
        .delete(`/api/reviews/${created.body.id}`)
        .set(auth(admin.token));
      expect(res.status).toBe(204);
      expect((await request(app).get(`/api/reviews/${created.body.id}`)).status).toBe(404);
      expect((await request(app).get(`/api/movies/${movieId}`)).body.reviewsCount).toBe(0);
    });
  });

  describe('GET /api/users/me/reviews', () => {
    it("returns the current user's reviews with the movie title", async () => {
      const { movieId, owner } = await setup();
      await postReview(movieId, owner.token, { rating: 6, text: 'mine' });

      const res = await request(app).get('/api/users/me/reviews').set(auth(owner.token));
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0].movie).toMatchObject({ id: movieId, title: expect.any(String) });
    });

    it('requires authentication', async () => {
      expect((await request(app).get('/api/users/me/reviews')).status).toBe(401);
    });
  });
});
