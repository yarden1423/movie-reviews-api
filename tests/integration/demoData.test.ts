import { useTestDatabase } from '../helpers/db';
import { DEMO_MOVIES, DEMO_PASSWORD, DEMO_USERS, seedDemoData } from '../../src/scripts/demoData';
import { Movie } from '../../src/models/movie.model';
import { Review } from '../../src/models/review.model';
import { User } from '../../src/models/user.model';
import { authService } from '../../src/services/auth.service';

useTestDatabase();

describe('seedDemoData (integration)', () => {
  it('creates the demo users, movies and reviews', async () => {
    const summary = await seedDemoData();

    expect(summary).toEqual({
      users: DEMO_USERS.length,
      movies: DEMO_MOVIES.length,
      reviews: expect.any(Number),
    });
    expect(await User.countDocuments()).toBe(DEMO_USERS.length);
    expect(await Movie.countDocuments()).toBe(DEMO_MOVIES.length);
    expect(await Review.countDocuments()).toBe(summary.reviews);
  });

  it("keeps every movie's rating stats consistent with its reviews", async () => {
    await seedDemoData();
    const movies = await Movie.find();

    for (const movie of movies) {
      const reviews = await Review.find({ movie: movie.id });
      expect(movie.reviewsCount).toBe(reviews.length);
      if (reviews.length > 0) {
        const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
        expect(movie.averageRating).toBeCloseTo(avg, 1);
      }
    }
  });

  it('creates users that can log in with the demo password', async () => {
    await seedDemoData();
    await expect(
      authService.login({ email: DEMO_USERS[0].email, password: DEMO_PASSWORD }),
    ).resolves.toHaveProperty('token');
  });

  it('is idempotent — running it twice does not duplicate data', async () => {
    await seedDemoData();
    const second = await seedDemoData();

    expect(second).toEqual({ users: 0, movies: 0, reviews: 0 });
    expect(await Movie.countDocuments()).toBe(DEMO_MOVIES.length);
  });
});
