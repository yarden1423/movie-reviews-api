import { Types } from 'mongoose';
import { useTestDatabase } from '../helpers/db';
import { movieData as rawMovieData } from '../helpers/movies';
import { createMovieSchema } from '../../src/schemas/movie.schema';

const movieData = (overrides: Record<string, unknown> = {}) =>
  createMovieSchema.parse(rawMovieData(overrides));
import { Movie } from '../../src/models/movie.model';
import { movieService } from '../../src/services/movie.service';
import type { AuthUser } from '../../src/middlewares/auth';

useTestDatabase();

const owner: AuthUser = { id: new Types.ObjectId().toString(), role: 'user', username: 'owner' };
const stranger: AuthUser = { id: new Types.ObjectId().toString(), role: 'user', username: 'other' };
const admin: AuthUser = { id: new Types.ObjectId().toString(), role: 'admin', username: 'admin' };

describe('movieService (integration)', () => {
  it('creates a movie owned by the creator with zeroed rating stats', async () => {
    const movie = await movieService.create(movieData(), owner);
    const stored = await Movie.findById(movie.id);
    expect(String(stored!.createdBy)).toBe(owner.id);
    expect(movie.averageRating).toBe(0);
    expect(movie.reviewsCount).toBe(0);
  });

  it('rejects a duplicate title+year (case-insensitive) with 409', async () => {
    await movieService.create(movieData({ title: 'Inception', releaseYear: 2010 }), owner);
    await expect(
      movieService.create(movieData({ title: 'inception', releaseYear: 2010 }), owner),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('allows the same title in a different year (remakes)', async () => {
    await movieService.create(movieData({ title: 'Dune', releaseYear: 1984 }), owner);
    await expect(
      movieService.create(movieData({ title: 'Dune', releaseYear: 2021 }), owner),
    ).resolves.toBeDefined();
  });

  it('throws 404 for a missing movie', async () => {
    await expect(movieService.getById(new Types.ObjectId().toString())).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  describe('ownership', () => {
    it('lets the owner update the movie', async () => {
      const movie = await movieService.create(movieData(), owner);
      const updated = await movieService.update(movie.id, { director: 'New Director' }, owner);
      expect(updated.director).toBe('New Director');
    });

    it('forbids another user from updating or deleting', async () => {
      const movie = await movieService.create(movieData(), owner);
      await expect(
        movieService.update(movie.id, { director: 'X' }, stranger),
      ).rejects.toMatchObject({ statusCode: 403 });
      await expect(movieService.remove(movie.id, stranger)).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('lets an admin delete any movie', async () => {
      const movie = await movieService.create(movieData(), owner);
      await movieService.remove(movie.id, admin);
      expect(await Movie.findById(movie.id)).toBeNull();
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await Movie.create([
        {
          ...movieData({
            title: 'The Matrix',
            releaseYear: 1999,
            genres: ['Action', 'Sci-Fi'],
            director: 'Lana Wachowski',
            actors: ['Keanu Reeves'],
          }),
          createdBy: owner.id,
          averageRating: 7.5,
          reviewsCount: 10,
        },
        {
          ...movieData({
            title: 'John Wick',
            releaseYear: 2014,
            genres: ['Action'],
            director: 'Chad Stahelski',
            actors: ['Keanu Reeves'],
          }),
          createdBy: owner.id,
          averageRating: 6,
          reviewsCount: 4,
        },
        {
          ...movieData({
            title: 'Amelie',
            releaseYear: 2001,
            genres: ['Comedy', 'Romance'],
            director: 'Jean-Pierre Jeunet',
            actors: ['Audrey Tautou'],
          }),
          createdBy: owner.id,
          averageRating: 7,
          reviewsCount: 2,
        },
      ]);
    });

    const base = { page: 1, limit: 20, sort: '-createdAt' } as const;

    it('searches by partial, case-insensitive title', async () => {
      const result = await movieService.list({ ...base, q: 'matr' });
      expect(result.items.map((m) => m.title)).toEqual(['The Matrix']);
    });

    it('filters by genre, year, director and actor', async () => {
      expect((await movieService.list({ ...base, genre: 'Action' })).total).toBe(2);
      expect((await movieService.list({ ...base, year: 2001 })).items[0].title).toBe('Amelie');
      expect((await movieService.list({ ...base, director: 'stahel' })).total).toBe(1);
      expect((await movieService.list({ ...base, actor: 'keanu' })).total).toBe(2);
    });

    it('filters by minimum rating', async () => {
      const result = await movieService.list({ ...base, minRating: 7 });
      expect(result.items.map((m) => m.title).sort()).toEqual(['Amelie', 'The Matrix']);
    });

    it('sorts by rating descending', async () => {
      const result = await movieService.list({ ...base, sort: '-averageRating' });
      expect(result.items.map((m) => m.title)).toEqual(['The Matrix', 'Amelie', 'John Wick']);
    });

    it('paginates and reports totals', async () => {
      const result = await movieService.list({ ...base, limit: 2, page: 2, sort: 'title' });
      expect(result).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2 });
      expect(result.items.map((m) => m.title)).toEqual(['The Matrix']);
    });

    it('treats regex characters in search as plain text', async () => {
      const result = await movieService.list({ ...base, q: '.*' });
      expect(result.total).toBe(0);
    });
  });
});
