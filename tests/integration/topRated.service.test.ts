import { Types } from 'mongoose';
import { useTestDatabase } from '../helpers/db';
import { movieData } from '../helpers/movies';
import { Movie } from '../../src/models/movie.model';
import { movieService } from '../../src/services/movie.service';

useTestDatabase();

const owner = new Types.ObjectId();

async function seed(
  title: string,
  averageRating: number,
  reviewsCount: number,
  genres = ['Drama'],
) {
  return Movie.create({
    ...movieData({ title, genres }),
    createdBy: owner,
    averageRating,
    reviewsCount,
  });
}

describe('movieService.topRated (integration)', () => {
  beforeEach(async () => {
    await seed('Great', 7.8, 20);
    await seed('Also Great', 7.8, 5);
    await seed('Good', 6.5, 12, ['Comedy']);
    await seed('One Hit', 8, 1);
    await seed('Unrated', 0, 0);
  });

  it('orders by average rating, then by number of reviews', async () => {
    const result = await movieService.topRated({ limit: 10, minReviews: 1 });
    expect(result.map((m) => m.title)).toEqual(['One Hit', 'Great', 'Also Great', 'Good']);
  });

  it('excludes movies without enough reviews', async () => {
    const result = await movieService.topRated({ limit: 10, minReviews: 5 });
    expect(result.map((m) => m.title)).toEqual(['Great', 'Also Great', 'Good']);
  });

  it('never includes unrated movies', async () => {
    const result = await movieService.topRated({ limit: 10, minReviews: 0 });
    expect(result.map((m) => m.title)).not.toContain('Unrated');
  });

  it('filters by genre and respects the limit', async () => {
    expect(
      (await movieService.topRated({ limit: 10, minReviews: 1, genre: 'Comedy' })).map(
        (m) => m.title,
      ),
    ).toEqual(['Good']);
    expect(await movieService.topRated({ limit: 2, minReviews: 1 })).toHaveLength(2);
  });
});
