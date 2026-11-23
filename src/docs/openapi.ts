import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z, type ZodTypeAny } from 'zod';
import { GENRES } from '../models/movie.model';
import { USER_ROLES } from '../models/user.model';
import { loginSchema, registerSchema } from '../schemas/auth.schema';
import { idParamsSchema, paginationQuerySchema } from '../schemas/common.schema';
import {
  createMovieSchema,
  listMoviesQuerySchema,
  topRatedQuerySchema,
  updateMovieSchema,
} from '../schemas/movie.schema';
import { createReviewSchema, updateReviewSchema } from '../schemas/review.schema';

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Paste the token returned by /api/auth/login',
});
const bearer = [{ bearerAuth: [] }];

// ---------- Response models ----------
const ErrorResponse = registry.register(
  'Error',
  z.object({
    error: z.object({
      code: z.string().openapi({ example: 'VALIDATION_ERROR' }),
      message: z.string().openapi({ example: 'Request validation failed' }),
      details: z
        .array(z.object({ field: z.string(), message: z.string() }))
        .optional()
        .openapi({
          example: [{ field: 'releaseYear', message: 'Release year must be 1888 or later' }],
        }),
    }),
  }),
);

const UserRef = z.object({ id: z.string(), username: z.string() });

const User = registry.register(
  'User',
  z.object({
    id: z.string(),
    username: z.string(),
    email: z.string().email(),
    role: z.enum(USER_ROLES),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
);

const AuthResponse = registry.register('AuthResponse', z.object({ user: User, token: z.string() }));

const Movie = registry.register(
  'Movie',
  z.object({
    id: z.string(),
    title: z.string().openapi({ example: 'Inception' }),
    releaseYear: z.number().int().openapi({ example: 2010 }),
    genres: z.array(z.enum(GENRES)).openapi({ example: ['Action', 'Sci-Fi'] }),
    director: z.string().optional().openapi({ example: 'Christopher Nolan' }),
    actors: z.array(z.string()).openapi({ example: ['Leonardo DiCaprio'] }),
    description: z.string().optional(),
    averageRating: z.number().openapi({ example: 7.3, description: 'Average of 1-8 ratings' }),
    reviewsCount: z.number().int().openapi({ example: 12 }),
    createdBy: UserRef.nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
);

const reviewBase = {
  id: z.string(),
  rating: z.number().int().min(1).max(8).openapi({ example: 7 }),
  text: z.string().openapi({ example: 'Mind-bending and beautifully shot.' }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
};

const Review = registry.register(
  'Review',
  z.object({ ...reviewBase, movie: z.string(), user: UserRef }),
);

const MyReview = registry.register(
  'MyReview',
  z.object({
    ...reviewBase,
    movie: z.object({ id: z.string(), title: z.string(), releaseYear: z.number() }),
    user: z.string(),
  }),
);

const paginated = (item: ZodTypeAny) =>
  z.object({
    items: z.array(item),
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  });

// ---------- Helpers ----------
const json = (schema: ZodTypeAny) => ({ content: { 'application/json': { schema } } });
const ok = (description: string, schema: ZodTypeAny) => ({ description, ...json(schema) });
const err = (description: string) => ({ description, ...json(ErrorResponse) });

const E400 = err('Validation error');
const E401 = err('Missing or invalid token');
const E403 = err('Not allowed (not the owner / not an admin)');
const E404 = err('Not found');
const E409 = err('Conflict (duplicate)');

// ---------- Auth ----------
registry.registerPath({
  method: 'post',
  path: '/api/auth/register',
  tags: ['Auth'],
  summary: 'Register a new user (role is always "user")',
  request: { body: json(registerSchema) },
  responses: { 201: ok('Registered', AuthResponse), 400: E400, 409: E409 },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/login',
  tags: ['Auth'],
  summary: 'Log in and receive a JWT',
  request: { body: json(loginSchema) },
  responses: {
    200: ok('Logged in', AuthResponse),
    400: E400,
    401: E401,
    429: err('Too many attempts'),
  },
});

// ---------- Users ----------
registry.registerPath({
  method: 'get',
  path: '/api/users/me',
  tags: ['Users'],
  summary: 'Current user profile',
  security: bearer,
  responses: { 200: ok('Current user', User), 401: E401 },
});

registry.registerPath({
  method: 'get',
  path: '/api/users/me/reviews',
  tags: ['Users'],
  summary: 'Reviews written by the current user',
  security: bearer,
  request: { query: paginationQuerySchema },
  responses: { 200: ok('My reviews', paginated(MyReview)), 401: E401 },
});

// ---------- Movies ----------
registry.registerPath({
  method: 'get',
  path: '/api/movies',
  tags: ['Movies'],
  summary: 'List / search movies',
  description:
    'Supports title search (`q`), filters (`genre`, `year`, `director`, `actor`, `minRating`), ' +
    'sorting (`sort`, prefix with `-` for descending) and pagination.',
  request: { query: listMoviesQuerySchema },
  responses: { 200: ok('Paginated movies', paginated(Movie)), 400: E400 },
});

registry.registerPath({
  method: 'get',
  path: '/api/movies/top',
  tags: ['Movies'],
  summary: 'Top rated movies',
  description:
    'Highest average rating first; ties broken by number of reviews. ' +
    'Only movies with at least `minReviews` reviews (and never unrated movies).',
  request: { query: topRatedQuerySchema },
  responses: { 200: ok('Top rated movies', z.array(Movie)), 400: E400 },
});

registry.registerPath({
  method: 'post',
  path: '/api/movies',
  tags: ['Movies'],
  summary: 'Create a movie',
  security: bearer,
  request: { body: json(createMovieSchema) },
  responses: { 201: ok('Created', Movie), 400: E400, 401: E401, 409: E409 },
});

registry.registerPath({
  method: 'get',
  path: '/api/movies/{id}',
  tags: ['Movies'],
  summary: 'Movie details with average rating and number of reviews',
  request: { params: idParamsSchema },
  responses: { 200: ok('Movie', Movie), 400: E400, 404: E404 },
});

registry.registerPath({
  method: 'patch',
  path: '/api/movies/{id}',
  tags: ['Movies'],
  summary: 'Update a movie (creator or admin)',
  security: bearer,
  request: { params: idParamsSchema, body: json(updateMovieSchema) },
  responses: {
    200: ok('Updated', Movie),
    400: E400,
    401: E401,
    403: E403,
    404: E404,
    409: E409,
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/movies/{id}',
  tags: ['Movies'],
  summary: 'Delete a movie and its reviews (creator or admin)',
  security: bearer,
  request: { params: idParamsSchema },
  responses: { 204: { description: 'Deleted' }, 401: E401, 403: E403, 404: E404 },
});

// ---------- Reviews ----------
registry.registerPath({
  method: 'get',
  path: '/api/movies/{id}/reviews',
  tags: ['Reviews'],
  summary: 'Reviews of a movie (newest first)',
  request: { params: idParamsSchema, query: paginationQuerySchema },
  responses: { 200: ok('Paginated reviews', paginated(Review)), 400: E400, 404: E404 },
});

registry.registerPath({
  method: 'post',
  path: '/api/movies/{id}/reviews',
  tags: ['Reviews'],
  summary: 'Review a movie (one review per user per movie)',
  security: bearer,
  request: { params: idParamsSchema, body: json(createReviewSchema) },
  responses: { 201: ok('Created', Review), 400: E400, 401: E401, 404: E404, 409: E409 },
});

registry.registerPath({
  method: 'get',
  path: '/api/reviews/{id}',
  tags: ['Reviews'],
  summary: 'Get a review',
  request: { params: idParamsSchema },
  responses: { 200: ok('Review', Review), 400: E400, 404: E404 },
});

registry.registerPath({
  method: 'patch',
  path: '/api/reviews/{id}',
  tags: ['Reviews'],
  summary: 'Edit a review (author only)',
  security: bearer,
  request: { params: idParamsSchema, body: json(updateReviewSchema) },
  responses: { 200: ok('Updated', Review), 400: E400, 401: E401, 403: E403, 404: E404 },
});

registry.registerPath({
  method: 'delete',
  path: '/api/reviews/{id}',
  tags: ['Reviews'],
  summary: 'Delete a review (author or admin)',
  security: bearer,
  request: { params: idParamsSchema },
  responses: { 204: { description: 'Deleted' }, 401: E401, 403: E403, 404: E404 },
});

export function buildOpenApiDocument() {
  return new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Movie Reviews API',
      version: '1.0.0',
      description:
        'REST API for managing movies and reviews. Ratings are integers from 1 to 8. ' +
        'Use **Authorize** with the token from `/api/auth/login` to call protected endpoints.',
    },
    servers: [{ url: '/' }],
    tags: [
      { name: 'Auth', description: 'Registration and login' },
      { name: 'Users', description: 'Current user' },
      { name: 'Movies', description: 'Movie management, search and ratings' },
      { name: 'Reviews', description: 'Movie reviews' },
    ],
  });
}
