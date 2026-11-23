import type { FilterQuery, SortOrder } from 'mongoose';
import { assertOwnerOrAdmin, type AuthUser } from '../middlewares/auth';
import { Movie, TITLE_COLLATION, type MovieAttrs, type MovieDocument } from '../models/movie.model';
import { paginate, type Paginated } from '../schemas/common.schema';
import type { CreateMovieInput, ListMoviesQuery, UpdateMovieInput } from '../schemas/movie.schema';
import { AppError } from '../utils/AppError';
import { containsInsensitive } from '../utils/regex';
import { reviewService } from './review.service';

const OWNER_FIELDS = 'username';

async function assertNotDuplicate(title: string, releaseYear: number, excludeId?: string) {
  const existing = await Movie.findOne({
    title,
    releaseYear,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).collation(TITLE_COLLATION);
  if (existing) {
    throw AppError.conflict(`A movie titled "${title}" from ${releaseYear} already exists`);
  }
}

async function findOrThrow(id: string): Promise<MovieDocument> {
  const movie = await Movie.findById(id);
  if (!movie) throw AppError.notFound('Movie');
  return movie;
}

async function create(input: CreateMovieInput, user: AuthUser): Promise<MovieDocument> {
  await assertNotDuplicate(input.title, input.releaseYear);
  const movie = await Movie.create({ ...input, createdBy: user.id });
  return movie.populate('createdBy', OWNER_FIELDS);
}

async function getById(id: string): Promise<MovieDocument> {
  const movie = await findOrThrow(id);
  return movie.populate('createdBy', OWNER_FIELDS);
}

async function list(query: ListMoviesQuery): Promise<Paginated<MovieDocument>> {
  const filter: FilterQuery<MovieAttrs> = {};
  if (query.q) filter.title = containsInsensitive(query.q);
  if (query.genre) filter.genres = query.genre;
  if (query.year) filter.releaseYear = query.year;
  if (query.director) filter.director = containsInsensitive(query.director);
  if (query.actor) filter.actors = containsInsensitive(query.actor);
  if (query.minRating !== undefined) filter.averageRating = { $gte: query.minRating };

  const field = query.sort.replace(/^-/, '');
  const direction: SortOrder = query.sort.startsWith('-') ? -1 : 1;
  // _id as a tie-breaker keeps pagination stable.
  const sort: Record<string, SortOrder> = { [field]: direction, _id: 1 };

  const [items, total] = await Promise.all([
    Movie.find(filter)
      .sort(sort)
      .collation(TITLE_COLLATION)
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('createdBy', OWNER_FIELDS),
    Movie.countDocuments(filter),
  ]);
  return paginate(items, total, query);
}

async function update(id: string, input: UpdateMovieInput, user: AuthUser): Promise<MovieDocument> {
  const movie = await findOrThrow(id);
  assertOwnerOrAdmin(user, movie.createdBy);

  if (input.title !== undefined || input.releaseYear !== undefined) {
    await assertNotDuplicate(
      input.title ?? movie.title,
      input.releaseYear ?? movie.releaseYear,
      movie.id,
    );
  }
  movie.set(input);
  await movie.save();
  return movie.populate('createdBy', OWNER_FIELDS);
}

async function remove(id: string, user: AuthUser): Promise<void> {
  const movie = await findOrThrow(id);
  assertOwnerOrAdmin(user, movie.createdBy);
  // Reviews cannot exist without their movie, so they are removed with it.
  await reviewService.removeAllForMovie(movie.id);
  await movie.deleteOne();
}

export const movieService = { create, getById, list, update, remove };
