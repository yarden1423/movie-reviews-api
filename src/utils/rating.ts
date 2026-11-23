export interface RatingStats {
  averageRating: number;
  reviewsCount: number;
}

/** Ratings are shown with one decimal place, e.g. 7.3. */
export function roundRating(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function ratingStatsFromTotals(sum: number, count: number): RatingStats {
  if (count === 0) return { averageRating: 0, reviewsCount: 0 };
  return { averageRating: roundRating(sum / count), reviewsCount: count };
}

export function calculateRatingStats(ratings: number[]): RatingStats {
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  return ratingStatsFromTotals(sum, ratings.length);
}
