import type { AuthUser } from '../middlewares/auth';
import { Movie, TITLE_COLLATION } from '../models/movie.model';
import { Review } from '../models/review.model';
import { User } from '../models/user.model';
import { createMovieSchema, type CreateMovieInput } from '../schemas/movie.schema';
import { movieService } from '../services/movie.service';
import { reviewService } from '../services/review.service';
import { hashPassword } from '../utils/password';

/** Password shared by all demo users — for local demos only. */
export const DEMO_PASSWORD = 'Demo1234!';

export const DEMO_USERS = [
  { username: 'dana', email: 'dana@demo.dev' },
  { username: 'noam', email: 'noam@demo.dev' },
  { username: 'maya', email: 'maya@demo.dev' },
] as const;

type DemoMovie = CreateMovieInput & { addedBy: number; ratings: [number, number, string][] };

// ratings: [userIndex, rating 1-8, text]
export const DEMO_MOVIES: DemoMovie[] = [
  {
    title: 'Inception',
    releaseYear: 2010,
    genres: ['Action', 'Sci-Fi', 'Thriller'],
    director: 'Christopher Nolan',
    actors: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page'],
    description: 'A thief who steals secrets through dreams is given a chance to plant one.',
    addedBy: 0,
    ratings: [
      [0, 8, 'Every rewatch reveals something new.'],
      [1, 7, 'Brilliant concept, a bit exposition heavy.'],
      [2, 8, 'The hallway fight scene alone is worth it.'],
    ],
  },
  {
    title: 'The Matrix',
    releaseYear: 1999,
    genres: ['Action', 'Sci-Fi'],
    director: 'Lana Wachowski',
    actors: ['Keanu Reeves', 'Carrie-Anne Moss', 'Laurence Fishburne'],
    description: 'A hacker learns that his reality is a simulation.',
    addedBy: 1,
    ratings: [
      [0, 7, 'Still holds up.'],
      [1, 8, 'Changed action movies forever.'],
    ],
  },
  {
    title: 'Spirited Away',
    releaseYear: 2001,
    genres: ['Animation', 'Fantasy', 'Family'],
    director: 'Hayao Miyazaki',
    actors: ['Rumi Hiiragi', 'Miyu Irino'],
    description: 'A girl wanders into a world of spirits and must free her parents.',
    addedBy: 2,
    ratings: [
      [0, 8, 'Pure magic.'],
      [2, 8, 'Beautiful from the first frame to the last.'],
    ],
  },
  {
    title: 'Parasite',
    releaseYear: 2019,
    genres: ['Drama', 'Thriller'],
    director: 'Bong Joon-ho',
    actors: ['Song Kang-ho', 'Choi Woo-shik', 'Park So-dam'],
    description: 'A poor family schemes its way into a wealthy household.',
    addedBy: 0,
    ratings: [
      [1, 7, 'Sharp and surprising.'],
      [2, 6, 'Great, though the ending was a lot.'],
    ],
  },
  {
    title: 'The Grand Budapest Hotel',
    releaseYear: 2014,
    genres: ['Comedy', 'Crime'],
    director: 'Wes Anderson',
    actors: ['Ralph Fiennes', 'Tony Revolori'],
    description: 'The adventures of a legendary concierge and his lobby boy.',
    addedBy: 1,
    ratings: [[0, 6, 'Charming and very symmetrical.']],
  },
  {
    title: 'Get Out',
    releaseYear: 2017,
    genres: ['Horror', 'Mystery', 'Thriller'],
    director: 'Jordan Peele',
    actors: ['Daniel Kaluuya', 'Allison Williams'],
    description: 'A weekend visit to his girlfriend’s family turns sinister.',
    addedBy: 2,
    ratings: [
      [0, 7, 'Smart and genuinely unsettling.'],
      [1, 5, 'Good, not as scary as I hoped.'],
    ],
  },
  {
    title: 'La La Land',
    releaseYear: 2016,
    genres: ['Drama', 'Music', 'Romance'],
    director: 'Damien Chazelle',
    actors: ['Ryan Gosling', 'Emma Stone'],
    description: 'A musician and an actress chase their dreams in Los Angeles.',
    addedBy: 0,
    ratings: [
      [1, 4, 'Not really my thing.'],
      [2, 7, 'The ending broke my heart.'],
    ],
  },
  {
    title: 'Dune',
    releaseYear: 2021,
    genres: ['Adventure', 'Sci-Fi'],
    director: 'Denis Villeneuve',
    actors: ['Timothée Chalamet', 'Rebecca Ferguson', 'Zendaya'],
    description: 'A noble family becomes embroiled in a war for a desert planet.',
    addedBy: 1,
    ratings: [],
  },
];

export interface SeedSummary {
  users: number;
  movies: number;
  reviews: number;
}

/**
 * Loads demo users, movies and reviews through the regular services, so
 * rating stats are computed exactly like in production. Safe to run twice.
 */
export async function seedDemoData(): Promise<SeedSummary> {
  const summary: SeedSummary = { users: 0, movies: 0, reviews: 0 };
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const users: AuthUser[] = [];
  for (const demo of DEMO_USERS) {
    let user = await User.findOne({ email: demo.email });
    if (!user) {
      user = await User.create({ ...demo, passwordHash, role: 'user' });
      summary.users += 1;
    }
    users.push({ id: user.id, role: user.role, username: user.username });
  }

  for (const { addedBy, ratings, ...data } of DEMO_MOVIES) {
    const input = createMovieSchema.parse(data);
    let movie = await Movie.findOne({
      title: input.title,
      releaseYear: input.releaseYear,
    }).collation(TITLE_COLLATION);
    if (!movie) {
      movie = await movieService.create(input, users[addedBy]);
      summary.movies += 1;
    }

    for (const [userIndex, rating, text] of ratings) {
      const author = users[userIndex];
      if (await Review.exists({ movie: movie.id, user: author.id })) continue;
      await reviewService.create(movie.id, { rating, text }, author);
      summary.reviews += 1;
    }
  }

  return summary;
}
