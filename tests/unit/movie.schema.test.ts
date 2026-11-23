import {
  createMovieSchema,
  listMoviesQuerySchema,
  updateMovieSchema,
} from '../../src/schemas/movie.schema';
import { movieData } from '../helpers/movies';

describe('movie schemas', () => {
  describe('createMovieSchema', () => {
    it('accepts a valid movie', () => {
      expect(createMovieSchema.safeParse(movieData()).success).toBe(true);
    });

    it('requires title and releaseYear', () => {
      const result = createMovieSchema.safeParse({ genres: ['Drama'] });
      expect(result.success).toBe(false);
      const fields = result.error!.issues.map((i) => i.path[0]);
      expect(fields).toEqual(expect.arrayContaining(['title', 'releaseYear']));
    });

    it.each([
      ['a year before cinema existed', { releaseYear: 1800 }],
      ['a year too far in the future', { releaseYear: new Date().getFullYear() + 5 }],
      ['an unknown genre', { genres: ['Cooking'] }],
      ['an empty genres list', { genres: [] }],
      ['an empty title', { title: '   ' }],
    ])('rejects %s', (_label, override) => {
      expect(createMovieSchema.safeParse(movieData(override)).success).toBe(false);
    });

    it('strips fields the client must not set (rating, owner)', () => {
      const result = createMovieSchema.parse(
        movieData({ averageRating: 8, reviewsCount: 100, createdBy: 'x' }),
      );
      expect(result).not.toHaveProperty('averageRating');
      expect(result).not.toHaveProperty('reviewsCount');
      expect(result).not.toHaveProperty('createdBy');
    });
  });

  describe('updateMovieSchema', () => {
    it('allows partial updates', () => {
      expect(updateMovieSchema.safeParse({ description: 'new' }).success).toBe(true);
    });

    it('rejects an empty update', () => {
      expect(updateMovieSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('listMoviesQuerySchema', () => {
    it('applies defaults', () => {
      expect(listMoviesQuerySchema.parse({})).toMatchObject({
        page: 1,
        limit: 20,
        sort: '-createdAt',
      });
    });

    it('coerces numeric query strings', () => {
      const q = listMoviesQuerySchema.parse({ page: '2', year: '1999', minRating: '6' });
      expect(q).toMatchObject({ page: 2, year: 1999, minRating: 6 });
    });

    it('rejects minRating outside the 1-8 scale and unknown sort fields', () => {
      expect(listMoviesQuerySchema.safeParse({ minRating: '9' }).success).toBe(false);
      expect(listMoviesQuerySchema.safeParse({ sort: 'password' }).success).toBe(false);
    });
  });
});
