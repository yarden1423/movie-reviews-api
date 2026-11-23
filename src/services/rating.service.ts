import { Types } from 'mongoose';
import { Movie } from '../models/movie.model';
import { Review } from '../models/review.model';
import { ratingStatsFromTotals, type RatingStats } from '../utils/rating';

/**
 * Recomputes averageRating / reviewsCount for a movie from its reviews
 * and stores them on the movie document (denormalized for fast reads/sorting).
 */
async function recalculateMovieRating(movieId: string | Types.ObjectId): Promise<RatingStats> {
  const [totals] = await Review.aggregate<{ sum: number; count: number }>([
    { $match: { movie: new Types.ObjectId(String(movieId)) } },
    { $group: { _id: null, sum: { $sum: '$rating' }, count: { $sum: 1 } } },
  ]);
  const stats = ratingStatsFromTotals(totals?.sum ?? 0, totals?.count ?? 0);
  await Movie.updateOne({ _id: movieId }, { $set: stats });
  return stats;
}

export const ratingService = { recalculateMovieRating };
