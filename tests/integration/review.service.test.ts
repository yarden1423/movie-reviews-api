import { Types } from 'mongoose';
import { useTestDatabase } from '../helpers/db';
import { movieData } from '../helpers/movies';
import { Movie } from '../../src/models/movie.model';
import { Review } from '../../src/models/review.model';
import { User } from '../../src/models/user.model';
import { reviewService } from '../../src/services/review.service';
import { movieService } from '../../src/services/movie.service';
import type { AuthUser } from '../../src/middlewares/auth';

useTestDatabase();

async function makeUser(role: 'user' | 'admin' = 'user'): Promise<AuthUser> {
  const n = new Types.ObjectId().toString().slice(-6);
  const user = await User.create({
    username: `u${n}`,
    email: `u${n}@example.com`,
    passwordHash: 'x',
    role,
  });
  return { id: user.id, role, username: user.username };
}

async function makeMovie(owner: AuthUser) {
  return Movie.create({ ...movieData(), createdBy: owner.id });
}

describe('reviewService (integration)', () => {
  let alice: AuthUser;
  let bob: AuthUser;
  let movieId: string;

  beforeEach(async () => {
    alice = await makeUser();
    bob = await makeUser();
    movieId = (await makeMovie(alice)).id;
  });

  it('creates a review and updates the movie rating stats', async () => {
    await reviewService.create(movieId, { rating: 8, text: 'Loved it' }, alice);
    await reviewService.create(movieId, { rating: 5, text: 'Okay' }, bob);

    const movie = await Movie.findById(movieId);
    expect(movie!.reviewsCount).toBe(2);
    expect(movie!.averageRating).toBe(6.5);
  });

  it('allows only one review per user per movie (409)', async () => {
    await reviewService.create(movieId, { rating: 8, text: 'First' }, alice);
    await expect(
      reviewService.create(movieId, { rating: 2, text: 'Second' }, alice),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('returns 404 when reviewing a movie that does not exist', async () => {
    await expect(
      reviewService.create(new Types.ObjectId().toString(), { rating: 5, text: 'x' }, alice),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('recalculates the average when a review is edited', async () => {
    const review = await reviewService.create(movieId, { rating: 2, text: 'Meh' }, alice);
    await reviewService.update(review.id, { rating: 6 }, alice);

    const movie = await Movie.findById(movieId);
    expect(movie!.averageRating).toBe(6);
  });

  it('only lets the author edit a review — even admins cannot rewrite it', async () => {
    const admin = await makeUser('admin');
    const review = await reviewService.create(movieId, { rating: 7, text: 'Mine' }, alice);

    await expect(reviewService.update(review.id, { text: 'Hacked' }, bob)).rejects.toMatchObject({
      statusCode: 403,
    });
    await expect(reviewService.update(review.id, { text: 'Edited' }, admin)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('lets the author or an admin delete a review and resets stats', async () => {
    const admin = await makeUser('admin');
    const review = await reviewService.create(movieId, { rating: 7, text: 'Mine' }, alice);

    await expect(reviewService.remove(review.id, bob)).rejects.toMatchObject({ statusCode: 403 });
    await reviewService.remove(review.id, admin);

    const movie = await Movie.findById(movieId);
    expect(movie).toMatchObject({ averageRating: 0, reviewsCount: 0 });
  });

  it("lists a movie's reviews with the author username, newest first", async () => {
    await reviewService.create(movieId, { rating: 8, text: 'First' }, alice);
    await reviewService.create(movieId, { rating: 4, text: 'Second' }, bob);

    const result = await reviewService.listByMovie(movieId, { page: 1, limit: 10 });
    expect(result.total).toBe(2);
    expect(result.items[0].text).toBe('Second');
    expect(result.items[0].user).toMatchObject({ username: bob.username });
  });

  it('lists the reviews written by a user', async () => {
    const otherMovie = await makeMovie(alice);
    await reviewService.create(movieId, { rating: 8, text: 'A' }, alice);
    await reviewService.create(otherMovie.id, { rating: 3, text: 'B' }, alice);
    await reviewService.create(movieId, { rating: 5, text: 'C' }, bob);

    const result = await reviewService.listByUser(alice.id, { page: 1, limit: 10 });
    expect(result.total).toBe(2);
  });

  it('deletes all reviews of a movie when the movie is deleted', async () => {
    await reviewService.create(movieId, { rating: 8, text: 'A' }, alice);
    await reviewService.create(movieId, { rating: 3, text: 'B' }, bob);

    await movieService.remove(movieId, alice);
    expect(await Review.countDocuments({ movie: movieId })).toBe(0);
  });
});
