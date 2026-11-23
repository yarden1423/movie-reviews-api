import { assertOwnerOrAdmin, type AuthUser } from '../middlewares/auth';
import { Movie } from '../models/movie.model';
import { Review, type ReviewDocument } from '../models/review.model';
import { paginate, type Paginated, type PaginationQuery } from '../schemas/common.schema';
import type { CreateReviewInput, UpdateReviewInput } from '../schemas/review.schema';
import { AppError } from '../utils/AppError';
import { ratingService } from './rating.service';

const AUTHOR_FIELDS = 'username';
const MOVIE_FIELDS = 'title releaseYear';

async function findOrThrow(id: string): Promise<ReviewDocument> {
  const review = await Review.findById(id);
  if (!review) throw AppError.notFound('Review');
  return review;
}

async function create(
  movieId: string,
  input: CreateReviewInput,
  user: AuthUser,
): Promise<ReviewDocument> {
  if (!(await Movie.exists({ _id: movieId }))) throw AppError.notFound('Movie');
  if (await Review.exists({ movie: movieId, user: user.id })) {
    throw AppError.conflict('You have already reviewed this movie — edit your existing review');
  }

  const review = await Review.create({ ...input, movie: movieId, user: user.id });
  await ratingService.recalculateMovieRating(movieId);
  return review.populate('user', AUTHOR_FIELDS);
}

async function getById(id: string): Promise<ReviewDocument> {
  const review = await findOrThrow(id);
  return review.populate('user', AUTHOR_FIELDS);
}

async function update(id: string, input: UpdateReviewInput, user: AuthUser) {
  const review = await findOrThrow(id);
  // Only the author may change what a review says; admins can only delete it.
  if (String(review.user) !== user.id)
    throw AppError.forbidden('Only the author can edit a review');

  review.set(input);
  await review.save();
  if (input.rating !== undefined) await ratingService.recalculateMovieRating(review.movie);
  return review.populate('user', AUTHOR_FIELDS);
}

async function remove(id: string, user: AuthUser): Promise<void> {
  const review = await findOrThrow(id);
  assertOwnerOrAdmin(user, review.user);
  await review.deleteOne();
  await ratingService.recalculateMovieRating(review.movie);
}

async function listByMovie(
  movieId: string,
  pagination: PaginationQuery,
): Promise<Paginated<ReviewDocument>> {
  if (!(await Movie.exists({ _id: movieId }))) throw AppError.notFound('Movie');
  const filter = { movie: movieId };
  const [items, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((pagination.page - 1) * pagination.limit)
      .limit(pagination.limit)
      .populate('user', AUTHOR_FIELDS),
    Review.countDocuments(filter),
  ]);
  return paginate(items, total, pagination);
}

async function listByUser(
  userId: string,
  pagination: PaginationQuery,
): Promise<Paginated<ReviewDocument>> {
  const filter = { user: userId };
  const [items, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((pagination.page - 1) * pagination.limit)
      .limit(pagination.limit)
      .populate('movie', MOVIE_FIELDS),
    Review.countDocuments(filter),
  ]);
  return paginate(items, total, pagination);
}

async function removeAllForMovie(movieId: string): Promise<void> {
  await Review.deleteMany({ movie: movieId });
}

export const reviewService = {
  create,
  getById,
  update,
  remove,
  listByMovie,
  listByUser,
  removeAllForMovie,
};
