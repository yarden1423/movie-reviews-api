import { z } from 'zod';
import { FIRST_FILM_YEAR, GENRES } from '../models/movie.model';
import { paginationQuerySchema } from './common.schema';

export const RATING_MIN = 1;
export const RATING_MAX = 8;

const maxYear = () => new Date().getFullYear() + 1;

const releaseYear = z.coerce
  .number()
  .int('Release year must be an integer')
  .min(FIRST_FILM_YEAR, `Release year must be ${FIRST_FILM_YEAR} or later`)
  .refine((y) => y <= maxYear(), { message: 'Release year cannot be more than a year ahead' });

const movieFields = {
  title: z.string().trim().min(1, 'Title is required').max(200),
  releaseYear,
  genres: z
    .array(z.enum(GENRES))
    .min(1, 'At least one genre is required')
    .max(5)
    .transform((g) => [...new Set(g)]),
  director: z.string().trim().min(1).max(100).optional(),
  actors: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  description: z.string().trim().max(2000).optional(),
};

export const createMovieSchema = z.object(movieFields);

export const updateMovieSchema = z
  .object(movieFields)
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided',
  });

export const MOVIE_SORT_FIELDS = [
  'title',
  'releaseYear',
  'averageRating',
  'reviewsCount',
  'createdAt',
] as const;
const sortValues = MOVIE_SORT_FIELDS.flatMap((f) => [f, `-${f}`]) as [string, ...string[]];

export const listMoviesQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
  genre: z.enum(GENRES).optional(),
  year: z.coerce.number().int().optional(),
  director: z.string().trim().min(1).max(100).optional(),
  actor: z.string().trim().min(1).max(100).optional(),
  minRating: z.coerce.number().min(RATING_MIN).max(RATING_MAX).optional(),
  sort: z.enum(sortValues).default('-createdAt'),
});

export const topRatedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  minReviews: z.coerce.number().int().min(0).default(1),
  genre: z.enum(GENRES).optional(),
});

export type CreateMovieInput = z.infer<typeof createMovieSchema>;
export type UpdateMovieInput = z.infer<typeof updateMovieSchema>;
export type ListMoviesQuery = z.infer<typeof listMoviesQuerySchema>;
export type TopRatedQuery = z.infer<typeof topRatedQuerySchema>;
