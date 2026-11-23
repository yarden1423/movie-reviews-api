let counter = 0;

export function movieData(overrides: Record<string, unknown> = {}) {
  counter += 1;
  return {
    title: `Test Movie ${counter}`,
    releaseYear: 2010,
    genres: ['Drama'],
    director: 'Christopher Nolan',
    actors: ['Actor One', 'Actor Two'],
    description: 'A movie used in tests.',
    ...overrides,
  };
}
