import { topRatedQuerySchema } from '../../src/schemas/movie.schema';

describe('topRatedQuerySchema', () => {
  it('defaults to 10 movies with at least 1 review', () => {
    expect(topRatedQuerySchema.parse({})).toEqual({ limit: 10, minReviews: 1 });
  });

  it('coerces query strings and accepts a genre', () => {
    expect(topRatedQuerySchema.parse({ limit: '5', minReviews: '3', genre: 'Drama' })).toEqual({
      limit: 5,
      minReviews: 3,
      genre: 'Drama',
    });
  });

  it.each([
    ['limit over 50', { limit: '51' }],
    ['limit 0', { limit: '0' }],
    ['negative minReviews', { minReviews: '-1' }],
    ['unknown genre', { genre: 'Cooking' }],
  ])('rejects %s', (_label, query) => {
    expect(topRatedQuerySchema.safeParse(query).success).toBe(false);
  });
});
