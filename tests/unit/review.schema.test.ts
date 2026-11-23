import { createReviewSchema, updateReviewSchema } from '../../src/schemas/review.schema';

describe('review schemas', () => {
  it('accepts an integer rating between 1 and 8 with text', () => {
    expect(createReviewSchema.safeParse({ rating: 8, text: 'Great' }).success).toBe(true);
    expect(createReviewSchema.safeParse({ rating: 1, text: 'Bad' }).success).toBe(true);
  });

  it.each([
    ['rating 0', { rating: 0, text: 'x' }],
    ['rating 9', { rating: 9, text: 'x' }],
    ['a fractional rating', { rating: 6.5, text: 'x' }],
    ['missing text', { rating: 5 }],
    ['blank text', { rating: 5, text: '   ' }],
    ['text over 2000 characters', { rating: 5, text: 'a'.repeat(2001) }],
  ])('rejects %s', (_label, input) => {
    expect(createReviewSchema.safeParse(input).success).toBe(false);
  });

  it('allows partial updates but not empty ones', () => {
    expect(updateReviewSchema.safeParse({ rating: 3 }).success).toBe(true);
    expect(updateReviewSchema.safeParse({}).success).toBe(false);
  });
});
