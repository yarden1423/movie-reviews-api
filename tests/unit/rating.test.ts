import { calculateRatingStats, roundRating } from '../../src/utils/rating';

describe('rating utils', () => {
  describe('roundRating', () => {
    it.each([
      [7.25, 7.3],
      [7.24, 7.2],
      [8, 8],
      [5.555, 5.6],
    ])('rounds %d to one decimal place (%d)', (input, expected) => {
      expect(roundRating(input)).toBe(expected);
    });
  });

  describe('calculateRatingStats', () => {
    it('returns zeros when there are no ratings', () => {
      expect(calculateRatingStats([])).toEqual({ averageRating: 0, reviewsCount: 0 });
    });

    it('averages ratings on the 1-8 scale', () => {
      expect(calculateRatingStats([8, 6, 7])).toEqual({ averageRating: 7, reviewsCount: 3 });
    });

    it('rounds the average to one decimal', () => {
      expect(calculateRatingStats([8, 7, 7])).toEqual({ averageRating: 7.3, reviewsCount: 3 });
    });
  });
});
